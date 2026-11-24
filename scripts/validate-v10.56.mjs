import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ALLOWED_FILE_MIME_TYPES, FILE_MAX_BYTES, filterDocuments, filterTransactions, formatAmountMicros,
  formatFileSize, groupFilesByParent, isValidAmountInput, normalizeAmountInput, parseAmountMicros,
  relationPayload, resolveFileMimeType, sortByBusinessDate, summarizeTransactions, validateUploadCandidate
} from '../company-records-rules.js';

// --- Upload candidate rules --------------------------------------------------
assert.equal(FILE_MAX_BYTES, 10 * 1024 * 1024);
assert.equal(resolveFileMimeType('report.csv', 'application/vnd.ms-excel'), 'text/csv', 'extension wins over Windows CSV type');
assert.equal(resolveFileMimeType('scan.JPG', ''), 'image/jpeg');
assert.equal(resolveFileMimeType('noext', 'application/pdf'), 'application/pdf');
assert.equal(resolveFileMimeType('tool.exe', 'application/x-msdownload'), '');
assert.equal(resolveFileMimeType('page.html', 'text/html'), '');
assert.deepEqual(validateUploadCandidate({ name: 'quote.pdf', size: 2048, type: 'application/pdf' }), { ok: true, mimeType: 'application/pdf', name: 'quote.pdf', size: 2048 });
assert.equal(validateUploadCandidate({ name: 'big.pdf', size: FILE_MAX_BYTES + 1, type: 'application/pdf' }).error, 'tooLarge');
assert.equal(validateUploadCandidate({ name: 'exact.pdf', size: FILE_MAX_BYTES, type: 'application/pdf' }).ok, true);
assert.equal(validateUploadCandidate({ name: 'empty.pdf', size: 0, type: 'application/pdf' }).error, 'empty');
assert.equal(validateUploadCandidate({ name: 'run.sh', size: 10, type: 'text/x-sh' }).error, 'typeNotAllowed');
assert.equal(validateUploadCandidate({ name: 'a/b.pdf', size: 10, type: 'application/pdf' }).error, 'nameInvalid');
assert.equal(formatFileSize(512), '512 B');
assert.equal(formatFileSize(1536), '1.5 KB');
assert.equal(formatFileSize(10 * 1024 * 1024), '10 MB');

// --- Exact amounts and per-currency totals -----------------------------------
assert.equal(parseAmountMicros('1200.000000'), 1200000000n);
assert.equal(parseAmountMicros('0.1'), 100000n);
assert.equal(parseAmountMicros('1.1234567'), null, 'more than 6 significant decimals rejected');
assert.equal(parseAmountMicros('abc'), null);
assert.equal(isValidAmountInput('0'), false);
assert.equal(isValidAmountInput('-5'), false);
assert.equal(isValidAmountInput('99999999999999.999999'), true);
assert.equal(isValidAmountInput('100000000000000'), false);
assert.equal(normalizeAmountInput('1200.500000'), '1200.5');
assert.equal(normalizeAmountInput('3000'), '3000');
assert.equal(formatAmountMicros(1234567000000n, 'JPY'), '1,234,567');
assert.equal(formatAmountMicros(1234567500000n, 'JPY'), '1,234,567.5', 'non-zero yen fractions are not hidden');
assert.equal(formatAmountMicros(100000n, 'USD'), '0.10');
assert.equal(formatAmountMicros(-2500000n, 'CNY'), '-2.50');

