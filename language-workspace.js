(() => {
'use strict';

// 外语学习工作区 V2.0.0（应用 V10.35）
// 独立存储，不读写计划工作区七个模块的数据，不访问 Supabase。
const KEY = 'personal-language-study-workspace:v1';
const BACKUP_KEY = KEY + ':pre-v2-backup';
const WORKSPACE_KEY = 'personal-planner:active-workspace:v1';
const ROOT = 'language-workspace-root';
const SCHEMA = 2;
const WORKSPACE_VERSION = '2.0.0';
const PAGE_SIZE = 10;
const NOTE_MAX = 3000;
const IMPORT_MAX = 5 * 1024 * 1024;

const LANGUAGES = ['英语', '日语', '德语', '俄语', '其他'];
const TYPES = [['vocabulary', '词汇'], ['grammar', '语法'], ['reading', '阅读'], ['listening', '听力'], ['question', '练习题'], ['other', '其他']];
const STATUS = { not_started: '未学习', learning: '学习中', completed: '已完成', review: '需要复习', mastered: '已掌握' };
const STATUS_ORDER = ['not_started', 'learning', 'completed', 'review', 'mastered'];
const ACTIONS = {
  start: ['开始学习', 'learning'],
  complete: ['完成本次学习', 'completed'],
  review: ['标记为需要复习', 'review'],
  master: ['标记为已掌握', 'mastered'],
  relearn: ['重新学习', 'learning']
};
const V1_STATUS = { new: 'not_started', mistake: 'review', mastered: 'mastered' };
const V1_RESULT_ACTION = { mastered: 'master', mistake: 'review' };
const SORTS = [['studied', '最近学习'], ['updated', '最近更新'], ['created', '创建时间'], ['title', '名称']];
const TABS = [['home', '学习首页', '⌂'], ['content', '学习内容', '▤'], ['practice', '练习中心', '✎'], ['mistakes', '错题管理', '↻'], ['records', '学习记录', '◷'], ['settings', '数据管理', '⚙']];
const TAB_IDS = TABS.map(t => t[0]);
const NO_UNIT = '__none__';
// 按内容类型决定详情页的区块标题
const TYPE_LABELS = {
  vocabulary: ['单词 / 词组', '释义'],
  grammar: ['知识点', '说明'],
  reading: ['原文', '翻译 / 答案'],
  listening: ['听力原文', '翻译 / 答案'],
  question: ['题干', '答案'],
  other: ['内容', '答案 / 释义']
};

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => crypto.randomUUID ? crypto.randomUUID() : 'ls-' + Date.now() + '-' + Math.random().toString(16).slice(2);
const stamp = () => new Date().toISOString();
const str = (v, max) => String(v ?? '').slice(0, max);
const labelType = t => (TYPES.find(x => x[0] === t) || TYPES[TYPES.length - 1])[1];
const fmtDate = v => v ? new Date(v).toLocaleDateString() : '';
const fmtTime = v => v ? new Date(v).toLocaleString() : '';
const fresh = () => ({ schemaVersion: SCHEMA, items: [], records: [], notes: [], settings: { activeTab: 'home' } });

let data = fresh();
let readOnly = false;       // 数据无法识别时只读打开，不写回
let rawUnreadable = null;   // 无法识别时保留的原始字符串，供导出
let tab = 'home';
let detailId = null, detailFrom = 'content';
let reveal = false, quizId = null, noteEditing = null, editing = null;
const filters = { q: '', lang: '', type: '', unit: '', status: '', sort: 'studied' };
const pages = { content: 1, mistakes: 1, records: 1 };

// ---------- 数据迁移与校验 ----------
function normalizeItem(x) {
  if (!x || typeof x !== 'object' || !x.id) return null;
  const type = TYPES.some(t => t[0] === x.type) ? x.type : 'other';
  const status = STATUS[x.status] ? x.status : (V1_STATUS[x.status] || 'not_started');
  return {
    ...x,
    id: String(x.id),
    title: str(x.title, 160) || '未命名内容',
    language: str(x.language, 30) || '其他',
    type,
    category: str(x.category, 60) || '未分类',
    unit: str(x.unit, 60).trim(),
    level: str(x.level, 30).trim(),
    prompt: String(x.prompt ?? ''),
    answer: String(x.answer ?? ''),
    options: Array.isArray(x.options) ? x.options.map(o => String(o)) : [],
    notes: String(x.notes ?? ''),
    status,
    lastStudiedAt: x.lastStudiedAt || null,
    createdAt: x.createdAt || stamp(),
    updatedAt: x.updatedAt || x.createdAt || stamp()
  };
}

function normalizeRecord(r) {
  if (!r || typeof r !== 'object') return null;
  const action = ACTIONS[r.action] ? r.action : (V1_RESULT_ACTION[r.result] || 'review');
  return { ...r, id: r.id || uid(), action, status: STATUS[r.status] ? r.status : ACTIONS[action][1], at: r.at || stamp() };
}

function normalizeNote(n) {
  if (!n || typeof n !== 'object' || !n.itemId) return null;
  return { id: n.id || uid(), itemId: String(n.itemId), text: str(n.text, NOTE_MAX), createdAt: n.createdAt || stamp(), updatedAt: n.updatedAt || n.createdAt || stamp() };
}

// 把 V1 或 V2 对象转换为合法的 V2 对象；无法识别时返回 null
function upgrade(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.items) || !Array.isArray(d.records)) return null;
  if (d.schemaVersion !== 1 && d.schemaVersion !== SCHEMA) return null;
  const items = d.items.map(normalizeItem);
  const records = d.records.map(normalizeRecord);
  if (items.some(x => !x) || records.some(x => !x)) return null;
  const typeOf = new Map(items.map(x => [x.id, x.type]));
  records.forEach(r => { if (!r.type && typeOf.has(r.itemId)) r.type = typeOf.get(r.itemId); });
  if (d.schemaVersion === 1) {
    // V1 没有最近学习时间：从最后一条学习记录推算
    const last = new Map();
    records.forEach(r => { if (!last.has(r.itemId) || r.at > last.get(r.itemId)) last.set(r.itemId, r.at); });
    items.forEach(x => { x.lastStudiedAt = last.get(x.id) || null; });
  }
  const notes = Array.isArray(d.notes) ? d.notes.map(normalizeNote).filter(Boolean) : [];
  const activeTab = TAB_IDS.includes(d.settings?.activeTab) ? d.settings.activeTab : 'home';
  return { schemaVersion: SCHEMA, items, records, notes, settings: { ...(d.settings || {}), activeTab } };
}

