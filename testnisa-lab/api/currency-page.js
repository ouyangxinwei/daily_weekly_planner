import { fetchReferenceRate } from "../js/currency-api.js";
import { convertDecimalAmount, formatScaledInteger } from "../js/money.js";

const form = document.querySelector("#rate-form");
const submit = document.querySelector("#submit");
const cancel = document.querySelector("#cancel");
const statusBox = document.querySelector("#status");
const resultBox = document.querySelector("#result");
const rawBox = document.querySelector("#raw");
let activeController = null;

function setStatus(message, kind = "") {
  statusBox.textContent = message;
  statusBox.className = "status" + (kind ? " " + kind : "");
}
function metric(label, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "metric";
  const title = document.createElement("div");
  title.className = "label";
  title.textContent = label;
  const output = document.createElement("div");
  output.className = "value";
  output.textContent = value;
  wrapper.append(title, output);
  resultBox.append(wrapper);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (activeController) activeController.abort();
  activeController = new AbortController();
  const started = performance.now();
  const data = new FormData(form);
  const base = String(data.get("base"));
  const quote = String(data.get("quote"));
  const amount = String(data.get("amount")).trim();
  const date = String(data.get("date") || "");
  const outputScale = quote === "JPY" ? 0 : 2;
  submit.disabled = true;
  cancel.disabled = false;
  resultBox.replaceChildren();
  rawBox.textContent = "请求中…";
  setStatus("正在请求 Frankfurter API v2…", "pending");
  try {
    const rate = await fetchReferenceRate(base, quote, { date: date || undefined, signal: activeController.signal });
    const converted = convertDecimalAmount(amount, rate.rate, outputScale);
    const elapsed = Math.round(performance.now() - started);
    metric("API 汇率日期", rate.date || "同币种，无需请求");
    metric("参考汇率", "1 " + base + " = " + rate.rate + " " + quote);
    metric("换算结果", formatScaledInteger(converted.minorUnits, outputScale) + " " + quote);
    metric("请求耗时", elapsed + " ms");
    metric("数据来源", rate.source);
    setStatus("成功：浏览器请求与响应结构验证通过。请记录当前浏览器、Origin 和测试时间；本次结果仅代表当前环境。", "success");
    rawBox.textContent = JSON.stringify({ ...rate, requestedAmount: amount, convertedAmount: converted.decimal, elapsedMs: elapsed }, null, 2);
  } catch (error) {
    const elapsed = Math.round(performance.now() - started);
    setStatus("失败：" + error.message + "\n耗时：" + elapsed + " ms\n请检查网络、CORS、HTTP 状态和浏览器控制台。", "error");
    rawBox.textContent = JSON.stringify({ name: error.name, message: error.message, status: error.status ?? null, elapsedMs: elapsed }, null, 2);
  } finally {
    submit.disabled = false;
    cancel.disabled = true;
    activeController = null;
  }
});
cancel.addEventListener("click", () => activeController?.abort());
