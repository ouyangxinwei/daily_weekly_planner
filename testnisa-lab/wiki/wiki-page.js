import { openWikiDatabase, createWikiRepository, createWikiEntry, searchWikiEntries } from "../js/wiki.js";
import { buildWikiLinkGraph, renderMarkdown } from "../js/wiki-markdown.js";
import { parseWikiImportText, findWikiImportDuplicates } from "../js/wiki-import.js";
import { createWikiBackupText, parseWikiBackupText, planWikiBackupImport, applyWikiBackupImport } from "../js/wiki-backup.js";

const $ = selector => document.querySelector(selector);
const form = $("#wiki-form");
const statusBox = $("#wiki-status");
const listBox = $("#wiki-list");
const detailBox = $("#wiki-detail");
const stateLabels = { draft: "待确认", verified: "已核实", needs_update: "需要更新", disputed: "存在争议" };
let repository;
let wikiDatabase;
let entries = [];
let selectedId = null;

function setStatus(message, kind = "") {
  statusBox.textContent = message;
  statusBox.className = "status" + (kind ? " " + kind : "");
}

function splitList(value) {
  return [...new Set(value.split(/[,，、]/u).map(item => item.trim()).filter(Boolean))];
}

function addText(parent, tag, value, className = "") {
  const node = document.createElement(tag);
  node.textContent = value ?? "";
  if (className) node.className = className;
  parent.append(node);
  return node;
}

