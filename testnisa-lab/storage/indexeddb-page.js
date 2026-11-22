import { openLabDatabase, createLabStorage } from "../js/indexeddb.js";

const byId = id => document.getElementById(id);
const dbStatus = byId("db-status");
const operationStatus = byId("operation-status");
const output = byId("output");
let storage = null;
let db = null;

function showStatus(element, message, kind = "") {
  element.textContent = message;
  element.className = `status ${kind}`.trim();
}
function showOutput(value) {
  output.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}
function showError(error) {
  showStatus(operationStatus, error instanceof Error ? error.message : "操作失败", "error");
  showOutput({ error: error instanceof Error ? error.message : String(error) });
}
async function runAction(action) {
  try {
    const result = await action();
    showStatus(operationStatus, "操作成功。", "success");
    showOutput(result ?? "完成");
  } catch (error) {
    showError(error);
  }
}
function currentRecord() {
  return {
    id: byId("record-id").value.trim(),
    type: byId("record-type").value,
    name: byId("record-name").value,
    notes: byId("record-notes").value
  };
}
function setBusy(busy) {
  document.querySelectorAll("button, input, select").forEach(control => { control.disabled = busy; });
}

async function initialize() {
  setBusy(true);
  try {
    db = await openLabDatabase(undefined, () => showStatus(dbStatus, "数据库升级被其他标签页阻塞，请关闭其他实验标签页后重试。", "pending"));
    storage = createLabStorage(db);
    showStatus(dbStatus, `已连接：${db.name}（版本 ${db.version}）。`, "success");
    await refreshRecords();
  } catch (error) {
    showStatus(dbStatus, error.message, "error");
    showOutput({ error: error.message, hint: "请使用支持 IndexedDB 的现代浏览器，并检查隐私/无痕模式限制。" });
  } finally {
    setBusy(false);
  }
}
async function refreshRecords() {
  if (!storage) throw new Error("数据库尚未初始化");
  showOutput(await storage.getAllRecords());
}

byId("record-form").addEventListener("submit", event => {
  event.preventDefault();
  runAction(async () => {
    const record = await storage.putRecord(currentRecord());
    return { saved: record, records: await storage.getAllRecords() };
  });
});
byId("read-record").addEventListener("click", () => runAction(async () => {
  const record = await storage.getRecord(byId("record-id").value.trim());
  return record ?? { message: "未找到该 ID" };
}));
byId("delete-record").addEventListener("click", () => runAction(async () => {
  const id = byId("record-id").value.trim();
  await storage.deleteRecord(id);
  return { deletedId: id, records: await storage.getAllRecords() };
}));
byId("list-records").addEventListener("click", () => runAction(() => storage.getAllRecords()));
byId("refresh-records").addEventListener("click", () => runAction(refreshRecords));
byId("clear-records").addEventListener("click", () => {
  if (!window.confirm("确定清空本实验数据库中的所有 records 记录？此操作不可撤销。")) return;
  runAction(async () => {
    await storage.clearRecords();
    return { cleared: true, records: await storage.getAllRecords() };
  });
});
byId("transaction-success").addEventListener("click", () => runAction(async () => {
  const stamp = Date.now();
  const records = await storage.atomicPutRecords([
    { id: `tx-${stamp}-a`, type: "note", name: "事务记录 A" },
    { id: `tx-${stamp}-b`, type: "note", name: "事务记录 B" }
  ]);
  return { committed: records.length, records: await storage.getAllRecords("note") };
}));
byId("transaction-abort").addEventListener("click", () => runAction(async () => {
  const stamp = Date.now();
  const firstId = `rollback-${stamp}-first`;
  const conflictId = `rollback-${stamp}-conflict`;
  await storage.putRecord({ id: conflictId, type: "note", name: "预先存在的冲突记录" });
  try {
    await storage.atomicCreateRecords([
      { id: firstId, type: "note", name: "应随事务一起回滚的记录" },
      { id: conflictId, type: "note", name: "重复主键，触发真实 IndexedDB ConstraintError" }
    ]);
  } catch (error) {
    const firstRecord = await storage.getRecord(firstId);
    return {
      expectedTransactionError: error.name || error.message,
      firstRecordPersisted: Boolean(firstRecord),
      rollbackVerified: firstRecord === undefined,
      explanation: "第二次 add 因重复主键失败；同一 readwrite transaction 应整体 abort，第一条记录不应留下。"
    };
  }
  throw new Error("预期的主键冲突没有发生");
}));
byId("save-setting").addEventListener("click", () => runAction(() => storage.putSetting(byId("setting-key").value, byId("setting-value").value)));
byId("read-setting").addEventListener("click", () => runAction(async () => {
  const setting = await storage.getSetting(byId("setting-key").value.trim());
  return setting ?? { message: "未找到该设置" };
}));
window.addEventListener("pagehide", () => db?.close());
initialize();
