// Stage 3-A (V10.56): company transactions, business documents and private
// attachments. Uses company-api only; nothing is written to planner storage.
import {
  CURRENCIES, DOCUMENT_STATUSES, DOCUMENT_TYPES, FILE_ACCEPT_ATTRIBUTE, FILE_MAX_BYTES,
  TRANSACTION_DIRECTIONS, TRANSACTION_STATUSES, filterDocuments, filterTransactions,
  formatAmountMicros, formatFileSize, groupFilesByParent, isValidAmountInput, normalizeAmountInput,
  parseAmountMicros, recordRelations, relationPayload, sortByBusinessDate, summarizeTransactions,
  validateUploadCandidate
} from './company-records-rules.js';

(() => {
  'use strict';
  const API = 'company-api';
  const PROJECT_URL = 'https://kopvznygsqsheibsjjvv.supabase.co';
  const PAGE_SIZE = 20;
  const TABS = ['transactions', 'documents'];
  const state = {
    tab: '', busy: false, customers: [], projects: [], transactions: [], documents: [], filesByParent: {},
    editing: null, attachmentsFor: null, uploading: false,
    filters: {
      transactions: { query: '', direction: '', status: '', currency: '', customerId: '', offset: 0 },
      documents: { query: '', documentType: '', status: '', customerId: '', offset: 0 }
    }
  };
  const $ = id => document.getElementById(id);
  const locale = () => { const lang = (document.documentElement.lang || 'zh-CN').toLowerCase(); return lang.startsWith('ja') ? 'ja' : lang.startsWith('en') ? 'en' : 'zh'; };
  const words = {
    zh: {
      transactions: '交易收支', documents: '业务文档', newTransaction: '新增交易', newDocument: '新增文档', editTransaction: '编辑交易', editDocument: '编辑文档',
      searchTransaction: '搜索交易名称、类别或备注', searchDocument: '搜索文档名称、编号或备注', allDirections: '全部收支', allStatus: '全部状态', allCurrencies: '全部币种', allCustomers: '全部客户', allTypes: '全部类型',
      income: '收入', expense: '支出', planned: '预计', completed: '已完成', cancelled: '已取消', draft: '草稿', issued: '已发出', void: '已作废',
      quote: '报价单', contract: '合同', invoice: '发票', order: '订单', receipt: '收据', other: '其他',
      transactionTitle: '交易名称', documentTitle: '文档名称', direction: '收支类型', amount: '金额', currency: '币种', status: '状态', transactionDate: '交易日期', category: '类别', notes: '备注',
      documentType: '文档类型', documentNumber: '文档编号', issueDate: '日期', dueDate: '有效期 / 到期日', customer: '关联客户（可选）', project: '关联项目（可选）', noCustomer: '不关联客户', noProject: '不关联项目',
      save: '保存', cancel: '取消', edit: '编辑', delete: '删除', refresh: '刷新', search: '搜索', previous: '上一页', next: '下一页', close: '关闭', loading: '正在加载…', loaded: '已加载',
      noTransactions: '还没有交易记录', noDocuments: '还没有业务文档', noMatches: '没有符合当前筛选条件的记录', transactionHint: '记录收款、付款或采购支出。各币种分别统计，不做汇率换算。', documentHint: '登记报价、合同、发票等资料，并上传私有附件。',
      completedIncome: '已完成收入', completedExpense: '已完成支出', net: '净额', plannedTotals: '预计 收入/支出', summaryNote: '统计基于当前筛选后的全部记录，按币种分别汇总，不做汇率换算；已取消的交易不计入。',
      required: '请填写必填项目。', invalidAmount: '金额必须大于 0，最多 6 位小数。', confirmDeleteTransaction: '确定删除这条交易吗？此操作无法撤销。', confirmDeleteDocument: '确定删除这个文档吗？此操作无法撤销。',
      saved: '已保存。', deleted: '已删除。', failed: '操作失败，请稍后重试。', hasAttachments: '该记录仍有附件，请先删除附件再删除记录。', relationError: '该记录仍被其他业务记录关联，暂时不能删除。', authFailed: '账号验证失败，请重新登录。', loginRequired: '请先在计划工作区登录现有账号。',
      attachments: '附件', attachmentsTitle: '私有附件', upload: '上传附件', uploading: '正在上传…', download: '下载', noAttachments: '还没有附件', attachmentLimit: '单个文件最大 10 MB；支持 PDF、图片（PNG/JPEG/WebP）、TXT/CSV 和常见 Office 文档。文件保存在私有存储中，下载链接 5 分钟后失效。',
      chooseFile: '请先选择文件。', fileTooLarge: '文件超过 10 MB。', fileEmpty: '文件为空。', fileTypeNotAllowed: '不支持该文件类型。', fileNameInvalid: '文件名无效。', uploaded: '附件已上传。', confirmDeleteFile: '确定删除这个附件吗？文件将从私有存储中删除，无法恢复。',
      storageUnavailable: '文件存储暂时不可用，请稍后重试。', fileMissing: '文件已不存在，可删除此附件记录后重新上传。', uploadFailed: '上传失败，请检查网络后重试。', rateLimited: '请求过于频繁，请稍后再试。', viewCustomer: '查看客户', viewProject: '查看项目', footnote: '交易、文档和附件元数据保存在公司业务数据库；附件内容保存在私有 Storage，不进入计划模块备份。'
    },
    en: {
      transactions: 'Transactions', documents: 'Documents', newTransaction: 'New transaction', newDocument: 'New document', editTransaction: 'Edit transaction', editDocument: 'Edit document',
      searchTransaction: 'Search title, category or notes', searchDocument: 'Search title, number or notes', allDirections: 'Income & expense', allStatus: 'All statuses', allCurrencies: 'All currencies', allCustomers: 'All customers', allTypes: 'All types',
      income: 'Income', expense: 'Expense', planned: 'Planned', completed: 'Completed', cancelled: 'Cancelled', draft: 'Draft', issued: 'Issued', void: 'Void',
      quote: 'Quote', contract: 'Contract', invoice: 'Invoice', order: 'Order', receipt: 'Receipt', other: 'Other',
      transactionTitle: 'Transaction title', documentTitle: 'Document title', direction: 'Type', amount: 'Amount', currency: 'Currency', status: 'Status', transactionDate: 'Date', category: 'Category', notes: 'Notes',
      documentType: 'Document type', documentNumber: 'Document number', issueDate: 'Date', dueDate: 'Valid until / due', customer: 'Customer (optional)', project: 'Project (optional)', noCustomer: 'No customer', noProject: 'No project',
      save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', refresh: 'Refresh', search: 'Search', previous: 'Previous', next: 'Next', close: 'Close', loading: 'Loading…', loaded: 'Loaded',
      noTransactions: 'No transactions yet', noDocuments: 'No documents yet', noMatches: 'No records match the current filters', transactionHint: 'Record payments received, payments made and purchases. Each currency is totalled separately with no conversion.', documentHint: 'Register quotes, contracts and invoices and keep private attachments.',
      completedIncome: 'Completed income', completedExpense: 'Completed expense', net: 'Net', plannedTotals: 'Planned in/out', summaryNote: 'Totals cover all filtered records, per currency, without exchange rates. Cancelled transactions are excluded.',
      required: 'Complete the required fields.', invalidAmount: 'Amount must be greater than 0 with at most 6 decimals.', confirmDeleteTransaction: 'Delete this transaction? This cannot be undone.', confirmDeleteDocument: 'Delete this document? This cannot be undone.',
      saved: 'Saved.', deleted: 'Deleted.', failed: 'Operation failed. Please try again.', hasAttachments: 'This record still has attachments. Delete them first.', relationError: 'This record is still referenced by other records.', authFailed: 'Authentication failed. Please sign in again.', loginRequired: 'Sign in from the planner workspace first.',
      attachments: 'Attachments', attachmentsTitle: 'Private attachments', upload: 'Upload', uploading: 'Uploading…', download: 'Download', noAttachments: 'No attachments yet', attachmentLimit: 'Up to 10 MB per file: PDF, images (PNG/JPEG/WebP), TXT/CSV and common Office files. Files are stored privately; download links expire after 5 minutes.',
      chooseFile: 'Choose a file first.', fileTooLarge: 'The file is larger than 10 MB.', fileEmpty: 'The file is empty.', fileTypeNotAllowed: 'This file type is not supported.', fileNameInvalid: 'Invalid file name.', uploaded: 'Attachment uploaded.', confirmDeleteFile: 'Delete this attachment? The file will be removed from private storage permanently.',
      storageUnavailable: 'File storage is temporarily unavailable.', fileMissing: 'The stored file is missing. Delete this attachment and upload it again.', uploadFailed: 'Upload failed. Check your connection and try again.', rateLimited: 'Too many requests. Please wait a moment.', viewCustomer: 'View customer', viewProject: 'View project', footnote: 'Transactions, documents and attachment metadata are stored in the business database; file contents live in private Storage and are not part of planner backups.'
    },
    ja: {
      transactions: '取引・収支', documents: '業務文書', newTransaction: '取引を追加', newDocument: '文書を追加', editTransaction: '取引を編集', editDocument: '文書を編集',
      searchTransaction: '取引名・カテゴリ・メモを検索', searchDocument: '文書名・番号・メモを検索', allDirections: 'すべての収支', allStatus: 'すべての状態', allCurrencies: 'すべての通貨', allCustomers: 'すべての顧客', allTypes: 'すべての種類',
      income: '収入', expense: '支出', planned: '予定', completed: '完了', cancelled: '取消', draft: '下書き', issued: '発行済み', void: '無効',
      quote: '見積書', contract: '契約書', invoice: '請求書', order: '注文書', receipt: '領収書', other: 'その他',
      transactionTitle: '取引名', documentTitle: '文書名', direction: '収支区分', amount: '金額', currency: '通貨', status: '状態', transactionDate: '取引日', category: 'カテゴリ', notes: 'メモ',
      documentType: '文書の種類', documentNumber: '文書番号', issueDate: '日付', dueDate: '有効期限 / 期日', customer: '関連顧客（任意）', project: '関連プロジェクト（任意）', noCustomer: '顧客なし', noProject: 'プロジェクトなし',
      save: '保存', cancel: 'キャンセル', edit: '編集', delete: '削除', refresh: '更新', search: '検索', previous: '前へ', next: '次へ', close: '閉じる', loading: '読み込み中…', loaded: '読み込み完了',
      noTransactions: '取引はまだありません', noDocuments: '文書はまだありません', noMatches: '条件に一致する記録はありません', transactionHint: '入金・支払・仕入れを記録します。通貨ごとに集計し、為替換算は行いません。', documentHint: '見積書・契約書・請求書などを登録し、非公開の添付ファイルを保存します。',
      completedIncome: '完了済み収入', completedExpense: '完了済み支出', net: '差引', plannedTotals: '予定 収入/支出', summaryNote: '絞り込み後の全記録を通貨ごとに集計します（為替換算なし）。取消済みの取引は含みません。',
      required: '必須項目を入力してください。', invalidAmount: '金額は0より大きく、小数は6桁までです。', confirmDeleteTransaction: 'この取引を削除しますか？元に戻せません。', confirmDeleteDocument: 'この文書を削除しますか？元に戻せません。',
      saved: '保存しました。', deleted: '削除しました。', failed: '処理に失敗しました。もう一度お試しください。', hasAttachments: '添付ファイルが残っています。先に添付を削除してください。', relationError: '他の業務記録から参照されているため削除できません。', authFailed: '認証に失敗しました。再ログインしてください。', loginRequired: '先に計画ワークスペースでログインしてください。',
      attachments: '添付', attachmentsTitle: '非公開の添付ファイル', upload: 'アップロード', uploading: 'アップロード中…', download: 'ダウンロード', noAttachments: '添付ファイルはありません', attachmentLimit: '1ファイル最大10 MB。PDF、画像（PNG/JPEG/WebP）、TXT/CSV、一般的なOfficeファイルに対応。ファイルは非公開ストレージに保存され、ダウンロードリンクは5分で失効します。',
      chooseFile: 'ファイルを選択してください。', fileTooLarge: 'ファイルが10 MBを超えています。', fileEmpty: 'ファイルが空です。', fileTypeNotAllowed: 'このファイル形式には対応していません。', fileNameInvalid: 'ファイル名が無効です。', uploaded: '添付ファイルをアップロードしました。', confirmDeleteFile: 'この添付ファイルを削除しますか？非公開ストレージから完全に削除されます。',
      storageUnavailable: 'ファイルストレージを一時的に利用できません。', fileMissing: '保存済みファイルが見つかりません。この添付を削除して再アップロードしてください。', uploadFailed: 'アップロードに失敗しました。通信状況を確認してください。', rateLimited: 'リクエストが多すぎます。しばらくお待ちください。', viewCustomer: '顧客を見る', viewProject: 'プロジェクトを見る', footnote: '取引・文書・添付のメタデータは業務データベースに、ファイル本体は非公開Storageに保存され、計画モジュールのバックアップには含まれません。'
    }
  };
  const t = key => words[locale()][key] || words.zh[key] || key;
  const ERROR_KEYS = {
    AUTHENTICATION_FAILED: 'authFailed', RATE_LIMITED: 'rateLimited', FILE_TOO_LARGE: 'fileTooLarge', FILE_TYPE_NOT_ALLOWED: 'fileTypeNotAllowed', INVALID_FILE_NAME: 'fileNameInvalid',
    STORAGE_UNAVAILABLE: 'storageUnavailable', STORAGE_SIGN_FAILED: 'storageUnavailable', STORAGE_DELETE_FAILED: 'storageUnavailable', FILE_OBJECT_MISSING: 'fileMissing',
    FILE_NOT_UPLOADED: 'uploadFailed', FILE_VERIFICATION_FAILED: 'uploadFailed', INVALID_TRANSACTION_AMOUNT: 'invalidAmount'
  };

  function auth() { return window.PlannerCompanyContext?.getAuth?.() || null; }
  function baseUrl(a) { return a.url.replace(/\/+$/, ''); }
  function token(user, pass) { const bytes = new TextEncoder().encode(user + ':' + pass); let binary = ''; bytes.forEach(b => binary += String.fromCharCode(b)); return btoa(binary); }
  async function api(path, method = 'GET', body) {
    const a = auth();
    if (!a) throw new Error(t('loginRequired'));
    if (baseUrl(a) !== PROJECT_URL) throw new Error(t('failed'));
    const headers = { apikey: a.key, Authorization: 'Basic ' + token(a.username, a.password) };
    const options = { method, headers, cache: 'no-store' };
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
    let response;
    try { response = await fetch(baseUrl(a) + '/functions/v1/' + API + path, options); }
    catch { throw new Error(t('failed')); }
    let payload = {}; try { payload = await response.json(); } catch {}
    if (!response.ok) {
      const code = typeof payload?.error === 'string' ? payload.error : 'INTERNAL_ERROR';
      const error = new Error(code === 'RECORD_IN_USE_OR_INVALID_RELATION' ? t('relationError') : t(ERROR_KEYS[code] || 'failed'));
      error.code = code; throw error;
    }
    return payload?.data;
  }
  async function fetchAll(recordType) {
    const all = []; let offset = 0, expected = null;
    while (true) {
      const result = await api('/records?' + new URLSearchParams({ record_type: recordType, limit: '100', offset: String(offset) }).toString());
      const page = Array.isArray(result?.items) ? result.items : [];
      const total = Number(result?.total);
      if (!Number.isInteger(total) || total < 0 || (expected !== null && total !== expected)) throw new Error(t('failed'));
      expected = total; all.push(...page); offset += page.length;
      if (offset >= expected) break;
      // V10.58: an empty or short page before `total` means the read is incomplete.
      if (page.length < 100) throw new Error(t('failed'));
    }
    if (all.length !== expected) throw new Error(t('failed'));
    return all;
  }
  // V10.58: customers and projects come from the shared, verified company-business cache
  // when available, which saves requests under the company-api rate limit.
  function fetchShared(recordType) {
    const shared = window.CompanyBusiness?.loadRecords;
    return typeof shared === 'function' ? shared(recordType, 15000) : fetchAll(recordType);
  }

  function el(tag, cls, text) { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; }
  function btn(label, cls, fn) { const b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function options(select, choices, selected) {
    select.replaceChildren(...choices.map(([value, label]) => { const option = el('option', '', label); option.value = value; option.selected = value === selected; return option; }));
  }
  function dateText(value) { if (!value) return ''; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value).slice(0, 10) : d.toLocaleDateString(locale() === 'ja' ? 'ja-JP' : locale() === 'en' ? 'en-US' : 'zh-CN'); }
  function customerName(id) { return state.customers.find(c => c.id === id)?.title || ''; }
  function projectName(id) { return state.projects.find(p => p.id === id)?.title || ''; }
  function feedback(message = '', kind = '') { const host = $('cw-records-feedback'); if (host) { host.textContent = message; host.className = 'cw-feedback' + (kind ? ' ' + kind : ''); } }
  function moneyText(record) { const micros = parseAmountMicros(record.amount); return micros === null ? '—' : record.currency + ' ' + formatAmountMicros(micros, record.currency); }

  function install() {
    const host = $('company-workspace-root'), nav = $('cw-business-nav');
    if (!host || !nav || $('cw-records-panel')) return false;
    TABS.forEach(key => {
      const tab = btn(t(key), 'cw-business-tab', () => window.CompanyBusiness?.switchTab(key));
      tab.dataset.tab = key; tab.dataset.companyExtension = 'records'; tab.setAttribute('aria-pressed', 'false'); nav.append(tab);
    });
    const panel = el('section', 'cw-panel cw-records-panel'); panel.id = 'cw-records-panel'; panel.hidden = true;
    panel.dataset.companyExtensionPanel = TABS.join(' ');
    panel.innerHTML = '<div class="cw-records-toolbar"><form id="cw-records-search" class="cw-search"><label class="sr-only" for="cw-records-query"></label><input id="cw-records-query" type="search" maxlength="100"><button class="secondary" id="cw-records-search-button" type="submit"></button></form><select id="cw-records-filter-a"></select><select id="cw-records-filter-b"></select><select id="cw-records-filter-c"></select><select id="cw-records-filter-customer"></select><button class="primary" id="cw-records-new" type="button"></button><button class="secondary" id="cw-records-refresh" type="button"></button></div><div id="cw-records-summary" class="cw-records-summary"></div><div id="cw-records-feedback" class="cw-feedback" role="status" aria-live="polite"></div><div id="cw-records-list" class="cw-business-list"></div><nav id="cw-records-pagination" class="cw-pagination"></nav><p id="cw-records-footnote" class="cw-footnote"></p>';
    const anchor = $('cw-business-panel') || $('cw-customer-panel');
    anchor.insertAdjacentElement('afterend', panel);

    const editor = el('dialog', 'cw-dialog'); editor.id = 'cw-records-editor';
    editor.innerHTML = '<form id="cw-records-form" class="cw-editor-form" novalidate><div class="cw-dialog-head"><div><p class="cw-eyebrow" id="cw-records-editor-eyebrow"></p><h2 id="cw-records-editor-title"></h2></div><button class="close-btn" id="cw-records-editor-close" type="button" aria-label="Close">×</button></div><div id="cw-records-fields" class="cw-form-grid"></div><p class="cw-form-error" id="cw-records-error" role="alert"></p><div class="cw-dialog-actions"><button class="secondary" id="cw-records-cancel" type="button"></button><button class="primary" id="cw-records-save" type="submit"></button></div></form>';
    const files = el('dialog', 'cw-dialog'); files.id = 'cw-records-files';
    files.innerHTML = '<div class="cw-editor-form"><div class="cw-dialog-head"><div><p class="cw-eyebrow" id="cw-files-eyebrow"></p><h2 id="cw-files-title"></h2></div><button class="close-btn" id="cw-files-close" type="button" aria-label="Close">×</button></div><p class="cw-form-hint" id="cw-files-limit"></p><div class="cw-files-upload"><input type="file" id="cw-files-input"><button class="primary" id="cw-files-upload" type="button"></button></div><div id="cw-files-feedback" class="cw-feedback" role="status" aria-live="polite"></div><ul id="cw-files-list" class="cw-files-list"></ul></div>';
    host.append(editor, files);

    $('cw-records-search').addEventListener('submit', event => { event.preventDefault(); currentFilters().query = $('cw-records-query').value.trim(); currentFilters().offset = 0; render(); });
    const bindFilter = (id, key) => $(id).addEventListener('change', () => { const filters = currentFilters(), mapped = key(); if (mapped) { filters[mapped] = $(id).value; filters.offset = 0; render(); } });
    bindFilter('cw-records-filter-a', () => state.tab === 'transactions' ? 'direction' : 'documentType');
    bindFilter('cw-records-filter-b', () => 'status');
    bindFilter('cw-records-filter-c', () => state.tab === 'transactions' ? 'currency' : '');
    bindFilter('cw-records-filter-customer', () => 'customerId');
    $('cw-records-new').addEventListener('click', () => openEditor());
    $('cw-records-refresh').addEventListener('click', load);
    $('cw-records-form').addEventListener('submit', saveEditor);
    $('cw-records-editor-close').addEventListener('click', closeEditor); $('cw-records-cancel').addEventListener('click', closeEditor);
    editor.addEventListener('click', event => { if (event.target === editor) closeEditor(); });
    $('cw-files-close').addEventListener('click', () => files.close());
    files.addEventListener('click', event => { if (event.target === files) files.close(); });
    files.addEventListener('close', () => { state.attachmentsFor = null; $('cw-files-input').value = ''; });
    $('cw-files-upload').addEventListener('click', uploadSelectedFile);
    $('cw-files-input').accept = FILE_ACCEPT_ATTRIBUTE;
    return true;
  }

  function currentFilters() { return state.filters[state.tab] || state.filters.transactions; }
  function updateLabels() {
    document.querySelectorAll('[data-company-extension="records"]').forEach(tab => { tab.textContent = t(tab.dataset.tab); });
    if (!state.tab) return;
    const transactions = state.tab === 'transactions', filters = currentFilters();
    $('cw-records-query').placeholder = t(transactions ? 'searchTransaction' : 'searchDocument');
    $('cw-records-query').setAttribute('aria-label', $('cw-records-query').placeholder);
    $('cw-records-query').value = filters.query;
    $('cw-records-search-button').textContent = t('search');
    $('cw-records-new').textContent = '＋ ' + t(transactions ? 'newTransaction' : 'newDocument');
    $('cw-records-refresh').textContent = t('refresh');
    $('cw-records-footnote').textContent = t('footnote');
    const a = $('cw-records-filter-a'), b = $('cw-records-filter-b'), c = $('cw-records-filter-c'), customer = $('cw-records-filter-customer');
    if (transactions) {
      options(a, [['', t('allDirections')], ...TRANSACTION_DIRECTIONS.map(v => [v, t(v)])], filters.direction);
      options(b, [['', t('allStatus')], ...TRANSACTION_STATUSES.map(v => [v, t(v)])], filters.status);
      options(c, [['', t('allCurrencies')], ...CURRENCIES.map(v => [v, v])], filters.currency);
      c.hidden = false;
    } else {
      options(a, [['', t('allTypes')], ...DOCUMENT_TYPES.map(v => [v, t(v)])], filters.documentType);
      options(b, [['', t('allStatus')], ...DOCUMENT_STATUSES.map(v => [v, t(v)])], filters.status);
      c.hidden = true;
    }
    options(customer, [['', t('allCustomers')], ...state.customers.map(item => [item.id, item.title])], filters.customerId);
    [a, b, c, customer].forEach(select => select.setAttribute('aria-label', select.options[0]?.textContent || ''));
  }

  async function load() {
    if (!TABS.includes(state.tab)) return;
    if (state.busy) { state.reloadPending = true; return; }
    const tab = state.tab;
    state.busy = true; feedback(t('loading')); $('cw-records-refresh').disabled = true;
    try {
      // Sequential reads keep well inside the company-api rate limit.
      const customers = await fetchShared('customer');
      const projects = await fetchShared('project');
      const records = await fetchAll(tab === 'transactions' ? 'transaction' : 'document');
      const files = await fetchAll('file');
      state.customers = customers.sort((x, y) => String(x.title).localeCompare(String(y.title)));
      state.projects = projects.sort((x, y) => String(x.title).localeCompare(String(y.title)));
      state[tab] = sortByBusinessDate(records);
      state.filesByParent = groupFilesByParent(files);
      feedback('');
      if (state.tab === tab) render();
    } catch (error) { feedback(error.message || t('failed'), 'error'); }
    finally {
      state.busy = false; $('cw-records-refresh').disabled = false;
      if (state.reloadPending || (TABS.includes(state.tab) && state.tab !== tab)) { state.reloadPending = false; load(); }
    }
  }

  function render() {
    if (!TABS.includes(state.tab)) return;
    updateLabels();
    const transactions = state.tab === 'transactions', filters = currentFilters();
    const filtered = transactions ? filterTransactions(state.transactions, filters) : filterDocuments(state.documents, filters);
    renderSummary(transactions ? filtered : null);
    const total = filtered.length, lastOffset = total ? Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE : 0;
    if (filters.offset > lastOffset) filters.offset = lastOffset;
    const list = $('cw-records-list'); list.replaceChildren();
    if (!total) {
      const hasFilters = Boolean(filters.query || filters.status || filters.customerId || filters.direction || filters.currency || filters.documentType);
      const empty = el('div', 'cw-empty');
      empty.append(el('div', 'cw-empty-icon', '◇'), el('h3', '', hasFilters ? t('noMatches') : t(transactions ? 'noTransactions' : 'noDocuments')), el('p', '', t(transactions ? 'transactionHint' : 'documentHint')), btn('＋ ' + t(transactions ? 'newTransaction' : 'newDocument'), 'primary', () => openEditor()));
      list.append(empty);
    } else {
      filtered.slice(filters.offset, filters.offset + PAGE_SIZE).forEach(record => list.append(renderCard(record, transactions)));
      if (!$('cw-records-feedback').classList.contains('error')) feedback(t('loaded') + ' · ' + total);
    }
    const pager = $('cw-records-pagination'); pager.replaceChildren();
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE)), current = Math.floor(filters.offset / PAGE_SIZE) + 1;
    if (pages > 1) {
      const previous = btn(t('previous'), 'secondary', () => { filters.offset = Math.max(0, filters.offset - PAGE_SIZE); render(); });
      const next = btn(t('next'), 'secondary', () => { filters.offset += PAGE_SIZE; render(); });
      previous.disabled = current <= 1; next.disabled = current >= pages;
      pager.append(previous, el('span', '', current + ' / ' + pages), next);
    }
  }

  function renderSummary(records) {
    const host = $('cw-records-summary'); host.replaceChildren();
    if (!records) { host.hidden = true; return; }
    host.hidden = false;
    const rows = summarizeTransactions(records);
    if (!rows.length) return;
    rows.forEach(row => {
      const card = el('div', 'cw-records-summary-card');
      card.append(el('span', 'cw-records-summary-currency', row.currency));
      const items = [
        [t('completedIncome'), formatAmountMicros(row.income, row.currency), 'income'],
        [t('completedExpense'), formatAmountMicros(row.expense, row.currency), 'expense'],
        [t('net'), formatAmountMicros(row.net, row.currency), row.net < 0n ? 'expense' : 'income'],
        [t('plannedTotals'), formatAmountMicros(row.plannedIncome, row.currency) + ' / ' + formatAmountMicros(row.plannedExpense, row.currency), '']
      ];
      items.forEach(([label, value, kind]) => { const item = el('div', 'cw-records-summary-item'); item.append(el('small', '', label), el('strong', kind ? 'cw-amount-' + kind : '', value)); card.append(item); });
      host.append(card);
    });
    host.append(el('p', 'cw-records-summary-note', t('summaryNote')));
  }

  function renderCard(record, transactions) {
    const data = record.data && typeof record.data === 'object' ? record.data : {};
    const { customerId, projectId } = recordRelations(record);
    const card = el('article', 'cw-business-card cw-records-card'); card.dataset.recordId = record.id;
    const main = el('div', 'cw-business-main'); main.append(el('h3', 'cw-customer-title', record.title));
    const meta = el('div', 'cw-customer-meta');
    if (transactions) meta.append(el('span', 'cw-tag cw-direction-' + data.direction, t(data.direction)), el('span', 'cw-status', t(record.status)));
    else meta.append(el('span', 'cw-tag', t(data.document_type || 'other')), el('span', 'cw-status', t(record.status)));
    if (customerId && customerName(customerId)) meta.append(btn(customerName(customerId), 'cw-tag cw-relation-link', () => window.CompanyBusiness?.openCustomer(customerId)));
    if (projectId && projectName(projectId)) meta.append(btn(projectName(projectId), 'cw-tag cw-relation-link', () => window.CompanyBusiness?.openProject(projectId)));
    main.append(meta);
    const details = el('div', 'cw-business-details');
    if (transactions) {
      details.append(el('strong', 'cw-records-amount cw-amount-' + data.direction, (data.direction === 'expense' ? '− ' : '+ ') + moneyText(record)));
      if (record.record_date) details.append(el('span', '', t('transactionDate') + ': ' + dateText(record.record_date)));
      if (data.category) details.append(el('span', '', t('category') + ': ' + data.category));
    } else {
      if (data.document_number) details.append(el('span', '', t('documentNumber') + ': ' + data.document_number));
      if (record.record_date) details.append(el('span', '', t('issueDate') + ': ' + dateText(record.record_date)));
      if (record.due_date) details.append(el('span', '', t('dueDate') + ': ' + dateText(record.due_date)));
    }
    if (data.notes) details.append(el('p', '', data.notes));
    const actions = el('div', 'cw-card-actions');
    const fileCount = (state.filesByParent[record.id] || []).length;
    actions.append(
      btn(t('attachments') + ' (' + fileCount + ')', 'secondary', () => openAttachments(record)),
      btn(t('edit'), 'secondary', () => openEditor(record)),
      btn(t('delete'), 'cw-delete', () => removeRecord(record))
    );
    card.append(main, details, actions);
    return card;
  }

  function field(label, id, type, value, wide) {
    const wrap = el('div', 'field cw-field' + (wide ? ' cw-field-wide' : ''));
    const labelNode = el('label', '', label); labelNode.htmlFor = id; wrap.append(labelNode);
    const input = type === 'select' ? document.createElement('select') : type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    if (input.tagName === 'INPUT') input.type = type;
    input.id = id;
    if (value !== undefined && value !== null && type !== 'select') input.value = value;
    wrap.append(input); return { wrap, input };
  }
  function projectChoices(customerId) {
    const projects = customerId ? state.projects.filter(p => p.parent_record_id === customerId) : state.projects;
    return [['', t('noProject')], ...projects.map(p => [p.id, p.title])];
  }

  function openEditor(record = null) {
    const transactions = state.tab === 'transactions';
    state.editing = record;
    const data = record?.data && typeof record.data === 'object' ? record.data : {};
    const { customerId, projectId } = recordRelations(record);
    $('cw-records-editor-eyebrow').textContent = transactions ? 'TRANSACTION' : 'BUSINESS DOCUMENT';
    $('cw-records-editor-title').textContent = t(record ? (transactions ? 'editTransaction' : 'editDocument') : (transactions ? 'newTransaction' : 'newDocument'));
    $('cw-records-cancel').textContent = t('cancel'); $('cw-records-save').textContent = t('save');
    const host = $('cw-records-fields'); host.replaceChildren();
    const add = (...args) => { const created = field(...args); host.append(created.wrap); return created.input; };
    const title = add(t(transactions ? 'transactionTitle' : 'documentTitle') + ' *', 'cw-rec-title', 'text', record?.title || '', true);
    title.maxLength = 300; title.required = true;
    if (transactions) {
      options(add(t('direction') + ' *', 'cw-rec-direction', 'select'), TRANSACTION_DIRECTIONS.map(v => [v, t(v)]), data.direction || 'income');
      options(add(t('status'), 'cw-rec-status', 'select'), TRANSACTION_STATUSES.map(v => [v, t(v)]), record?.status || 'completed');
      const amount = add(t('amount') + ' *', 'cw-rec-amount', 'text', record?.amount != null ? normalizeAmountInput(record.amount) : '');
      amount.inputMode = 'decimal'; amount.required = true; amount.maxLength = 24;
      options(add(t('currency') + ' *', 'cw-rec-currency', 'select'), CURRENCIES.map(v => [v, v]), record?.currency || 'JPY');
      add(t('transactionDate'), 'cw-rec-date', 'date', record?.record_date ? String(record.record_date).slice(0, 10) : new Date().toISOString().slice(0, 10));
      add(t('category'), 'cw-rec-category', 'text', data.category || '').maxLength = 80;
    } else {
      options(add(t('documentType') + ' *', 'cw-rec-doctype', 'select'), DOCUMENT_TYPES.map(v => [v, t(v)]), data.document_type || 'quote');
      options(add(t('status'), 'cw-rec-status', 'select'), DOCUMENT_STATUSES.map(v => [v, t(v)]), record?.status || 'draft');
      add(t('documentNumber'), 'cw-rec-number', 'text', data.document_number || '').maxLength = 120;
      add(t('issueDate'), 'cw-rec-date', 'date', record?.record_date ? String(record.record_date).slice(0, 10) : '');
      add(t('dueDate'), 'cw-rec-due', 'date', record?.due_date ? String(record.due_date).slice(0, 10) : '');
    }
    const customer = add(t('customer'), 'cw-rec-customer', 'select');
    options(customer, [['', t('noCustomer')], ...state.customers.map(c => [c.id, c.title])], customerId || (record ? '' : currentFilters().customerId));
    const project = add(t('project'), 'cw-rec-project', 'select');
    options(project, projectChoices(customer.value), projectId);
    customer.addEventListener('change', () => { const selected = project.value; options(project, projectChoices(customer.value), selected); });
    const notes = add(t('notes'), 'cw-rec-notes', 'textarea', data.notes || '', true); notes.maxLength = 5000;
    $('cw-records-error').textContent = '';
    $('cw-records-editor').showModal(); title.focus();
  }
  function closeEditor() { $('cw-records-editor').close(); state.editing = null; }

  async function saveEditor(event) {
    event.preventDefault();
    const transactions = state.tab === 'transactions', error = $('cw-records-error'), save = $('cw-records-save');
    const title = $('cw-rec-title').value.trim();
    if (!title) { error.textContent = t('required'); return; }
    const customerId = $('cw-rec-customer').value, projectId = $('cw-rec-project').value;
    const project = state.projects.find(p => p.id === projectId);
    // A project always belongs to one customer; keep the pair consistent.
    const effectiveCustomerId = customerId || project?.parent_record_id || '';
    const businessType = state.customers.find(c => c.id === effectiveCustomerId)?.business_type || project?.business_type || null;
    const previous = state.editing?.data && typeof state.editing.data === 'object' ? state.editing.data : {};
    const relationData = { customer_id: effectiveCustomerId || null, project_id: projectId || null, project_title: projectId ? project?.title || '' : '' };
    const date = $('cw-rec-date').value;
    let payload;
    if (transactions) {
      const amountInput = $('cw-rec-amount').value.trim().replace(/,/g, '');
      if (!isValidAmountInput(amountInput)) { error.textContent = t('invalidAmount'); return; }
      payload = {
        record_type: 'transaction', title, business_type: businessType, status: $('cw-rec-status').value,
        amount: normalizeAmountInput(amountInput), currency: $('cw-rec-currency').value,
        record_date: date ? date + 'T00:00:00.000Z' : null,
        ...relationPayload(effectiveCustomerId, projectId),
        data: { ...previous, ...relationData, direction: $('cw-rec-direction').value, category: $('cw-rec-category').value.trim(), notes: $('cw-rec-notes').value.trim() }
      };
    } else {
      const due = $('cw-rec-due').value;
      payload = {
        record_type: 'document', title, business_type: businessType, status: $('cw-rec-status').value,
        record_date: date ? date + 'T00:00:00.000Z' : null, due_date: due ? due + 'T00:00:00.000Z' : null,
        ...relationPayload(effectiveCustomerId, projectId),
        data: { ...previous, ...relationData, document_type: $('cw-rec-doctype').value, document_number: $('cw-rec-number').value.trim(), notes: $('cw-rec-notes').value.trim() }
      };
    }
    save.disabled = true; error.textContent = '';
    try {
      const id = state.editing?.id;
      if (id) { const patch = { ...payload }; delete patch.record_type; await api('/records/' + encodeURIComponent(id), 'PATCH', patch); }
      else await api('/records', 'POST', payload);
      closeEditor();
      window.CompanyBusiness?.invalidateRelations?.();
      await load(); feedback(t('saved'), 'success');
    } catch (failure) { error.textContent = failure.message || t('failed'); }
    finally { save.disabled = false; }
  }

  async function removeRecord(record) {
    const transactions = state.tab === 'transactions';
    if ((state.filesByParent[record.id] || []).length) { feedback(t('hasAttachments'), 'error'); return; }
    if (!window.confirm(t(transactions ? 'confirmDeleteTransaction' : 'confirmDeleteDocument') + '\n' + record.title)) return;
    try {
      await api('/records/' + encodeURIComponent(record.id), 'DELETE');
      window.CompanyBusiness?.invalidateRelations?.();
      await load(); feedback(t('deleted'), 'success');
    } catch (failure) { feedback(failure.code === 'RECORD_IN_USE_OR_INVALID_RELATION' ? t('hasAttachments') : failure.message || t('failed'), 'error'); }
  }

  // --- Attachments --------------------------------------------------------
  function filesFeedback(message = '', kind = '') { const host = $('cw-files-feedback'); host.textContent = message; host.className = 'cw-feedback' + (kind ? ' ' + kind : ''); }
  function openAttachments(record) {
    state.attachmentsFor = record;
    $('cw-files-eyebrow').textContent = 'ATTACHMENTS';
    $('cw-files-title').textContent = t('attachmentsTitle') + ' · ' + record.title;
    $('cw-files-limit').textContent = t('attachmentLimit');
    $('cw-files-upload').textContent = t('upload');
    $('cw-files-input').setAttribute('aria-label', t('upload'));
    filesFeedback('');
    renderAttachments();
    $('cw-records-files').showModal();
    refreshAttachments();
  }
  async function refreshAttachments() {
    const record = state.attachmentsFor; if (!record) return;
    try {
      const result = await api('/files?' + new URLSearchParams({ parent_record_id: record.id }).toString());
      state.filesByParent[record.id] = groupFilesByParent(Array.isArray(result?.items) ? result.items : [])[record.id] || [];
      renderAttachments();
    } catch (failure) { filesFeedback(failure.message || t('failed'), 'error'); }
  }
  function renderAttachments() {
    const record = state.attachmentsFor, list = $('cw-files-list'); list.replaceChildren();
    if (!record) return;
    const files = state.filesByParent[record.id] || [];
    if (!files.length) { list.append(el('li', 'cw-files-empty', t('noAttachments'))); return; }
    files.forEach(file => {
      const info = file.data?.file || {};
      const item = el('li', 'cw-files-item');
      const text = el('div', 'cw-files-text');
      text.append(el('strong', '', info.fileName || file.title), el('small', '', formatFileSize(info.fileSize) + ' · ' + dateText(info.uploadedAt || file.created_at)));
      const actions = el('div', 'cw-card-actions');
      actions.append(btn(t('download'), 'secondary', () => downloadFile(file)), btn(t('delete'), 'cw-delete', () => deleteFile(file)));
      item.append(text, actions); list.append(item);
    });
  }
  async function uploadSelectedFile() {
    const record = state.attachmentsFor, input = $('cw-files-input'), file = input.files?.[0];
    if (!record || state.uploading) return;
    if (!file) { filesFeedback(t('chooseFile'), 'error'); return; }
    const check = validateUploadCandidate(file);
    if (!check.ok) { filesFeedback(t({ tooLarge: 'fileTooLarge', empty: 'fileEmpty', typeNotAllowed: 'fileTypeNotAllowed', nameInvalid: 'fileNameInvalid' }[check.error]), 'error'); return; }
    const a = auth(); if (!a) { filesFeedback(t('loginRequired'), 'error'); return; }
    state.uploading = true; $('cw-files-upload').disabled = true; filesFeedback(t('uploading'));
    const descriptor = { parent_record_id: record.id, file_name: check.name, mime_type: check.mimeType, file_size: check.size };
    try {
      const signed = await api('/files/upload-url', 'POST', descriptor);
      if (!signed?.upload_url || !signed?.path || !String(signed.upload_url).startsWith(PROJECT_URL + '/storage/v1/')) throw new Error(t('uploadFailed'));
      let response;
      try {
        // Signed upload URL: the one-time token in the URL authorizes this single object.
        response = await fetch(signed.upload_url, { method: 'PUT', headers: { apikey: a.key, 'Content-Type': check.mimeType, 'x-upsert': 'false' }, body: file, cache: 'no-store' });
      } catch { throw new Error(t('uploadFailed')); }
      if (!response.ok) throw new Error(response.status === 413 ? t('fileTooLarge') : t('uploadFailed'));
      await api('/files', 'POST', { ...descriptor, path: signed.path });
      input.value = '';
      await refreshAttachments();
      filesFeedback(t('uploaded'), 'success');
      render();
    } catch (failure) { filesFeedback(failure.message || t('uploadFailed'), 'error'); }
    finally { state.uploading = false; $('cw-files-upload').disabled = false; }
  }
  async function downloadFile(file) {
    try {
      const signed = await api('/files/' + encodeURIComponent(file.id) + '/download-url');
      if (!signed?.url || !String(signed.url).startsWith(PROJECT_URL + '/storage/v1/')) throw new Error(t('failed'));
      // The signed URL is a short-lived bearer credential: open it once, never store or log it.
      const link = document.createElement('a'); link.href = signed.url; link.rel = 'noopener'; link.target = '_blank';
      document.body.append(link); link.click(); link.remove();
    } catch (failure) { filesFeedback(failure.message || t('failed'), 'error'); }
  }
  async function deleteFile(file) {
    if (!window.confirm(t('confirmDeleteFile') + '\n' + (file.data?.file?.fileName || file.title))) return;
    try {
      await api('/files/' + encodeURIComponent(file.id), 'DELETE');
      await refreshAttachments(); filesFeedback(t('deleted'), 'success'); render();
    } catch (failure) { filesFeedback(failure.message || t('failed'), 'error'); }
  }

  function onTabChange(event) {
    const tab = event.detail?.tab;
    const panel = $('cw-records-panel'); if (!panel) return;
    if (!TABS.includes(tab)) { state.tab = ''; panel.hidden = true; return; }
    const changed = state.tab !== tab;
    state.tab = tab; panel.hidden = false;
    updateLabels();
    if (changed) { $('cw-records-list').replaceChildren(); renderSummary(null); }
    load();
  }
  function init() {
    if (!install()) return;
    window.addEventListener('company-business-tab-change', onTabChange);
    window.addEventListener('planner-language-change', () => { updateLabels(); if (state.tab) render(); });
    window.addEventListener('planner-auth-change', () => { state.customers = []; state.projects = []; state.transactions = []; state.documents = []; state.filesByParent = {}; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
  window.CompanyRecords = Object.freeze({ version: '1.0.0', reload: load, maxFileBytes: FILE_MAX_BYTES });
})();
