// Stage 3-A pure rules for company transactions, business documents and private
// attachments. No DOM or network access so that Node validation can import it.

export const FILE_MAX_BYTES = 10 * 1024 * 1024;

// Extension → MIME. Must stay a subset of the company-api allow-list and the
// `company-documents` bucket allowed_mime_types.
export const FILE_TYPES_BY_EXTENSION = Object.freeze({
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  txt: 'text/plain',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
});
export const ALLOWED_FILE_MIME_TYPES = Object.freeze([...new Set(Object.values(FILE_TYPES_BY_EXTENSION))]);
export const FILE_ACCEPT_ATTRIBUTE = Object.keys(FILE_TYPES_BY_EXTENSION).map(ext => '.' + ext).join(',');

export const TRANSACTION_DIRECTIONS = Object.freeze(['income', 'expense']);
export const TRANSACTION_STATUSES = Object.freeze(['planned', 'completed', 'cancelled']);
export const CURRENCIES = Object.freeze(['JPY', 'CNY', 'USD']);
export const DOCUMENT_TYPES = Object.freeze(['quote', 'contract', 'invoice', 'order', 'receipt', 'other']);
export const DOCUMENT_STATUSES = Object.freeze(['draft', 'issued', 'completed', 'void']);

export function fileExtension(name) {
  const match = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  return match ? match[1].toLowerCase() : '';
}

// Browsers report some types inconsistently (Windows reports .csv as
// application/vnd.ms-excel, some files have an empty type). The extension wins
// when it is known so the declared type, the Storage content type and the
// server-side verification always agree.
export function resolveFileMimeType(name, browserType) {
  const byExtension = FILE_TYPES_BY_EXTENSION[fileExtension(name)];
  if (byExtension) return byExtension;
  return ALLOWED_FILE_MIME_TYPES.includes(browserType) ? browserType : '';
}

export function validateUploadCandidate(file) {
  const name = String(file?.name || '');
  const size = Number(file?.size);
  if (!name.trim() || name.length > 255 || /[\\/\u0000-\u001f]/.test(name)) return { ok: false, error: 'nameInvalid' };
  if (!Number.isInteger(size) || size < 1) return { ok: false, error: 'empty' };
  if (size > FILE_MAX_BYTES) return { ok: false, error: 'tooLarge' };
  const mimeType = resolveFileMimeType(name, file?.type);
  if (!mimeType) return { ok: false, error: 'typeNotAllowed' };
  return { ok: true, mimeType, name, size };
}

export function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return '—';
  if (value < 1024) return value + ' B';
  if (value < 1024 * 1024) return (value / 1024).toFixed(1).replace(/\.0$/, '') + ' KB';
  return (value / (1024 * 1024)).toFixed(1).replace(/\.0$/, '') + ' MB';
}

// --- Exact decimal arithmetic -------------------------------------------------
// Amounts are NUMERIC(20,6) in the database and arrive as strings. Sum them as
// integer micro-units so totals never suffer from floating point drift.
const SCALE = 6;
export function parseAmountMicros(value) {
  const text = String(value ?? '').trim();
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return null;
  const fraction = (match[3] || '').padEnd(SCALE, '0');
  if (fraction.length > SCALE && /[1-9]/.test(fraction.slice(SCALE))) return null;
  const micros = BigInt(match[2]) * 1000000n + BigInt(fraction.slice(0, SCALE) || '0');
  return match[1] ? -micros : micros;
}

export function formatAmountMicros(micros, currency) {
  const negative = micros < 0n;
  const absolute = negative ? -micros : micros;
  const whole = absolute / 1000000n;
  const fraction = (absolute % 1000000n).toString().padStart(SCALE, '0');
  const decimals = currency === 'JPY' ? 0 : 2;
  let fractionText = fraction.slice(0, decimals);
  const extra = fraction.slice(decimals).replace(/0+$/, '');
  if (extra) fractionText = fraction.replace(/0+$/, '');
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (negative ? '-' : '') + grouped + (fractionText ? '.' + fractionText : '');
}

export function isValidAmountInput(value) {
  const micros = parseAmountMicros(value);
  return micros !== null && micros > 0n && micros < 100000000000000n * 1000000n;
}

