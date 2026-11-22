import { readJsonFile, downloadJsonText } from "../js/local-files.js";
const byId = id => document.getElementById(id);
let selectedFile = null;
function status(id, message, kind = "") {
  const element = byId(id);
  element.textContent = message;
  element.className = ("status " + kind).trim();
}
byId("json-file").addEventListener("change", event => {
  selectedFile = event.target.files?.[0] ?? null;
  byId("read-json").disabled = !selectedFile;
  byId("read-preview").textContent = "请执行读取并校验。";
  status("read-status", selectedFile ? "已选择：" + selectedFile.name + "（" + selectedFile.size + " bytes）。" : "尚未选择文件。");
});
byId("read-json").addEventListener("click", async () => {
  try {
    if (!selectedFile) throw new Error("请先选择 JSON 文件");
    const result = await readJsonFile(selectedFile);
    const summary = {
      fileName: result.fileName, byteLength: result.byteLength,
      rootType: Array.isArray(result.value) ? "array" : result.value === null ? "null" : typeof result.value,
      objectKeys: result.value && typeof result.value === "object" && !Array.isArray(result.value) ? Object.keys(result.value).slice(0, 30) : undefined,
      preview: result.value
    };
    byId("read-preview").textContent = JSON.stringify(summary, null, 2);
    status("read-status", "UTF-8 与 JSON 语法校验通过。内容仅作为数据展示，不会执行。", "success");
  } catch (error) {
    byId("read-preview").textContent = JSON.stringify({ error: error.message }, null, 2);
    status("read-status", error.message, "error");
  }
});
byId("download-sample").addEventListener("click", () => {
  try {
    const sample = { format: "testnisa-local-file-demo", version: 1, exportedAt: new Date().toISOString(),
      note: "This is a local browser download demonstration.", records: [{ id: "demo-1", label: "sample only" }] };
    const result = downloadJsonText(JSON.stringify(sample, null, 2), "testnisa-local-file-sample.json");
    status("download-status", "下载已触发：" + result.fileName + "（" + result.byteLength + " bytes）。", "success");
  } catch (error) { status("download-status", error.message, "error"); }
});