const transactions = [
  { id: 't1', status: 'completed', amount: '0.1', currency: 'USD', record_date: '2026-11-02T00:00:00Z', data: { direction: 'income', customer_id: 'c1', category: 'Service fee' } },
  { id: 't2', status: 'completed', amount: '0.2', currency: 'USD', record_date: '2026-11-05T00:00:00Z', data: { direction: 'income', customer_id: 'c1', project_id: 'p1' } },
  { id: 't3', status: 'completed', amount: '50000', currency: 'JPY', record_date: '2026-11-03T00:00:00Z', data: { direction: 'expense', notes: 'Purchase stock' } },
  { id: 't4', status: 'planned', amount: '10000', currency: 'JPY', record_date: '2026-12-01T00:00:00Z', data: { direction: 'income', customer_id: 'c2' } },
  { id: 't5', status: 'cancelled', amount: '999', currency: 'JPY', record_date: '2026-11-04T00:00:00Z', data: { direction: 'income' } },
  { id: 't6', status: 'completed', amount: '80', currency: 'CNY', record_date: '2026-10-20T00:00:00Z', data: { direction: 'expense' } }
];
const summary = summarizeTransactions(transactions);
assert.deepEqual(summary.map(row => row.currency), ['JPY', 'CNY', 'USD'], 'fixed currency order, no cross-currency total');
const usd = summary.find(row => row.currency === 'USD');
assert.equal(usd.income, 300000n, '0.1 + 0.2 is exactly 0.3');
assert.equal(formatAmountMicros(usd.net, 'USD'), '0.30');
const jpy = summary.find(row => row.currency === 'JPY');
assert.equal(jpy.income, 0n, 'planned and cancelled excluded from completed income');
assert.equal(jpy.expense, 50000000000n);
assert.equal(jpy.plannedIncome, 10000000000n);
assert.equal(jpy.net, -50000000000n);
assert.equal(jpy.completedCount, 1);
assert.equal(jpy.plannedCount, 1);
assert.deepEqual(summarizeTransactions([]), []);

assert.deepEqual(filterTransactions(transactions, { customerId: 'c1' }).map(r => r.id), ['t1', 't2']);
assert.deepEqual(filterTransactions(transactions, { currency: 'JPY', direction: 'income' }).map(r => r.id), ['t4', 't5']);
assert.deepEqual(filterTransactions(transactions, { query: 'purchase' }).map(r => r.id), ['t3']);
assert.deepEqual(filterTransactions(transactions, { from: '2026-11-01', to: '2026-11-04' }).map(r => r.id), ['t1', 't3', 't5']);
assert.deepEqual(filterTransactions(transactions, { projectId: 'p1' }).map(r => r.id), ['t2']);
assert.deepEqual(sortByBusinessDate(transactions).map(r => r.id), ['t4', 't2', 't5', 't3', 't1', 't6']);

const documents = [
  { id: 'd1', title: 'Website contract', status: 'issued', data: { document_type: 'contract', document_number: 'C-001', customer_id: 'c1' } },
  { id: 'd2', title: 'November invoice', status: 'draft', data: { document_type: 'invoice', document_number: 'INV-11' } }
];
assert.deepEqual(filterDocuments(documents, { query: 'inv-11' }).map(r => r.id), ['d2']);
assert.deepEqual(filterDocuments(documents, { documentType: 'contract', customerId: 'c1' }).map(r => r.id), ['d1']);
assert.deepEqual(filterDocuments(documents, { status: 'void' }), []);

assert.deepEqual(relationPayload('c1', 'p1'), { parent_record_id: 'p1', related_record_ids: ['c1'] });
assert.deepEqual(relationPayload('c1', ''), { parent_record_id: 'c1', related_record_ids: [] });
assert.deepEqual(relationPayload('', ''), { parent_record_id: null, related_record_ids: [] });

const grouped = groupFilesByParent([
  { id: 'f1', record_type: 'file', parent_record_id: 'd1', created_at: '2026-11-01' },
  { id: 'f2', record_type: 'file', parent_record_id: 'd1', created_at: '2026-11-03' },
  { id: 'x', record_type: 'document', parent_record_id: 'd1' }
]);
assert.deepEqual(grouped.d1.map(f => f.id), ['f2', 'f1']);

// --- Static contracts: Storage migration, Edge Function, frontend wiring -------
const migration = fs.readFileSync('supabase/migrations/20261121090000_company_documents_storage_stage_3a.sql', 'utf8');
assert.match(migration, /'company-documents',\s*'company-documents',\s*false,\s*10485760/, 'private 10 MB bucket');
assert.doesNotMatch(migration, /create policy/i, 'no client Storage policies: service role only');
for (const mime of ALLOWED_FILE_MIME_TYPES) assert.ok(migration.includes("'" + mime + "'"), 'bucket allows ' + mime);

