import { openLabDatabase, createLabStorage, getDatabaseSchemaInfo } from "../js/indexeddb.js";
import { createBackupText, parseBackupText, previewBackup, restoreBackup, BACKUP_MAX_BYTES } from "../js/backup.js";
import { readJsonFile, downloadJsonText } from "../js/local-files.js";

const byId = id => document.getElementById(id);
let db;
let storage;
let pendingBackup = null;
let selectedFile = null;

function status(id, message, kind = "") {
  const element = byId(id);
  element.textContent = message;
  element.className = `status ${kind}`.trim();
}
function output(id, value) {
  byId(id).textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
function setRestoreEnabled(enabled) {
  byId("restore-backup").disabled = !enabled;
}
async function refreshCounts() {
  if (!storage || !db) return;
  const [records, settings, schemaInfo] = await Promise.all([
    storage.getAllRecords(), storage.getAllSettings(), getDatabaseSchemaInfo(db)
  ]);
  output("database-counts", {
    databaseSchemaVersion: schemaInfo.databaseVersion,
    schemaMetadata: schemaInfo.schema,
    migrations: schemaInfo.migrations,
    recordCount: records.length,
    settingCount: settings.length
  });
}
async function initialize() {
  try {
    db = await openLabDatabase();
    storage = createLabStorage(db);
    await refreshCounts();
  } catch (error) {
    status("import-status", error.message, "error");
    status("export-status", "数据库不可用，无法导出。", "error");
  }
}
byId("export-backup").addEventListener("click", async () => {
  try {
    if (!storage) throw new Error("IndexedDB 尚未就绪");
    const [records, settings] = await Promise.all([storage.getAllRecords(), storage.getAllSettings()]);
    const text = createBackupText({ records, settings });
    const download = downloadJsonText(text, `testnisa-lab-backup-${new Date().toISOString().replaceAll(":", "-")}.json`);
    status("export-status", `导出成功：备份格式 v${JSON.parse(text).version}；数据库 schema v${db.version}；${records.length} 条记录、${settings.length} 项设置（${download.fileName}）。`, "success");
  } catch (error) {
    status("export-status", error.message, "error");
  }
});
byId("backup-file").addEventListener("change", event => {
  selectedFile = event.target.files?.[0] ?? null;
  pendingBackup = null;
  setRestoreEnabled(false);
  byId("preview-backup").disabled = !selectedFile;
  output("preview-output", "请先执行“校验并预览”。");
  status("import-status", selectedFile ? `已选择：${selectedFile.name}（${selectedFile.size} bytes）。` : "尚未选择文件。", "");
});
byId("preview-backup").addEventListener("click", async () => {
  try {
    if (!db || !selectedFile) throw new Error("请先等待数据库就绪并选择 JSON 备份文件");
    const fileData = await readJsonFile(selectedFile, { maxBytes: BACKUP_MAX_BYTES });
    pendingBackup = parseBackupText(fileData.text);
    const preview = {
      ...previewBackup(pendingBackup),
      databaseSchemaVersion: db.version,
      versioningNote: "备份格式版本与 IndexedDB schema 版本独立；本次使用 v1 备份适配器，恢复写入当前 records/settings 仓库。"
    };
    output("preview-output", preview);
    setRestoreEnabled(true);
    status("import-status", `备份格式 v${pendingBackup.version} 校验通过；当前数据库 schema v${db.version}。请检查预览后再决定是否恢复。`, "success");
  } catch (error) {
    pendingBackup = null;
    setRestoreEnabled(false);
    output("preview-output", { validationError: error.message });
    status("import-status", error.message, "error");
  }
});
byId("restore-backup").addEventListener("click", async () => {
  if (!pendingBackup || !db) return;
  const preview = previewBackup(pendingBackup);
  const confirmed = window.confirm(
    `确认整体替换当前实验数据？\n备份格式版本：${pendingBackup.version}\n当前数据库 schema：${db.version}\n备份记录：${preview.recordCount}\n备份设置：${preview.settingCount}\n当前数据将被替换。此操作不可撤销。`
  );
  if (!confirmed) return;
  try {
    const result = await restoreBackup(db, pendingBackup);
    pendingBackup = null;
    setRestoreEnabled(false);
    status("import-status", "恢复事务已成功提交。", "success");
    output("preview-output", result);
    await refreshCounts();
  } catch (error) {
    status("import-status", `恢复失败，IndexedDB 写入事务未成功提交；事务中止时原有数据由数据库原子性保护。请刷新数量核对。原因：${error.message}`, "error");
    await refreshCounts();
  }
});
byId("refresh-counts").addEventListener("click", async () => {
  try { await refreshCounts(); status("import-status", "数据库数量已刷新。", "success"); }
  catch (error) { status("import-status", error.message, "error"); }
});
window.addEventListener("pagehide", () => db?.close());
initialize();
