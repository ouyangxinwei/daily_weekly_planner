import { convertDecimalAmount, formatScaledInteger } from "../js/money.js";

const form = document.querySelector("#calc-form");
const amountInput = document.querySelector("#amount");
const rateInput = document.querySelector("#rate");
const targetInput = document.querySelector("#target");
const statusBox = document.querySelector("#status");
const resultBox = document.querySelector("#result");

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
form.addEventListener("submit", (event) => {
  event.preventDefault();
  resultBox.replaceChildren();
  try {
    const target = targetInput.value;
    const scale = target === "JPY" ? 0 : 2;
    const converted = convertDecimalAmount(amountInput.value.trim(), rateInput.value.trim(), scale);
    metric("精确十进制结果", converted.decimal);
    metric("最小货币单位（BigInt）", converted.minorUnits.toString());
    metric("显示结果", formatScaledInteger(converted.minorUnits, scale) + " " + target);
    statusBox.className = "status success";
    statusBox.textContent = "计算成功。结果由十进制字符串和 BigInt 定点运算得出。";
  } catch (error) {
    statusBox.className = "status error";
    statusBox.textContent = "输入无效或超出支持范围：" + error.message;
  }
});
document.querySelector("#example").addEventListener("click", () => {
  amountInput.value = "1";
  rateInput.value = "0.005";
  targetInput.value = "USD";
  form.requestSubmit();
});
