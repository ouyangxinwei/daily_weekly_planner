const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export class RequestPolicyError extends Error {
  constructor(message, { name = "RequestError", category = "network", status = null, attempts = 1, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = name;
    this.category = category;
    this.status = status;
    this.attempts = attempts;
  }
}

function parseRetryAfter(value, now = Date.now()) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

function abortError(message = "Request cancelled.") {
  return new RequestPolicyError(message, { name: "AbortError", category: "cancelled" });
}

function createLimiter(maxConcurrent) {
  let active = 0;
  const queue = [];
  function drain() {
    while (active < maxConcurrent && queue.length) {
      const item = queue.shift();
      if (item.signal?.aborted) {
        item.cleanup();
        item.reject(abortError());
        continue;
      }
      active += 1;
      item.cleanup();
      let released = false;
      item.resolve(() => {
        if (released) return;
        released = true;
        active -= 1;
        drain();
      });
    }
  }
  return {
    acquire(signal) {
      if (signal?.aborted) return Promise.reject(abortError());
      return new Promise((resolve, reject) => {
        const item = {
          signal, resolve, reject,
          cleanup() { signal?.removeEventListener("abort", onAbort); }
        };
        const onAbort = () => {
          const index = queue.indexOf(item);
          if (index >= 0) queue.splice(index, 1);
          item.cleanup();
          reject(abortError());
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        queue.push(item);
        drain();
      });
    }
  };
}

function delay(ms, signal, sleepImpl) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    let timer;
    const finish = (error) => {
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve();
    };
    const onAbort = () => finish(abortError());
    signal?.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(sleepImpl(ms)).then(() => finish(), finish);
  });
}

export function createRequestClient({
  fetchImpl = globalThis.fetch,
  maxConcurrent = 4,
  timeoutMs = 10000,
  retries = 2,
  baseDelayMs = 300,
  maxDelayMs = 4000,
  sleepImpl = (ms) => new Promise(resolve => setTimeout(resolve, ms))
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 32) throw new RangeError("maxConcurrent must be 1..32");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new RangeError("timeoutMs must be 1..120000");
  if (!Number.isInteger(retries) || retries < 0 || retries > 5) throw new RangeError("retries must be 0..5");
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0 || !Number.isFinite(maxDelayMs) || maxDelayMs < baseDelayMs) throw new RangeError("Invalid retry delay settings");

  const limiter = createLimiter(maxConcurrent);

  async function request(input, init = {}, policy = {}) {
    const method = String(init.method || "GET").toUpperCase();
    const retryCount = policy.retries ?? retries;
    if (!Number.isInteger(retryCount) || retryCount < 0 || retryCount > 5) throw new RangeError("retries must be 0..5");
    const maxAttempts = IDEMPOTENT_METHODS.has(method) || policy.retryUnsafe === true ? retryCount + 1 : 1;
    const requestTimeout = policy.timeoutMs ?? timeoutMs;
    if (!Number.isInteger(requestTimeout) || requestTimeout < 1 || requestTimeout > 120000) throw new RangeError("timeoutMs must be 1..120000");
    const externalSignal = init.signal ?? policy.signal;
    const headers = new Headers(init.headers || {});
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (externalSignal?.aborted) throw abortError();
      const release = await limiter.acquire(externalSignal);
      if (externalSignal?.aborted) {
        release();
        throw abortError();
      }
      const controller = new AbortController();
      let timedOut = false;
      let abortListener;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, requestTimeout);
      if (externalSignal) {
        abortListener = () => controller.abort();
        externalSignal.addEventListener("abort", abortListener, { once: true });
      }

      try {
        const response = await fetchImpl(input, { ...init, method, headers, signal: controller.signal });
        if (RETRYABLE_STATUS.has(response.status) && attempt < maxAttempts) {
          const retryAfter = parseRetryAfter(response.headers?.get?.("Retry-After"));
          const backoff = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
          lastError = new RequestPolicyError("HTTP " + response.status + "，准备重试", {
            category: response.status === 429 ? "rate-limit" : "server",
            status: response.status, attempts: attempt
          });
          release();
          clearTimeout(timeout);
          if (externalSignal && abortListener) externalSignal.removeEventListener("abort", abortListener);
          await delay(Math.min(maxDelayMs, retryAfter ?? backoff), externalSignal, sleepImpl);
          continue;
        }
        if (RETRYABLE_STATUS.has(response.status)) {
          throw new RequestPolicyError("HTTP " + response.status + "，已达到重试上限", {
            category: response.status === 429 ? "rate-limit" : "server",
            status: response.status, attempts: attempt
          });
        }
        return response;
      } catch (error) {
        if (error instanceof RequestPolicyError) throw error;
        if (externalSignal?.aborted) throw abortError();
        if (timedOut) {
          lastError = new RequestPolicyError("Request timed out after " + requestTimeout + " ms", {
            name: "TimeoutError", category: "timeout", attempts: attempt, cause: error
          });
        } else {
          lastError = new RequestPolicyError(error?.message || "Network request failed", {
            category: "network", attempts: attempt, cause: error
          });
        }
        const retryable = !timedOut && (IDEMPOTENT_METHODS.has(method) || policy.retryUnsafe === true);
        if (!retryable || attempt >= maxAttempts) throw lastError;
      } finally {
        clearTimeout(timeout);
        if (externalSignal && abortListener) externalSignal.removeEventListener("abort", abortListener);
        release();
      }

      const backoff = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
      await delay(backoff, externalSignal, sleepImpl);
    }
    throw lastError;
  }

  return Object.freeze({ request });
}

const defaultClient = createRequestClient();
export function requestFetch(input, init = {}, policy = {}) {
  return defaultClient.request(input, init, policy);
}
export { parseRetryAfter };
