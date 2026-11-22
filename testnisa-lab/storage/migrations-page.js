import { openLabDatabase, getDatabaseSchemaInfo, LAB_STORES } from "../js/indexeddb.js";
const status = document.getElementById("migration-status");
const output = document.getElementById("migration-output");
let db = null;
function showStatus(message, kind = "") {
  status.textContent = message;
  status.className = ("status " + kind).trim();
}
async function refresh() {
  if (!db) throw new Error("数据库尚未初始化");
  const info = await getDatabaseSchemaInfo(db);
  const stores = Array.from(db.objectStoreNames);
  output.textContent = JSON.stringify({
    database: db.name,
    databaseVersion: info.databaseVersion,
    schemaMetadata: info.schema,
    migrationHistory: info.migrations,
    objectStores: stores,
    recordsIndexes: ["by_type", "by_updated_at", "by_name"],
    metadataStore: LAB_STORES.meta
  }, null, 2);
  showStatus("数据库已连接，迁移元数据读取成功。", "success");
}
async function initialize() {
  try {
    db = await openLabDatabase(undefined, () => showStatus("升级被其他标签页阻塞，请关闭其他实验页面后重试。", "pending"));
    await refresh();
  } catch (error) {
    showStatus(error.message || "数据库迁移失败。", "error");
    output.textContent = JSON.stringify({ error: error.message, database: "testnisa-technical-lab" }, null, 2);
  }
}
document.getElementById("refresh-migrations").addEventListener("click", async () => {
  try { await refresh(); } catch (error) { showStatus(error.message, "error"); }
});
window.addEventListener("pagehide", () => db?.close());
initialize();