export function normalizeAmountInput(value) {
  const micros = parseAmountMicros(value);
  if (micros === null) return null;
  const whole = micros / 1000000n;
  const fraction = (micros % 1000000n).toString().padStart(SCALE, '0').replace(/0+$/, '');
  return whole.toString() + (fraction ? '.' + fraction : '');
}

// Totals are kept per currency: JPY/CNY/USD are never added together and no
// exchange rate is applied.
export function summarizeTransactions(records) {
  const byCurrency = {};
  for (const record of Array.isArray(records) ? records : []) {
    const currency = CURRENCIES.includes(record?.currency) ? record.currency : null;
    const micros = parseAmountMicros(record?.amount);
    const direction = record?.data?.direction;
    if (!currency || micros === null || !TRANSACTION_DIRECTIONS.includes(direction)) continue;
    const bucket = byCurrency[currency] || (byCurrency[currency] = {
      currency, income: 0n, expense: 0n, plannedIncome: 0n, plannedExpense: 0n, completedCount: 0, plannedCount: 0
    });
    if (record.status === 'completed') {
      bucket[direction] += micros;
      bucket.completedCount += 1;
    } else if (record.status === 'planned') {
      bucket[direction === 'income' ? 'plannedIncome' : 'plannedExpense'] += micros;
      bucket.plannedCount += 1;
    }
  }
  return CURRENCIES.filter(code => byCurrency[code]).map(code => {
    const bucket = byCurrency[code];
    return { ...bucket, net: bucket.income - bucket.expense };
  });
}

export function recordRelations(record) {
  const data = record?.data && typeof record.data === 'object' ? record.data : {};
  return { customerId: data.customer_id || '', projectId: data.project_id || '' };
}

// Same relation pattern as follow-ups: the most specific record is the parent so
// that the database blocks deleting a customer/project still referenced here.
export function relationPayload(customerId, projectId) {
  return {
    parent_record_id: projectId || customerId || null,
    related_record_ids: projectId && customerId ? [customerId] : []
  };
}

function dateKey(value) {
  const text = String(value || '');
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : '';
}

function textMatches(record, query, extraFields) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const data = record?.data && typeof record.data === 'object' ? record.data : {};
  return [record?.title, ...extraFields.map(key => data[key])].some(value => String(value || '').toLowerCase().includes(q));
}

export function filterTransactions(records, filters = {}) {
  return (Array.isArray(records) ? records : []).filter(record => {
    const relations = recordRelations(record);
    const day = dateKey(record.record_date);
    if (!textMatches(record, filters.query, ['category', 'notes'])) return false;
    if (filters.direction && record?.data?.direction !== filters.direction) return false;
    if (filters.status && record.status !== filters.status) return false;
    if (filters.currency && record.currency !== filters.currency) return false;
    if (filters.customerId && relations.customerId !== filters.customerId) return false;
    if (filters.projectId && relations.projectId !== filters.projectId) return false;
    if (filters.from && (!day || day < filters.from)) return false;
    if (filters.to && (!day || day > filters.to)) return false;
    return true;
  });
}

export function filterDocuments(records, filters = {}) {
  return (Array.isArray(records) ? records : []).filter(record => {
    const relations = recordRelations(record);
    if (!textMatches(record, filters.query, ['document_number', 'notes'])) return false;
    if (filters.documentType && record?.data?.document_type !== filters.documentType) return false;
    if (filters.status && record.status !== filters.status) return false;
    if (filters.customerId && relations.customerId !== filters.customerId) return false;
    if (filters.projectId && relations.projectId !== filters.projectId) return false;
    return true;
  });
}

function sortTime(record) {
  const time = Date.parse(record?.record_date || record?.updated_at || record?.created_at || '');
  return Number.isFinite(time) ? time : 0;
}

export function sortByBusinessDate(records) {
  return [...(Array.isArray(records) ? records : [])].sort((a, b) =>
    sortTime(b) - sortTime(a) || String(b?.updated_at || '').localeCompare(String(a?.updated_at || '')) || String(a?.id || '').localeCompare(String(b?.id || '')));
}

export function groupFilesByParent(files) {
  const groups = {};
  for (const file of Array.isArray(files) ? files : []) {
    if (file?.record_type !== 'file' || !file.parent_record_id) continue;
    (groups[file.parent_record_id] ||= []).push(file);
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }
  return groups;
}