function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { readOnly = true; return; }
  if (!raw) { data = fresh(); return; }
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
  const upgraded = upgrade(parsed);
  if (!upgraded) {
    readOnly = true;
    rawUnreadable = raw;
    data = fresh();
    return;
  }
  data = upgraded;
  if (parsed.schemaVersion === 1) {
    if (upgraded.items.length !== parsed.items.length || upgraded.records.length !== parsed.records.length) {
      readOnly = true; rawUnreadable = raw; data = fresh(); return;
    }
    try {
      if (localStorage.getItem(BACKUP_KEY) === null) localStorage.setItem(BACKUP_KEY, raw);
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      // 写入失败：按只读方式使用迁移后的内存数据，原数据未修改
      readOnly = true;
    }
  }
}

function save() {
  if (readOnly) { toast('当前为只读模式，更改未保存。请先在「数据管理」导出原始数据。'); return false; }
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
  catch (e) { toast('保存失败：请检查浏览器存储空间。'); return false; }
}

function toast(s) {
  const n = $('lw-toast');
  if (!n) return;
  n.textContent = s;
  n.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => n.classList.remove('show'), 2600);
}

// ---------- 学习状态 ----------
const items = () => data.items;
const findItem = id => data.items.find(x => x.id === id);

function act(item, action, silent) {
  const [, status] = ACTIONS[action];
  const prev = { status: item.status, lastStudiedAt: item.lastStudiedAt };
  const at = stamp();
  item.status = status;
  item.lastStudiedAt = at;
  const record = { id: uid(), itemId: item.id, title: item.title, language: item.language, type: item.type, action, status, at };
  data.records.push(record);
  if (!save()) {
    item.status = prev.status; item.lastStudiedAt = prev.lastStudiedAt;
    data.records.pop();
    return false;
  }
  if (!silent) toast('已记录：' + ACTIONS[action][0]);
  return true;
}

// 首次打开未学习的内容时自动进入「学习中」
function ensureStarted(item) {
  if (item && item.status === 'not_started' && !readOnly) act(item, 'start', true);
}

// ---------- 列表、筛选、分页 ----------
function sortList(list) {
  const by = filters.sort;
  return list.slice().sort((a, b) => {
    if (by === 'title') return a.title.localeCompare(b.title);
    if (by === 'created') return (b.createdAt || '').localeCompare(a.createdAt || '');
    if (by === 'updated') return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    if (!a.lastStudiedAt !== !b.lastStudiedAt) return a.lastStudiedAt ? -1 : 1;
    return (b.lastStudiedAt || b.updatedAt || '').localeCompare(a.lastStudiedAt || a.updatedAt || '');
  });
}

function baseFiltered() {
  return items().filter(x => (!filters.lang || x.language === filters.lang) && (!filters.type || x.type === filters.type));
}

function filteredContent() {
  const q = filters.q.trim().toLocaleLowerCase();
  return sortList(baseFiltered().filter(x =>
    (!filters.status || x.status === filters.status) &&
    (!filters.unit || (filters.unit === NO_UNIT ? !x.unit : x.unit === filters.unit)) &&
    (!q || [x.title, x.prompt, x.answer, x.notes, x.category, x.unit, x.level].join(' ').toLocaleLowerCase().includes(q))
  ));
}