function refreshCategoryFilter() {
  const select = $("#wiki-category-filter");
  const selected = select.value;
  const categories = [...new Set(entries.map(entry => entry.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  select.replaceChildren(new Option("全部分类", ""));
  for (const category of categories) select.add(new Option(category, category));
  if (categories.includes(selected)) select.value = selected;
}

function showDetail(entry) {
  selectedId = entry.id;
  detailBox.hidden = false;
  $("#detail-title").textContent = entry.title;
  $("#detail-meta").textContent = [entry.category || "未分类", stateLabels[entry.status], "更新于 " + new Date(entry.updatedAt).toLocaleString()].filter(Boolean).join(" · ");
  $("#detail-summary").textContent = entry.summary;
  renderMarkdown($("#detail-body"), entry.body, { entries, onNavigate: target => showDetail(target) });
  renderLinkPanels(entry);
  $("#detail-tags").textContent = [
    entry.tags.length ? "标签：" + entry.tags.join("、") : "",
    entry.aliases.length ? "别名：" + entry.aliases.join("、") : ""
  ].filter(Boolean).join(" · ");
}


function renderLinkPanels(entry) {
  const panel = $("#detail-links");
  panel.replaceChildren();
  const graph = buildWikiLinkGraph(entries);
  const links = graph.forEntry(entry.id);
  const outgoing = document.createElement("section");
  addText(outgoing, "h3", "引用的条目（出链）");
  if (!links.outgoing.length) addText(outgoing, "p", "暂无内部引用。", "wiki-meta");
  for (const link of links.outgoing) {
    const line = document.createElement("p");
    if (link.resolved) {
      const button = document.createElement("button");
      button.type = "button"; button.className = "wiki-inline-link";
      button.textContent = link.target.title;
      button.addEventListener("click", () => showDetail(link.target));
      line.append(button);
    } else {
      const missing = document.createElement("span");
      missing.className = "wiki-unresolved";
      missing.textContent = "未解析：" + link.targetId;
      line.append(missing);
    }
    outgoing.append(line);
  }
  const incoming = document.createElement("section");
  addText(incoming, "h3", "被哪些条目引用（反向链接）");
  if (!links.incoming.length) addText(incoming, "p", "暂无其他条目引用。", "wiki-meta");
  for (const source of links.incoming) {
    const button = document.createElement("button");
    button.type = "button"; button.className = "wiki-inline-link";
    button.textContent = source.title;
    button.addEventListener("click", () => showDetail(source));
    incoming.append(button);
  }
  panel.append(outgoing, incoming);
}


function updateImportDuplicateWarnings() {
  const candidate = { title: $("#wiki-import-title").value, aliases: splitList($("#wiki-import-aliases").value) };
  const matches = findWikiImportDuplicates(candidate, entries);
  const box = $("#wiki-import-warnings");
  box.replaceChildren();
  if (!matches.length) {
    addText(box, "p", "未发现标题或别名冲突。", "wiki-meta");
    $("#wiki-import-duplicate-ack").checked = false;
    $("#wiki-import-confirm").disabled = false;
    return;
  }
  addText(box, "p", "发现可能重复的条目。系统不会覆盖它们；如仍需导入，将创建独立的新条目：", "wiki-import-warning");
  for (const match of matches) addText(box, "p", match.title + "（" + match.reasons.join("、") + "）", "wiki-meta");
  $("#wiki-import-confirm").disabled = !$("#wiki-import-duplicate-ack").checked;
}

function showImportPreview(candidate) {
  $("#wiki-import-title").value = candidate.title;
  $("#wiki-import-summary").value = candidate.summary;
  $("#wiki-import-category").value = candidate.category;
  $("#wiki-import-tags").value = candidate.tags.join(", ");
  $("#wiki-import-aliases").value = candidate.aliases.join(", ");
  $("#wiki-import-body").value = candidate.body;
  $("#wiki-import-preview").hidden = false;
  $("#wiki-import-duplicate-ack").checked = false;
  const warnings = $("#wiki-import-parser-warnings");
  warnings.replaceChildren();
  for (const warning of candidate.warnings) addText(warnings, "p", warning, "wiki-import-warning");
  updateImportDuplicateWarnings();
}

$("#wiki-import-parse").addEventListener("click", () => {
  try {
    showImportPreview(parseWikiImportText($("#wiki-import-source").value));
    setStatus("已生成导入预览。请检查并编辑字段后再确认导入。", "success");
  } catch (error) {
    $("#wiki-import-preview").hidden = true;
    setStatus("无法解析导入内容：" + error.message, "error");
  }
});
for (const selector of ["#wiki-import-title", "#wiki-import-aliases"]) {
  $(selector).addEventListener("input", () => {
    $("#wiki-import-duplicate-ack").checked = false;
    updateImportDuplicateWarnings();
  });
}
$("#wiki-import-duplicate-ack").addEventListener("change", updateImportDuplicateWarnings);
$("#wiki-import-cancel").addEventListener("click", () => {
  $("#wiki-import-preview").hidden = true;
  $("#wiki-import-source").value = "";
  $("#wiki-import-duplicate-ack").checked = false;
});
$("#wiki-import-confirm").addEventListener("click", async () => {
  try {
    const candidate = {
      title: $("#wiki-import-title").value, summary: $("#wiki-import-summary").value,
      category: $("#wiki-import-category").value, tags: splitList($("#wiki-import-tags").value),
      aliases: splitList($("#wiki-import-aliases").value), body: $("#wiki-import-body").value,
      status: "draft"
    };
    const matches = findWikiImportDuplicates(candidate, entries);
    if (matches.length && !$("#wiki-import-duplicate-ack").checked) {
      updateImportDuplicateWarnings();
      throw new Error("请先确认重复提示；导入只会新建条目，不会覆盖原条目。");
    }
    const entry = createWikiEntry(candidate);
    await repository.save(entry);
    entries = await repository.list();
    renderList();
    showDetail(entry);
    $("#wiki-import-preview").hidden = true;
    $("#wiki-import-source").value = "";
    $("#wiki-import-duplicate-ack").checked = false;
    setStatus("已作为新的待确认条目导入；原有条目未被覆盖。", "success");
  } catch (error) { setStatus("导入失败：" + error.message, "error"); }
});


let pendingBackup = null;

$("#wiki-backup-export").addEventListener("click", () => {
  try {
    const content = createWikiBackupText(entries);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "testnisa-wiki-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("JSON 备份已生成；请妥善保管导出的本地文件。", "success");
  } catch (error) {
    setStatus("导出失败：" + error.message, "error");
  }
});

$("#wiki-backup-select").addEventListener("click", () => $("#wiki-backup-file").click());
$("#wiki-backup-file").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  pendingBackup = null;
  $("#wiki-backup-preview").hidden = true;
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("备份文件不能超过 5 MiB");
    const snapshot = parseWikiBackupText(await file.text());
    const plan = planWikiBackupImport(snapshot, entries);
    pendingBackup = snapshot;
    $("#wiki-backup-meta").textContent =
      "格式版本 v" + snapshot.formatVersion + " · 导出时间 " + (snapshot.exportedAt || "未记录") +
      " · 文件条目 " + (snapshot.declaredEntryCount ?? snapshot.entries.length);
    $("#backup-new-count").textContent = String(plan.counts.new);
    $("#backup-duplicate-count").textContent = String(plan.counts.duplicate);
    $("#backup-conflict-count").textContent = String(plan.counts.conflict);
    $("#backup-invalid-count").textContent = String(plan.counts.invalid);
    const issues = $("#wiki-backup-issues");
    issues.replaceChildren();
    for (const item of plan.duplicates) addText(issues, "p", "重复跳过：" + item.entry.title + "（" + item.reason + "）", "wiki-meta");
    for (const item of plan.conflicts) addText(issues, "p", "冲突跳过：" + item.entry.title + "（" + item.reason + "）", "wiki-import-warning");
    for (const item of plan.invalid) addText(issues, "p", "无效条目 #" + (item.index + 1) + "：" + item.reason, "wiki-import-warning");
    $("#wiki-backup-confirm").disabled = plan.counts.new === 0;
    $("#wiki-backup-preview").hidden = false;
    setStatus("备份解析完成。请检查预览；现有条目不会被覆盖或删除。", "success");
  } catch (error) {
    setStatus("无法读取备份：" + error.message + "；本地数据未修改。", "error");
  } finally {
    event.target.value = "";
  }
});