const api = fs.readFileSync('supabase/functions/company-api/index.ts', 'utf8');
for (const mime of ALLOWED_FILE_MIME_TYPES) assert.ok(api.includes('"' + mime + '"'), 'company-api allows ' + mime);
assert.match(api, /const FILE_BUCKET = "company-documents"/);
assert.match(api, /const MAX_FILE_BYTES = 10 \* 1024 \* 1024/);
assert.match(api, /const SIGNED_DOWNLOAD_SECONDS = 300/);
assert.match(api, /route === "\/files\/upload-url" && req\.method === "POST"/);
assert.match(api, /route === "\/files" && req\.method === "POST"/);
assert.match(api, /route === "\/files" && req\.method === "GET"/);
assert.match(api, /download-url\$\/i/);
assert.match(api, /fileMatch && req\.method === "DELETE"/);
assert.match(api, /record_type === "file"\) throw new ApiError\(400, "FILE_ENDPOINT_REQUIRED"\)/, 'generic /records cannot create file metadata');
assert.equal((api.match(/FILE_ENDPOINT_REQUIRED/g) || []).length, 3, 'file records blocked on create, patch and delete via /records');
assert.match(api, /parentId\.toLowerCase\(\) \+ "\/" \+ crypto\.randomUUID\(\)/, 'server-generated object path');
assert.match(api, /await removeStoredObject\(path, requestId\);\s*throw error;/, 'orphan cleanup when metadata insert fails');
assert.match(api, /if \(!await removeStoredObject\(info\.path, requestId\)\) throw new ApiError\(502, "STORAGE_DELETE_FAILED"\)/, 'metadata kept when Storage delete fails');
assert.match(api, /validateTransactionFields\(body, true\)/);
assert.match(api, /validateDocumentFields\(body, true\)/);
assert.match(api, /existing\.record_type === "transaction"\) validateTransactionFields\(patch, false\)/);
assert.doesNotMatch(api, /getPublicUrl|\/object\/public\//, 'no public file URLs');

const ui = fs.readFileSync('company-records-workspace.js', 'utf8');
assert.doesNotMatch(ui, /localStorage|sessionStorage|indexedDB/i, 'company records and signed URLs are never persisted in the browser');
assert.doesNotMatch(ui, /console\.(log|info|debug)\([^)]*signed/i, 'signed URLs are not logged');
assert.match(ui, /startsWith\(PROJECT_URL \+ '\/storage\/v1\/'\)/, 'only follow signed URLs from the company Supabase project');
assert.doesNotMatch(ui, /service_role|SUPABASE_SERVICE_ROLE_KEY/);
for (const lang of ['zh:', 'en:', 'ja:']) assert.ok(ui.includes(lang), 'UI dictionary ' + lang);

const business = fs.readFileSync('company-business.js', 'utf8');
assert.match(business, /company-business-tab-change/);
assert.match(business, /if \(!\['projects','tasks','followups'\]\.includes\(state\.tab\)\) return;/);
assert.match(business, /button:not\(\[data-company-extension\]\)/);

const html = fs.readFileSync('index.html', 'utf8');
assert.ok(html.indexOf('company-business.js') < html.indexOf('company-records-workspace.js'), 'records module loads after company-business');
assert.match(html, /APP_VERSION='V10.(?:58_company_complete_reads|59_company_entity_attachments|60_company_monthly_cashflow|61_company_status_history|62_business_activity_history)'/);
const sw = fs.readFileSync('sw.js', 'utf8');
assert.match(sw, /daily-weekly-planner-v10-(?:58-|59-|60-)/);
assert.ok(sw.includes("'./company-records-rules.js'") && sw.includes("'./company-records-workspace.js'"));
assert.ok(['10.58.0', '10.59.0', '10.60.0'].includes(fs.readFileSync('VERSION', 'utf8').trim()));

console.log('V10.56 company transactions, documents and attachments validation passed.');
