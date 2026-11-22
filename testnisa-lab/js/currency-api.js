const API_ROOT = "https://api.frankfurter.dev/v2";
const CURRENCY_CODE = /^[A-Z]{3}$/;

function numberTokenToPlainDecimal(token) {
  if (typeof token !== "string") throw new TypeError("rate must be a JSON decimal number");
  const match = /^([+]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
  if (!match) throw new TypeError("rate cannot be represented as a decimal");
  const [, sign, whole, fraction = "", exponentText = "0"] = match;
  const exponent = Number(exponentText);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 30) {
    throw new RangeError("rate exponent exceeds supported precision");
  }
  const digits = whole + fraction;
  const decimalPosition = whole.length + exponent;
  if (decimalPosition <= 0) return sign + "0." + "0".repeat(-decimalPosition) + digits;
  if (decimalPosition >= digits.length) return sign + digits + "0".repeat(decimalPosition - digits.length);
  return sign + digits.slice(0, decimalPosition) + "." + digits.slice(decimalPosition);
}

export async function fetchReferenceRate(base, quote, options = {}) {
  const normalizedBase = String(base).toUpperCase();
  const normalizedQuote = String(quote).toUpperCase();
  if (!CURRENCY_CODE.test(normalizedBase) || !CURRENCY_CODE.test(normalizedQuote)) {
    throw new TypeError("Currency codes must be three uppercase letters.");
  }
  if (options.date && !/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new TypeError("date must use YYYY-MM-DD.");
  }
  if (normalizedBase === normalizedQuote) {
    return { date: null, base: normalizedBase, quote: normalizedQuote, rate: "1", source: "identity" };
  }
  const timeoutMs = options.timeoutMs ?? 10000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    throw new RangeError("timeoutMs must be between 1000 and 30000.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const externalSignal = options.signal;
  const abortFromExternal = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", abortFromExternal, { once: true });
  }
  const url = new URL(API_ROOT + "/rate/" + normalizedBase.toLowerCase() + "/" + normalizedQuote.toLowerCase());
  if (options.date) url.searchParams.set("date", options.date);
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: "GET", headers: { Accept: "application/json" }, signal: controller.signal, cache: "no-store"
    });
    const responseText = await response.text();
    if (responseText.length > 16384) throw new Error("API response exceeds the 16 KB safety limit.");
    let body = null;
    try { body = JSON.parse(responseText); } catch { body = null; }
    if (!response.ok) {
      const error = new Error(body && typeof body.message === "string" ? body.message : "HTTP " + response.status);
      error.status = response.status;
      throw error;
    }
    if (!body || typeof body !== "object" || typeof body.rate !== "number" || !Number.isFinite(body.rate) || body.rate <= 0 ||
        typeof body.base !== "string" || typeof body.quote !== "string" || typeof body.date !== "string") {
      throw new Error("The API response did not match the expected rate schema.");
    }
    const rateToken = (/"rate"\s*:\s*(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(responseText) || [])[1];
    return {
      date: body.date, base: body.base.toUpperCase(), quote: body.quote.toUpperCase(),
      rate: numberTokenToPlainDecimal(rateToken), source: "Frankfurter API v2"
    };
  } catch (error) {
    if (controller.signal.aborted) {
      const aborted = new Error(externalSignal?.aborted ? "Request cancelled." : "Request timed out.");
      aborted.name = externalSignal?.aborted ? "AbortError" : "TimeoutError";
      throw aborted;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    if (externalSignal) externalSignal.removeEventListener("abort", abortFromExternal);
  }
}