$("#wiki-backup-confirm").addEventListener("click", async () => {
  if (!pendingBackup) return;
  const button = $("#wiki-backup-confirm");
  button.disabled = true;
  try {
    const result = await applyWikiBackupImport(wikiDatabase, pendingBackup);
    entries = await repository.list();
    renderList();
    if (selectedId) {
      const selected = entries.find(item => item.id === selectedId);
      if (selected) showDetail(selected);
      else { selectedId = null; detailBox.hidden = true; }
    }
    pendingBackup = null;
    $("#wiki-backup-preview").hidden = true;
    setStatus("恢复完成：新增 " + result.new + " 条；重复跳过 " + result.duplicate +
      " 条；冲突跳过 " + result.conflict + " 条；无效跳过 " + result.invalid + " 条。", "success");
  } catch (error) {
    setStatus("恢复失败：" + error.message + "。原有数据保持不变。", "error");
    button.disabled = false;
  }
});
$("#wiki-backup-cancel").addEventListener("click", () => {
  pendingBackup = null;
  $("#wiki-backup-preview").hidden = true;
});


function renderList() {
  refreshCategoryFilter();
  const visible = searchWikiEntries(entries, $("#wiki-search").value, {
    category: $("#wiki-category-filter").value,
    status: $("#wiki-status-filter").value
  });
  $("#wiki-count").textContent = String(entries.length);
  listBox.replaceChildren();
  if (!visible.length) {
    addText(listBox, "div", entries.length ? "没有符合条件的条目。" : "还没有知识条目。可以先从右侧创建第一条。", "empty");
    return;
  }
  for (const entry of visible) {
    const card = document.createElement("article");
    card.className = "wiki-entry";
    addText(card, "h3", entry.title);
    addText(card, "p", entry.summary || (entry.body.slice(0, 120) + (entry.body.length > 120 ? "…" : "")));
    addText(card, "div", [entry.category || "未分类", stateLabels[entry.status], entry.tags.join(" · ")].filter(Boolean).join(" / "), "wiki-meta");
    const actions = document.createElement("div");
    actions.className = "actions";
    const view = document.createElement("button");
    view.type = "button"; view.className = "button"; view.textContent = "查看";
    view.addEventListener("click", () => showDetail(entry));
    const edit = document.createElement("button");
    edit.type = "button"; edit.className = "button"; edit.textContent = "编辑";
    edit.addEventListener("click", () => loadIntoForm(entry));
    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "button"; remove.textContent = "删除";
    remove.addEventListener("click", () => deleteEntry(entry));
    actions.append(view, edit, remove);
    card.append(actions);
    listBox.append(card);
  }
}

