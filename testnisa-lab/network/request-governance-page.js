import { createRequestClient } from "../js/request.js";

const scenario = document.querySelector("#scenario");
const timeoutInput = document.querySelector("#timeout");
const runButton = document.querySelector("#run");
const cancelButton = document.querySelector("#cancel");
const clearButton = document.querySelector("#clear");
const statusBox = document.querySelector("#status");
const metrics = document.querySelector("#metrics");
const logBox = document.querySelector("#log");
let controller = null;

function status(message, kind = "") {
  statusBox.textContent = message;
  statusBox.className = "status" + (kind ? " " + kind : "");
}
function log(message) {
  logBox.textContent += (logBox.textContent ? "\n" : "") + message;
}
function metric(label, value) {
  const card = document.createElement("div");
  card.className = "metric";
  const heading = document.createElement("div");
  heading.className = "label";
  heading.textContent = label;
  const output = document.createElement("div");
  output.className = "value";
  output.textContent = String(value);
  card.append(heading, output);
  metrics.append(card);
}

runButton.addEventListener("click", async () => {
  controller?.abort();
  controller = new AbortController();
  const activeController = controller;
  const selected = scenario.value;
  const timeoutMs = Number(timeoutInput.value);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 10000) {
    status("超时必须在 100 到 10000 毫秒之间。", "error");
    return;
  }
  runButton.disabled = true;
  cancelButton.disabled = false;
  metrics.replaceChildren();
  logBox.textContent = "";
  status("正在执行模拟…", "pending");
  let calls = 0;
  const mockFetch = async (_url, init) => {
    calls += 1;
    const n = calls;
    log("请求 #" + n + " 已发出");
    if (selected === "timeout") {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(new Response("{}", { status: 200 })), timeoutMs * 3);
        init.signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
      });
    }
    if (selected === "network" && n === 1) throw new TypeError("模拟网络断开");
    if (selected === "429" && n === 1) return new Response("{}", { status: 429, headers: { "Retry-After": "1" } });
    if (selected === "503" && n <= 2) return new Response("{}", { status: 503 });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, selected === "parallel" ? 250 : 100);
      init.signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const client = createRequestClient({
    fetchImpl: mockFetch, maxConcurrent: 2, timeoutMs, retries: 2,
    baseDelayMs: 150, maxDelayMs: 1000
  });
  const started = performance.now();
  try {
    const requests = selected === "parallel"
      ? Array.from({ length: 8 }, (_, i) => client.request("/mock/" + i, { signal: activeController.signal }))
      : [client.request("/mock", { signal: activeController.signal })];
    const results = await Promise.all(requests);
    const elapsed = Math.round(performance.now() - started);
    metric("完成请求", results.length);
    metric("底层尝试次数", calls);
    metric("总耗时", elapsed + " ms");
    metric("并发上限", 2);
    status("模拟完成。重试和并发控制按预期执行。", "success");
    log("全部请求完成；HTTP 状态：" + results.map(x => x.status).join(", "));
  } catch (error) {
    metric("底层尝试次数", calls);
    metric("错误类别", error.category || error.name);
    metric("HTTP 状态", error.status ?? "—");
    metric("尝试次数", error.attempts ?? "—");
    status("模拟结束：" + error.message, "error");
    log("错误分类：" + (error.category || error.name));
  } finally {
    if (controller === activeController) controller = null;
    runButton.disabled = false;
    cancelButton.disabled = true;
  }
});
cancelButton.addEventListener("click", () => controller?.abort());
clearButton.addEventListener("click", () => {
  controller?.abort();
  metrics.replaceChildren();
  logBox.textContent = "暂无日志";
  status("已清除模拟结果。");
});