function unitOptions() {
  const list = baseFiltered();
  const units = [...new Set(list.map(x => x.unit).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const opts = units.map(u => [u, u]);
  if (list.some(x => !x.unit)) opts.push([NO_UNIT, '未分单元']);
  if (filters.unit && !opts.some(o => o[0] === filters.unit)) filters.unit = '';
  return opts;
}

function paginate(list, key) {
  const total = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (pages[key] > total) pages[key] = total;
  if (pages[key] < 1) pages[key] = 1;
  const page = pages[key];
  const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  if (total <= 1) return { slice, html: '' };
  let from = 1, to = total;
  if (total > 5) { from = Math.max(1, Math.min(page - 2, total - 4)); to = from + 4; }
  const btn = (p, label, disabled, current) => '<button type="button" class="lw-page' + (current ? ' active' : '') + '" data-act="page" data-list="' + key + '" data-page="' + p + '"' + (disabled ? ' disabled' : '') + (current ? ' aria-current="page"' : '') + '>' + label + '</button>';
  let html = '<nav class="lw-pagination" aria-label="分页">' + btn(page - 1, '上一页', page === 1);
  for (let p = from; p <= to; p++) html += btn(p, String(p), false, p === page);
  html += btn(page + 1, '下一页', page === total) + '<span class="lw-page-info">' + page + ' / ' + total + '</span></nav>';
  return { slice, html };
}

// ---------- 渲染 ----------
function statusBadge(s) { return '<span class="lw-state ' + esc(s) + '">' + esc(STATUS[s] || STATUS.not_started) + '</span>'; }

function cards(list, emptyText) {
  if (!list.length) return '<div class="lw-empty">' + (emptyText || '这里还没有内容。点击「新增学习内容」开始建立自己的学习资料。') + '</div>';
  return '<div class="lw-cards">' + list.map(x =>
    '<article class="lw-item" data-item="' + esc(x.id) + '">' +
      '<div class="lw-item-top"><span class="lw-pill">' + esc(x.language) + ' · ' + labelType(x.type) + '</span>' + statusBadge(x.status) + '</div>' +
      '<h4>' + esc(x.title) + '</h4>' +
      ((x.unit || x.level) ? '<div class="lw-tags">' + (x.unit ? '<span>单元：' + esc(x.unit) + '</span>' : '') + (x.level ? '<span>难度：' + esc(x.level) + '</span>' : '') + '</div>' : '') +
      '<p>' + esc((x.prompt || x.answer || '').slice(0, 160)) + '</p>' +
      '<div class="lw-item-foot"><small>' + esc(x.category || '未分类') + ' · ' + (x.lastStudiedAt ? '最近学习 ' + fmtDate(x.lastStudiedAt) : '尚未学习') + '</small>' +
      '<div><button type="button" class="lw-link" data-act="detail" data-id="' + esc(x.id) + '">学习</button><button type="button" class="lw-link" data-act="edit" data-id="' + esc(x.id) + '">编辑</button><button type="button" class="lw-link" data-act="delete" data-id="' + esc(x.id) + '">删除</button></div></div>' +
    '</article>').join('') + '</div>';
}

function statusActions(item) {
  if (item.status === 'mastered') return '<button type="button" class="lw-secondary" data-act="study" data-action="relearn" data-id="' + esc(item.id) + '">重新学习</button>';
  return '<button type="button" class="lw-secondary" data-act="study" data-action="complete" data-id="' + esc(item.id) + '">完成本次学习</button>' +
    '<button type="button" class="lw-secondary" data-act="study" data-action="review" data-id="' + esc(item.id) + '">需要复习</button>' +
    '<button type="button" class="lw-primary" data-act="study" data-action="master" data-id="' + esc(item.id) + '">我已掌握</button>';
}

function studyBody(item) {
  const [promptLabel, answerLabel] = TYPE_LABELS[item.type] || TYPE_LABELS.other;
  return '<div class="lw-section-label">' + promptLabel + '</div>' +
    '<div class="lw-question">' + esc(item.prompt || '（尚未填写学习内容）') + '</div>' +
    (item.options.length ? '<div class="lw-options">' + item.options.map(o => '<div>' + esc(o) + '</div>').join('') + '</div>' : '') +
    '<div class="lw-answer ' + (reveal ? 'visible' : '') + '"><strong>' + answerLabel + '</strong><p>' + esc(item.answer || '尚未填写') + '</p>' +
    (item.notes ? '<strong>解析</strong><p>' + esc(item.notes) + '</p>' : '') + '</div>' +
    '<div class="lw-quiz-actions"><button type="button" class="lw-secondary" data-act="reveal">' + (reveal ? '隐藏' + answerLabel : '显示' + answerLabel) + '</button>' + statusActions(item) + '</div>';
}

function notesHtml(item) {
  const list = data.notes.filter(n => n.itemId === item.id).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return '<div class="lw-panel lw-notes"><div class="lw-panel-head"><div><h3>个人笔记</h3><p>记录自己的理解、例句和易错点。</p></div><span class="lw-count">' + list.length + ' 条</span></div>' +
    '<form class="lw-note-form" data-form="note-add"><textarea id="lw-note-new" rows="3" maxlength="' + NOTE_MAX + '" placeholder="写下新的笔记"></textarea><button class="lw-primary" type="submit">添加笔记</button></form>' +
    (list.length ? '<div class="lw-note-list">' + list.map(n => noteEditing === n.id
      ? '<form class="lw-note" data-form="note-edit" data-id="' + esc(n.id) + '"><textarea id="lw-note-edit" rows="3" maxlength="' + NOTE_MAX + '">' + esc(n.text) + '</textarea><div class="lw-note-actions"><button type="button" class="lw-link" data-act="note-cancel">取消</button><button class="lw-primary" type="submit">保存</button></div></form>'
      : '<article class="lw-note"><p>' + esc(n.text) + '</p><div class="lw-note-actions"><small>' + fmtTime(n.updatedAt) + '</small><span><button type="button" class="lw-link" data-act="note-edit" data-id="' + esc(n.id) + '">编辑</button><button type="button" class="lw-link" data-act="note-delete" data-id="' + esc(n.id) + '">删除</button></span></div></article>'
    ).join('') + '</div>' : '<div class="lw-empty">还没有笔记。</div>') + '</div>';
}

function detailHtml(item) {
  return '<div class="lw-panel lw-detail"><div class="lw-panel-head"><button type="button" class="lw-link" data-act="back">← 返回</button><div class="lw-detail-tools"><button type="button" class="lw-link" data-act="edit" data-id="' + esc(item.id) + '">编辑</button><button type="button" class="lw-link" data-act="delete" data-id="' + esc(item.id) + '">删除</button></div></div>' +
    '<div class="lw-quiz-meta"><span>' + esc(item.language) + ' · ' + labelType(item.type) + (item.unit ? ' · ' + esc(item.unit) : '') + (item.level ? ' · ' + esc(item.level) : '') + '</span>' + statusBadge(item.status) + '</div>' +
    '<h4 class="lw-detail-title">' + esc(item.title) + '</h4>' +
    '<p class="lw-detail-sub">分类：' + esc(item.category) + ' · ' + (item.lastStudiedAt ? '最近学习 ' + fmtTime(item.lastStudiedAt) : '尚未学习') + '</p>' +
    studyBody(item) + '</div>' + notesHtml(item);
}

function practiceHtml() {
  const pool = items().filter(x => x.status !== 'mastered');
  if (!pool.length) return '<div class="lw-empty">' + (items().length ? '所有内容都已标记掌握。' : '请先新增学习内容，再开始练习。') + '<br><button type="button" class="lw-primary" data-act="add">新增内容</button></div>';
  let item = quizId && pool.find(x => x.id === quizId);
  if (!item) {
    const review = pool.filter(x => x.status === 'review');
    const from = review.length ? review : pool;
    item = from[Math.floor(Math.random() * from.length)];
    quizId = item.id;
    reveal = false;
    ensureStarted(item);
  }
  return '<div class="lw-quiz"><div class="lw-quiz-meta"><span>' + esc(item.language) + ' · ' + labelType(item.type) + (item.unit ? ' · ' + esc(item.unit) : '') + '</span>' + statusBadge(item.status) + '</div>' +
    '<h4>' + esc(item.title) + '</h4>' + studyBody(item) +
    '<div class="lw-quiz-actions"><button type="button" class="lw-link" data-act="next">下一题 →</button></div></div>';
}

function contentListHtml() {
  const { slice, html } = paginate(filteredContent(), 'content');
  return cards(slice, items().length ? '没有符合条件的内容。' : null) + html;
}

function recordsHtml() {
  const list = data.records.slice().sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  if (!list.length) return '<div class="lw-empty">还没有学习记录。</div>';
  const { slice, html } = paginate(list, 'records');
  return '<div class="lw-records">' + slice.map(r =>
    '<div><span class="lw-record-dot ' + esc(r.status) + '"></span><div><strong>' + esc(r.title) + '</strong><small>' + esc(r.language) + (r.type ? ' · ' + labelType(r.type) : '') + ' · ' + esc((ACTIONS[r.action] || [r.result || ''])[0]) + ' → ' + esc(STATUS[r.status] || '') + ' · ' + fmtTime(r.at) + '</small></div></div>'
  ).join('') + '</div>' + html;
}

function renderTab() {
  const list = items();
  const count = s => list.filter(x => x.status === s).length;
  if (detailId) {
    const item = findItem(detailId);
    if (item) return detailHtml(item);
    detailId = null;
  }
  if (tab === 'home') {
    const recent = list.slice().sort((a, b) => (b.lastStudiedAt || b.updatedAt || '').localeCompare(a.lastStudiedAt || a.updatedAt || '')).slice(0, 4);
    return '<div class="lw-stats">' +
      '<article><span>学习内容</span><strong>' + list.length + '</strong><small>已建立的学习资料</small></article>' +
      STATUS_ORDER.map(s => '<article class="lw-stat-' + s + '"><span>' + STATUS[s] + '</span><strong>' + count(s) + '</strong><small>' + ({ not_started: '尚未开始', learning: '正在学习', completed: '已学完一遍', review: '等待复习', mastered: '确认掌握' }[s]) + '</small></article>').join('') +
      '</div><div class="lw-panel"><div class="lw-panel-head"><div><h3>最近学习内容</h3><p>从这里继续上次的学习</p></div><button type="button" class="lw-link" data-act="tab" data-tab="content">查看全部 →</button></div>' + cards(recent) + '</div>' +
      '<div class="lw-panel lw-quick"><h3>快速开始</h3><p>新增词汇、语法、阅读、听力或练习题，在详情页或练习中心记录学习结果。学习记录累计 ' + data.records.length + ' 条。</p><button type="button" class="lw-primary" data-act="add">新增学习内容</button></div>';
  }
  if (tab === 'content') {
    const opt = (v, l, sel) => '<option value="' + esc(v) + '"' + (sel === v ? ' selected' : '') + '>' + esc(l) + '</option>';
    return '<div class="lw-panel"><div class="lw-panel-head"><div><h3>学习内容</h3><p>按语言、类型和学习单元组织资料，支持搜索、状态筛选和排序。</p></div><span class="lw-count">' + list.length + ' 条</span></div>' +
      '<div class="lw-filters">' +
        '<input id="lw-search" data-filter="q" type="search" placeholder="搜索名称、内容、释义、单元" value="' + esc(filters.q) + '">' +
        '<select data-filter="lang" aria-label="语言筛选">' + opt('', '全部语言', filters.lang) + LANGUAGES.map(l => opt(l, l, filters.lang)).join('') + '</select>' +
        '<select data-filter="type" aria-label="类型筛选">' + opt('', '全部类型', filters.type) + TYPES.map(t => opt(t[0], t[1], filters.type)).join('') + '</select>' +
        '<select data-filter="unit" aria-label="学习单元筛选">' + opt('', '全部单元', filters.unit) + unitOptions().map(u => opt(u[0], u[1], filters.unit)).join('') + '</select>' +
        '<select data-filter="status" aria-label="状态筛选">' + opt('', '全部状态', filters.status) + STATUS_ORDER.map(s => opt(s, STATUS[s], filters.status)).join('') + '</select>' +
        '<select data-filter="sort" aria-label="排序">' + SORTS.map(s => opt(s[0], '排序：' + s[1], filters.sort)).join('') + '</select>' +
      '</div><div id="lw-card-list">' + contentListHtml() + '</div></div>';
  }
  if (tab === 'practice') return '<div class="lw-panel"><div class="lw-panel-head"><div><h3>练习中心</h3><p>从未掌握的内容中抽取，需要复习的内容优先。</p></div></div>' + practiceHtml() + '</div>';
  if (tab === 'mistakes') {
    const review = sortList(list.filter(x => x.status === 'review'));
    const { slice, html } = paginate(review, 'mistakes');
    return '<div class="lw-panel"><div class="lw-panel-head"><div><h3>错题管理</h3><p>集中复习标记为需要复习的内容。</p></div><span class="lw-count">' + review.length + ' 条</span></div>' + cards(slice, '没有需要复习的内容。') + html + '</div>';
  }
  if (tab === 'records') return '<div class="lw-panel"><div class="lw-panel-head"><div><h3>学习记录</h3><p>每次学习操作及操作后的状态。</p></div><span class="lw-count">' + data.records.length + ' 条</span></div>' + recordsHtml() + '</div>';
  let hasBackup = false;
  try { hasBackup = localStorage.getItem(BACKUP_KEY) !== null; } catch (e) {}
  return '<div class="lw-panel"><div class="lw-panel-head"><div><h3>数据管理</h3><p>独立保存在当前浏览器，不影响计划工作区的任何模块，也不参与云同步。</p></div></div>' +
    '<div class="lw-setting-row"><div><strong>' + (rawUnreadable ? '导出原始数据' : '导出学习数据') + '</strong><p>' + (rawUnreadable ? '下载当前浏览器中无法识别的原始数据，便于排查与恢复。' : '下载全部学习内容、状态、记录和笔记的 JSON 备份。') + '</p></div><button type="button" class="lw-secondary" data-act="export">导出 JSON</button></div>' +
    '<div class="lw-setting-row"><div><strong>导入学习数据</strong><p>支持 V1 与 V2 备份；校验后确认导入，替换当前工作区数据。</p></div><button type="button" class="lw-secondary" data-act="import">选择文件</button><input hidden id="lw-import-file" type="file" accept="application/json,.json"></div>' +
    '<div class="lw-setting-row"><div><strong>数据存储</strong><p>' + KEY + '</p></div><span class="lw-pill">本地独立存储</span></div>' +
    '<div class="lw-setting-row"><div><strong>升级前备份</strong><p>' + BACKUP_KEY + '</p></div><span class="lw-pill">' + (hasBackup ? '已保存 V1 原始数据' : '无') + '</span></div>' +
    '<div class="lw-setting-row"><div><strong>版本</strong><p>学习工作区 V' + WORKSPACE_VERSION + ' · 数据结构 schemaVersion ' + SCHEMA + '</p></div><span class="lw-pill">V2</span></div></div>';
}

function render() {
  const view = $('lw-view');
  if (!view) return;
  const nav = TABS.map(t => '<button type="button" data-act="tab" data-tab="' + t[0] + '" class="' + (tab === t[0] && !detailId ? 'active' : '') + '"' + (tab === t[0] && !detailId ? ' aria-current="page"' : '') + '><span>' + t[2] + '</span>' + t[1] + '</button>').join('');
  view.innerHTML = '<div class="lw-heading"><div><div class="lw-eyebrow">LANGUAGE LEARNING WORKSPACE</div><h2>外语学习</h2><p>把语言知识、练习和复习记录放在一个独立空间。</p></div><button type="button" class="lw-primary" data-act="add">＋ 新增学习内容</button></div>' +
    (readOnly ? '<div class="lw-alert" role="alert">学习数据无法识别或无法写入，已按只读方式打开，原数据未修改。请在「数据管理」导出数据后再处理。</div>' : '') +
    '<nav class="lw-nav" aria-label="外语学习导航">' + nav + '</nav><div class="lw-body">' + renderTab() + '</div>';
}

function refreshContentList() {
  const box = $('lw-card-list');
  if (box) box.innerHTML = contentListHtml();
}

// ---------- 编辑、删除、笔记 ----------
function editorHtml() {
  return '<dialog class="lw-dialog" id="lw-editor"><form id="lw-form" class="lw-editor" data-form="item"><div class="lw-dialog-head"><div><div class="lw-eyebrow">CONTENT EDITOR</div><h3 id="lw-editor-title">新增学习内容</h3></div><button type="button" class="lw-icon" data-act="close-editor" aria-label="关闭">×</button></div>' +
    '<label>内容名称<input id="lw-title" maxlength="160" required placeholder="例如：常见商务英语表达"></label>' +
    '<div class="lw-two"><label>学习语言<select id="lw-lang">' + LANGUAGES.map(l => '<option>' + l + '</option>').join('') + '</select></label><label>内容类型<select id="lw-type">' + TYPES.map(t => '<option value="' + t[0] + '">' + t[1] + '</option>').join('') + '</select></label></div>' +
    '<div class="lw-two"><label>学习单元<input id="lw-unit" maxlength="60" placeholder="例如：N1 词汇第 3 课"></label><label>难度 / 等级<input id="lw-level" maxlength="30" placeholder="例如：N1、B1、TOEIC 800"></label></div>' +
    '<label>分类<input id="lw-category" maxlength="60" placeholder="例如：商务英语"></label>' +
    '<label>学习内容 / 题干<textarea id="lw-prompt" rows="4" maxlength="5000"></textarea></label>' +
    '<label>答案 / 释义<textarea id="lw-answer" rows="3" maxlength="3000"></textarea></label>' +
    '<label>选项（每行一项，可选）<textarea id="lw-options" rows="3" maxlength="2000"></textarea></label>' +
    '<label>解析<textarea id="lw-notes" rows="3" maxlength="3000"></textarea></label>' +
    '<div class="lw-dialog-actions"><button type="button" class="lw-secondary" data-act="close-editor">取消</button><button class="lw-primary" type="submit">保存内容</button></div></form></dialog>';
}

function openEditor(item) {
  if (readOnly) { toast('当前为只读模式，无法编辑。'); return; }
  editing = item?.id || null;
  $('lw-form').reset();
  $('lw-editor-title').textContent = item ? '编辑学习内容' : '新增学习内容';
  $('lw-title').value = item?.title || '';
  $('lw-lang').value = LANGUAGES.includes(item?.language) ? item.language : '英语';
  $('lw-type').value = item?.type || 'vocabulary';
  $('lw-unit').value = item?.unit || '';
  $('lw-level').value = item?.level || '';
  $('lw-category').value = item?.category && item.category !== '未分类' ? item.category : '';
  $('lw-prompt').value = item?.prompt || '';
  $('lw-answer').value = item?.answer || '';
  $('lw-options').value = (item?.options || []).join('\n');
  $('lw-notes').value = item?.notes || '';
  $('lw-editor').showModal();
  $('lw-title').focus();
}

function submitItem() {
  const title = $('lw-title').value.trim();
  if (!title) return;
  const old = editing && findItem(editing), t = stamp();
  const item = {
    ...(old || {}),
    id: old?.id || uid(),
    title,
    language: $('lw-lang').value,
    type: $('lw-type').value,
    unit: $('lw-unit').value.trim().slice(0, 60),
    level: $('lw-level').value.trim().slice(0, 30),
    category: $('lw-category').value.trim() || '未分类',
    prompt: $('lw-prompt').value.trim(),
    answer: $('lw-answer').value.trim(),
    options: $('lw-options').value.split(/\r?\n/).map(x => x.trim()).filter(Boolean),
    notes: $('lw-notes').value.trim(),
    status: old?.status || 'not_started',          // 编辑不改变学习状态
    lastStudiedAt: old?.lastStudiedAt || null,
    createdAt: old?.createdAt || t,
    updatedAt: t
  };
  const before = data.items.slice();
  if (old) data.items[data.items.indexOf(old)] = item;
  else data.items.unshift(item);
  if (!save()) { data.items = before; return; }
  $('lw-editor').close();
  if (!old) { tab = 'content'; data.settings.activeTab = 'content'; detailId = null; pages.content = 1; save(); }
  render();
  toast(old ? '学习内容已更新' : '学习内容已保存');
}

function deleteItem(id) {
  const item = findItem(id);
  if (!item || readOnly) return;
  if (!confirm('确定删除学习内容「' + item.title + '」？相关学习记录和笔记会保留。')) return;
  const before = data.items;
  data.items = data.items.filter(x => x.id !== id);
  if (!save()) { data.items = before; return; }
  if (detailId === id) detailId = null;
  if (quizId === id) quizId = null;
  render();
  toast('学习内容已删除，历史记录和笔记已保留');
}

function addNote(item) {
  const box = $('lw-note-new');
  const text = (box?.value || '').trim();
  if (!text) { toast('请先填写笔记内容。'); return; }
  if (text.length > NOTE_MAX) { toast('笔记不能超过 ' + NOTE_MAX + ' 字。'); return; }
  const t = stamp();
  data.notes.push({ id: uid(), itemId: item.id, text, createdAt: t, updatedAt: t });
  if (!save()) { data.notes.pop(); return; }
  render();
  toast('笔记已添加');
}

function updateNote(id) {
  const note = data.notes.find(n => n.id === id);
  const text = ($('lw-note-edit')?.value || '').trim();
  if (!note) return;
  if (!text) { toast('笔记内容不能为空。'); return; }
  if (text.length > NOTE_MAX) { toast('笔记不能超过 ' + NOTE_MAX + ' 字。'); return; }
  const prev = { text: note.text, updatedAt: note.updatedAt };
  note.text = text; note.updatedAt = stamp();
  if (!save()) { Object.assign(note, prev); return; }
  noteEditing = null;
  render();
  toast('笔记已更新');
}

function deleteNote(id) {
  if (!confirm('确定删除这条笔记？')) return;
  const before = data.notes;
  data.notes = data.notes.filter(n => n.id !== id);
  if (!save()) { data.notes = before; return; }
  render();
  toast('笔记已删除');
}

// ---------- 导入导出 ----------
function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBackup() {
  const day = new Date().toISOString().slice(0, 10);
  if (rawUnreadable) { download(rawUnreadable, 'language-study-raw-' + day + '.json'); toast('原始数据已导出'); return; }
  download(JSON.stringify({ ...data, moduleType: 'language-workspace', app: 'daily-weekly-planner-language-workspace', workspaceVersion: WORKSPACE_VERSION, exportedAt: stamp() }, null, 2), 'language-study-backup-' + day + '.json');
  toast('学习数据备份已导出');
}

async function importBackup(file) {
  try {
    if (file.size > IMPORT_MAX) throw Error('文件超过 5 MB，原数据未改变。');
    let d;
    try { d = JSON.parse(await file.text()); } catch (e) { throw Error('文件不是有效的 JSON，原数据未改变。'); }
    if (d && d.moduleType && d.moduleType !== 'language-workspace') throw Error('这不是外语学习工作区的备份，原数据未改变。');
    const next = upgrade(d);
    if (!next) throw Error('文件格式不正确，原数据未改变。');
    if (!confirm('将导入 ' + next.items.length + ' 条学习内容、' + next.records.length + ' 条记录和 ' + next.notes.length + ' 条笔记，并替换当前工作区数据。继续吗？')) return;
    const old = data, wasReadOnly = readOnly, oldRaw = rawUnreadable;
    data = next; readOnly = false; rawUnreadable = null;
    if (!save()) { data = old; readOnly = wasReadOnly; rawUnreadable = oldRaw; throw Error('保存失败，原数据保持不变。'); }
    tab = 'home'; detailId = null; quizId = null;
    Object.keys(pages).forEach(k => { pages[k] = 1; });
    render();
    toast('学习数据已导入');
  } catch (e) { toast(e.message || '导入失败'); }
}

// ---------- 事件 ----------
function setTab(next) {
  tab = TAB_IDS.includes(next) ? next : 'home';
  detailId = null; noteEditing = null; quizId = null; reveal = false;
  data.settings.activeTab = tab;
  if (!readOnly) save();
  render();
}

function openDetail(id) {
  const item = findItem(id);
  if (!item) return;
  detailFrom = tab; detailId = id; reveal = false; noteEditing = null;
  ensureStarted(item);
  render();
  $(ROOT)?.scrollIntoView({ block: 'start' });
}

function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el || !$(ROOT).contains(el)) return;
  const id = el.dataset.id;
  switch (el.dataset.act) {
    case 'tab': setTab(el.dataset.tab); break;
    case 'add': openEditor(); break;
    case 'edit': openEditor(findItem(id)); break;
    case 'delete': deleteItem(id); break;
    case 'detail': openDetail(id); break;
    case 'back': detailId = null; noteEditing = null; tab = detailFrom; render(); break;
    case 'reveal': reveal = !reveal; render(); break;
    case 'next': quizId = null; reveal = false; render(); break;
    case 'study': {
      const item = findItem(id);
      if (item && act(item, el.dataset.action)) {
        if (!detailId) { quizId = null; reveal = false; }
        render();
      }
      break;
    }
    case 'page': pages[el.dataset.list] = Number(el.dataset.page) || 1; if (el.dataset.list === 'content') refreshContentList(); else render(); break;
    case 'note-edit': noteEditing = id; render(); $('lw-note-edit')?.focus(); break;
    case 'note-cancel': noteEditing = null; render(); break;
    case 'note-delete': deleteNote(id); break;
    case 'export': exportBackup(); break;
    case 'import': $('lw-import-file')?.click(); break;
    case 'close-editor': $('lw-editor').close(); break;
  }
}

