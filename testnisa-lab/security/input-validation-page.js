import { validateText, validateNumber, validateSafeUrl, renderText } from "../js/security.js";
const byId = id => document.getElementById(id);
const report = (id, message, kind = "") => {
  const node = byId(id);
  node.textContent = message;
  node.className = `status ${kind}`.trim();
};

byId("validate-text").addEventListener("click", () => {
  try {
    const value = validateText(byId("text-input").value, { required: true, maxLength: 80 });
    renderText(byId("text-output"), value);
    report("text-status", `校验通过：${Array.from(value).length} 个字符。使用 textContent 安全输出。`, "success");
  } catch (error) { report("text-status", error.message, "error"); }
});

byId("show-attack-sample").addEventListener("click", () => {
  const sample = '<img src=x onerror=alert(1)> <script>alert("xss")</script>';
  renderText(byId("text-output"), sample);
  report("text-status", "攻击样例已作为纯文本显示；没有创建图片或执行脚本。", "success");
});

byId("validate-number").addEventListener("click", () => {
  try {
    const value = validateNumber(byId("number-input").value, { min: 0, max: 100, maxDecimals: 2 });
    report("number-status", `校验通过：${value}`, "success");
  } catch (error) { report("number-status", error.message, "error"); }
});

byId("validate-url").addEventListener("click", () => {
  const output = byId("url-output");
  output.replaceChildren();
  try {
    const href = validateSafeUrl(byId("url-input").value);
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = href;
    output.append(link);
    report("url-status", "URL 校验通过：HTTPS 协议，且不包含凭据。", "success");
  } catch (error) { report("url-status", error.message, "error"); }
});