function loadIntoForm(entry) {
  $("#wiki-id").value = entry.id;
  $("#wiki-title").value = entry.title;
  $("#wiki-summary").value = entry.summary;
  $("#wiki-category").value = entry.category;
  $("#wiki-tags").value = entry.tags.join(", ");
  $("#wiki-aliases").value = entry.aliases.join(", ");
  $("#wiki-status").value = entry.status;
  $("#wiki-body").value = entry.body;
  $("#form-heading").textContent = "编辑知识条目";
  showDetail(entry);
  $("#wiki-title").focus();
}

function resetForm() {
  form.reset();
  $("#wiki-id").value = "";
  $("#wiki-status").value = "draft";
  $("#form-heading").textContent = "新建知识条目";
}

async function deleteEntry(entry) {
  if (!confirm("确定删除“" + entry.title + "”吗？此操作不会删除其他条目的正文。")) return;
  try {
    await repository.remove(entry.id);
    entries = await repository.list();
    if (selectedId === entry.id) { selectedId = null; detailBox.hidden = true; }
    renderList();
    setStatus("条目已从本地 Wiki 删除。", "success");
  } catch (error) {
    setStatus("删除失败：" + error.message, "error");
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const id = $("#wiki-id").value || undefined;
    const previous = id ? entries.find(entry => entry.id === id) : null;
    const entry = createWikiEntry({
      id,
      title: $("#wiki-title").value,
      summary: $("#wiki-summary").value,
      category: $("#wiki-category").value,
      tags: splitList($("#wiki-tags").value),
      aliases: splitList($("#wiki-aliases").value),
      status: $("#wiki-status").value,
      body: $("#wiki-body").value,
      createdAt: previous?.createdAt
    });
    await repository.save(entry);
    entries = await repository.list();
    renderList();
    showDetail(entry);
    resetForm();
    setStatus("已保存到本地 Wiki。", "success");
  } catch (error) {
    setStatus("保存失败：" + error.message, "error");
  }
});

$("#wiki-reset").addEventListener("click", resetForm);
$("#detail-edit").addEventListener("click", () => {
  const entry = entries.find(item => item.id === selectedId);
  if (entry) loadIntoForm(entry);
});
for (const selector of ["#wiki-search", "#wiki-category-filter", "#wiki-status-filter"]) {
  $(selector).addEventListener("input", renderList);
  $(selector).addEventListener("change", renderList);
}

try {
  const db = await openWikiDatabase(globalThis.indexedDB, () => setStatus("数据库升级被其他打开的标签页阻塞，请关闭其他 Wiki 标签页后重试。", "pending"));
  wikiDatabase = db;
  repository = createWikiRepository(db);
  entries = await repository.list();
  renderList();
  setStatus("本地 Wiki 已就绪。刷新页面后，保存的条目仍会保留。", "success");
} catch (error) {
  setStatus("无法初始化本地 Wiki：" + error.message, "error");
  listBox.replaceChildren();
  addText(listBox, "div", "请确认浏览器支持 IndexedDB，并在安全上下文（localhost 或 HTTPS）打开页面。", "empty");
}