function onFilter(e) {
  const el = e.target.closest('[data-filter]');
  if (!el) return;
  filters[el.dataset.filter] = el.value;
  pages.content = 1;
  if (el.dataset.filter === 'q') refreshContentList();
  else if (el.dataset.filter === 'lang' || el.dataset.filter === 'type') render();
  else refreshContentList();
}

function onSubmit(e) {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  if (form.dataset.form === 'item') submitItem();
  else if (form.dataset.form === 'note-add') { const item = findItem(detailId); if (item && !readOnly) addNote(item); }
  else if (form.dataset.form === 'note-edit') updateNote(form.dataset.id);
}

// ---------- 工作区切换 ----------
function currentWorkspace() { return document.documentElement.dataset.workspace === 'language' ? 'language' : 'plan'; }

function setWorkspace(ws) {
  const next = ws === 'language' ? 'language' : 'plan';
  if (next === 'language') document.documentElement.dataset.workspace = 'language';
  else delete document.documentElement.dataset.workspace;
  try { localStorage.setItem(WORKSPACE_KEY, next); } catch (e) {}
  $('workspace-plan')?.setAttribute('aria-pressed', String(next === 'plan'));
  $('workspace-language')?.setAttribute('aria-pressed', String(next === 'language'));
  if (next === 'language') render();
}

function init() {
  const app = $('app-shell'), header = app?.querySelector('.top');
  if (!app || !header) return;
  if (!document.querySelector('link[data-lw-style]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = './language-workspace.css'; link.dataset.lwStyle = '';
    document.head.append(link);
  }
  let root = $(ROOT);
  if (!root) {
    root = document.createElement('section');
    root.id = ROOT;
    root.setAttribute('aria-label', '外语学习工作区');
    header.insertAdjacentElement('afterend', root);
  }
  root.innerHTML = '<div id="lw-view"></div><div class="lw-toast" id="lw-toast" role="status" aria-live="polite"></div>' + editorHtml();
  root.addEventListener('click', onClick);
  root.addEventListener('input', e => { if (e.target.dataset?.filter === 'q') onFilter(e); });
  root.addEventListener('change', e => {
    if (e.target.id === 'lw-import-file') { const f = e.target.files?.[0]; e.target.value = ''; if (f) importBackup(f); return; }
    if (e.target.dataset?.filter && e.target.dataset.filter !== 'q') onFilter(e);
  });
  root.addEventListener('submit', onSubmit);
  load();
  tab = TAB_IDS.includes(data.settings.activeTab) ? data.settings.activeTab : 'home';
  $('workspace-plan')?.addEventListener('click', () => setWorkspace('plan'));
  $('workspace-language')?.addEventListener('click', () => setWorkspace('language'));
  setWorkspace(currentWorkspace());
}

// 供自动化测试检查迁移逻辑（不暴露写入能力）
window.LanguageWorkspace = Object.freeze({ version: WORKSPACE_VERSION, schemaVersion: SCHEMA, upgrade: d => upgrade(JSON.parse(JSON.stringify(d))) });

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
})();
