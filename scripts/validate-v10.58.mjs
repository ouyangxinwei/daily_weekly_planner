// V10.58: complete company record reads, shared cache and rate-limit handling.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fetchCompleteList, createRecordCache, IncompleteDataError } from '../company-record-loader.js';
import { isOverdueProject, getProjectCustomerOverview } from '../company-project-customer-overview.js';
import { collectAllPages, IncompleteListError } from '../supabase/functions/company-api/list-all.ts';
import { isValidTransactionAmount, matchesFileSignature } from '../supabase/functions/company-api/validation.ts';

function makeRecords(count, type = 'task') {
  return Array.from({ length: count }, (_, index) => ({ id: type + '-' + index, record_type: type }));
}

// Fake company-api list endpoint. `tamper(page, offset)` may alter a page.
function fakeApi(records, tamper = (page) => page) {
  const calls = [];
  const request = async (path) => {
    calls.push(path);
    const url = new URL('https://example.test' + path);
    const limit = Number(url.searchParams.get('limit'));
    const offset = Number(url.searchParams.get('offset'));
    assert.ok(limit >= 1 && limit <= 100, 'limit must stay within the API range');
    const page = { items: records.slice(offset, offset + limit), total: records.length, limit, offset };
    return tamper(page, offset);
  };
  return { request, calls };
}

async function rejectsIncomplete(promise, reason) {
  await assert.rejects(promise, error => error instanceof IncompleteDataError && error.code === 'INCOMPLETE_DATA' && error.reason === reason);
}

// --- complete reads -----------------------------------------------------------
for (const count of [0, 1, 99, 100, 101, 250, 10001]) {
  const { request, calls } = fakeApi(makeRecords(count));
  const items = await fetchCompleteList(request, '/records?record_type=task', { label: 'tasks' });
  assert.equal(items.length, count, 'reads every record: ' + count);
  assert.equal(new Set(items.map(item => item.id)).size, count, 'no duplicates: ' + count);
  assert.equal(calls.length, Math.max(1, Math.ceil(count / 100)), 'one request per page: ' + count);
  assert.ok(calls.every(path => path.startsWith('/records?record_type=task&limit=100&offset=')));
}

// More than 10,000 records are no longer truncated (old fetchAllRecords default).
{
  const { request } = fakeApi(makeRecords(10250));
  assert.equal((await fetchCompleteList(request, '/records?record_type=task')).length, 10250);
}

// --- incomplete reads are errors, never partial data ------------------------------
await rejectsIncomplete(fetchCompleteList(fakeApi(makeRecords(250), (page, offset) => offset === 100 ? { ...page, items: [] } : page).request, '/records?record_type=task'), 'empty-page');
await rejectsIncomplete(fetchCompleteList(fakeApi(makeRecords(250), (page, offset) => offset === 100 ? { ...page, items: page.items.slice(0, 40) } : page).request, '/records?record_type=task'), 'short-page');
await rejectsIncomplete(fetchCompleteList(fakeApi(makeRecords(250), (page, offset) => offset === 100 ? { ...page, total: 251 } : page).request, '/records?record_type=task'), 'total-changed');
await rejectsIncomplete(fetchCompleteList(fakeApi(makeRecords(10), page => ({ ...page, total: 'x' })).request, '/records?record_type=task'), 'invalid-total');
await rejectsIncomplete(fetchCompleteList(fakeApi(makeRecords(10), page => ({ ...page, total: null })).request, '/records?record_type=task'), 'invalid-total');
await rejectsIncomplete(fetchCompleteList(fakeApi(makeRecords(10), page => ({ ...page, items: null })).request, '/records?record_type=task'), 'invalid-page');
await rejectsIncomplete(fetchCompleteList(fakeApi(makeRecords(150), (page, offset) => offset === 100 ? { ...page, items: [...page.items, ...makeRecords(5, 'extra')] } : page).request, '/records?record_type=task'), 'count-mismatch');
await rejectsIncomplete(fetchCompleteList(fakeApi(makeRecords(250)).request, '/records?record_type=task', { maxOffset: 150 }), 'offset-limit');

// API errors (for example 429 RATE_LIMITED) are passed through unchanged.
{
  const rateLimited = Object.assign(new Error('Too many requests'), { code: 'RATE_LIMITED' });
  await assert.rejects(fetchCompleteList(async () => { throw rateLimited; }, '/records?record_type=task'), error => error === rateLimited);
}

// --- cache ------------------------------------------------------------------------
{
  let clock = 1000;
  const { request, calls } = fakeApi(makeRecords(150));
  const cache = createRecordCache({ request, now: () => clock });
  const path = '/records?record_type=task';

  // Concurrent identical reads share one request sequence.
  const [a, b] = await Promise.all([cache.load(path, { maxAgeMs: 0 }), cache.load(path, { maxAgeMs: 0 })]);
  assert.equal(a.length, 150); assert.equal(b.length, 150);
  assert.equal(calls.length, 2, 'two pages read once for concurrent callers');
  assert.notEqual(a, b, 'callers receive their own array copies');
  a.length = 0;

  // Reused while younger than maxAgeMs; callers cannot corrupt the cached list.
  clock += 10000;
  assert.equal((await cache.load(path, { maxAgeMs: 15000 })).length, 150);
  assert.equal(calls.length, 2, 'cached read issues no request');

  // Older than maxAgeMs → read again.
  clock += 6000;
  await cache.load(path, { maxAgeMs: 15000 });
  assert.equal(calls.length, 4, 'stale read issues new requests');

  // maxAgeMs 0 (refresh) always reads again once the previous read finished.
  await cache.load(path, { maxAgeMs: 0 });
  assert.equal(calls.length, 6);

  // invalidate() after a write forces the next read.
  cache.invalidate();
  assert.equal(cache.size, 0);
  await cache.load(path, { maxAgeMs: 60000 });
  assert.equal(calls.length, 8);

  // Different paths (type, q, status) are cached separately.
  await cache.load('/records?record_type=task&status=completed', { maxAgeMs: 60000 });
  assert.equal(calls.length, 10);
}

// Failed reads are not cached.
{
  let fail = true;
  const { request: inner } = fakeApi(makeRecords(5));
  let requests = 0;
  const cache = createRecordCache({ request: async path => { requests += 1; if (fail) throw new Error('network'); return inner(path); } });
  await assert.rejects(cache.load('/records?record_type=task', { maxAgeMs: 60000 }));
  fail = false;
  assert.equal((await cache.load('/records?record_type=task', { maxAgeMs: 60000 })).length, 5);
  assert.equal(requests, 2);
}

// --- front-end wiring (static contract) --------------------------------------------
const business = fs.readFileSync('company-business.js', 'utf8');
assert.match(business, /import \{ createRecordCache \} from '\.\/company-record-loader\.js';/);
assert.doesNotMatch(business, /fetchAllRecords/, 'the unchecked reader is removed');
assert.doesNotMatch(business, /\.map\(fetch/, 'no Array.map with a reader whose second parameter is a limit');
assert.doesNotMatch(business, /limit=100&offset=0/, 'customers and projects are no longer read from the first page only');
assert.doesNotMatch(business, /MAX_SAFE_INTEGER/);
assert.match(business, /const ENTRY_MAX_AGE_MS = 15000;/);
assert.match(business, /const LOOKUP_MAX_AGE_MS = 60000;/);
assert.match(business, /function invalidateRelations\(\)\{state\.relationshipRecords=null;recordCache\.invalidate\(\);\}/);
assert.match(business, /const allTasks = await loadRecords\('task', maxAgeMs\);/);
assert.match(business, /const all = await loadRecords\(type, maxAgeMs, \{ q:query, status \}\);/);
assert.match(business, /rateLimited:'请求过于频繁/);
assert.match(business, /rateLimited:'Too many requests/);
assert.match(business, /rateLimited:'リクエストが多すぎます/);
assert.match(business, /response\.status === 429 \|\| payload\.error === 'RATE_LIMITED'/);
for (const refresh of ['loadOverview(0)', 'loadTodoCenter(0)', 'loadProjectCustomerOverview(0)', 'loadBusinessTrends(0)', 'loadActive({ force:true })']) {
  assert.ok(business.includes(refresh), 'refresh button forces a new read: ' + refresh);
}
assert.match(business, /summary\.failed=true/);
assert.match(business, /loadRecords:\(type, maxAgeMs\) => loadRecords\(type, maxAgeMs\)/);

const website = fs.readFileSync('company-website.js', 'utf8');
assert.match(website, /relations\.failed\?'—':String\(relations\[key\]\?\.length\|\|0\)/);
assert.match(website, /relationLoadFailed:\{zh:/);

const workspace = fs.readFileSync('company-records-workspace.js', 'utf8');
assert.match(workspace, /if \(all\.length !== expected\) throw new Error\(t\('failed'\)\);/);
assert.match(workspace, /if \(page\.length < 100\) throw new Error\(t\('failed'\)\);/);
assert.match(workspace, /const customers = await fetchShared\('customer'\);/);

// --- company-api internal scans (list-all.ts) ---------------------------------------
{
  const rows = makeRecords(250);
  const pageOf = (tamper = p => p) => async (offset, limit) => tamper({ items: rows.slice(offset, offset + limit), total: rows.length }, offset);
  assert.equal((await collectAllPages(pageOf())).length, 250);
  assert.equal((await collectAllPages(async () => ({ items: [], total: 0 }))).length, 0);
  const rejectsList = (fn, reason) => assert.rejects(collectAllPages(fn), e => e instanceof IncompleteListError && e.reason === reason);
  await rejectsList(pageOf((p, o) => o === 100 ? { ...p, items: [] } : p), 'empty-page');
  await rejectsList(pageOf((p, o) => o === 100 ? { ...p, items: p.items.slice(0, 10) } : p), 'short-page');
  await rejectsList(pageOf((p, o) => o === 100 ? { ...p, total: 300 } : p), 'total-changed');
  await rejectsList(pageOf(p => ({ ...p, total: null })), 'invalid-total');
}
const edge = fs.readFileSync('supabase/functions/company-api/index.ts', 'utf8');
assert.match(edge, /import \{ collectAllPages, IncompleteListError, type ListPage \} from "\.\/list-all\.ts";/);
assert.doesNotMatch(edge, /scanOffset/, 'listProjectTasks no longer advances blindly by page size');
assert.doesNotMatch(edge, /if \(!pageItems\.length\) break;/, 'listRecordFiles no longer stops silently on an empty page');
assert.equal((edge.match(/await listAllRecords\(auth, \{/g) || []).length, 2, 'both internal scans use listAllRecords');
assert.match(edge, /throw new ApiError\(503, "LIST_INCOMPLETE"\)/);
assert.match(business, /payload\.error === 'LIST_INCOMPLETE' \? t\('incompleteData'\)/);

// --- 2-C overdue projects and labels ---------------------------------------------------
{
  const today = '2026-11-22';
  assert.equal(isOverdueProject({ status: 'active', due_date: '2026-11-21' }, today), true);
  assert.equal(isOverdueProject({ status: 'planned', due_date: '2026-11-21T09:00:00Z' }, today), true);
  assert.equal(isOverdueProject({ status: 'active', due_date: '2026-11-22' }, today), false, 'due today is not overdue');
  assert.equal(isOverdueProject({ status: 'completed', due_date: '2026-11-01' }, today), false);
  assert.equal(isOverdueProject({ status: 'cancelled', due_date: '2026-11-01' }, today), false);
  assert.equal(isOverdueProject({ status: 'active', due_date: null }, today), false);
  assert.equal(isOverdueProject({ status: 'active', due_date: 'bad' }, today), false);
  const projects = [{ id: 'a', status: 'active', due_date: '2026-11-01' }, { id: 'b', status: 'on_hold', due_date: '2026-11-20' }, { id: 'c', status: 'completed', due_date: '2026-11-01' }, { id: 'd', status: 'active', due_date: '2026-12-01' }];
  assert.equal(getProjectCustomerOverview({ projects }, today).overdueProjects, projects.filter(p => isOverdueProject(p, today)).length, 'KPI and list filter share one rule');
}
assert.match(business, /\['pcOverdueProjects',metrics\.overdueProjects,\(\)=>\{state\.projectStatus='';state\.projectDueFilter='overdue';/);
assert.match(business, /if \(state\.projectDueFilter === 'overdue'\) return isOverdueProject\(record, getLocalDateKey\(\)\);/);
assert.match(business, /const relationFiltered = \(project && \(state\.projectCustomerFilter \|\| state\.projectDueFilter\)\)/);
assert.match(business, /t\('relatedFollowupCount'\)\+': '\+row\.followupCount/);
for (const label of ["relatedFollowupCount:'关联跟进'", "relatedFollowupCount:'Follow-ups'", "relatedFollowupCount:'関連フォロー'"]) assert.ok(business.includes(label), label);

// --- 3-A server checks (validation.ts) ------------------------------------------------
for (const ok of ['1', '0.1', '0.000001', '123.456789', '99999999999999.999999', 0.1, 50000, ' 12.5 ']) assert.equal(isValidTransactionAmount(ok), true, 'valid amount ' + JSON.stringify(ok));
for (const bad of ['0', '0.000000', '-1', '1.0000001', '0.1234567', '100000000000000', '1e3', '1,000', '', 'abc', 1e-7, 1e21, -5, 0, NaN, Infinity, null, undefined, {}]) assert.equal(isValidTransactionAmount(bad), false, 'invalid amount ' + JSON.stringify(bad));
const bytes = (...parts) => Uint8Array.from(parts.flatMap(part => typeof part === 'string' ? Array.from(part, c => c.charCodeAt(0)) : part));
const PDF = bytes('%PDF-1.7'), PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]), JPG = bytes([0xff, 0xd8, 0xff, 0xe0]), WEBP = bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 ');
const ZIP = bytes([0x50, 0x4b, 0x03, 0x04, 0x14, 0]), OLE = bytes([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), RTF = bytes('{', [0x5c], 'rtf1'), EXE = bytes('MZ', [0x90, 0, 3, 0]), TEXT = bytes('name,amount;');
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const accepted = [['application/pdf', PDF], ['image/png', PNG], ['image/jpeg', JPG], ['image/webp', WEBP], ['image/jpeg', PNG], ['text/plain', TEXT], ['text/csv', TEXT],
  [DOCX, ZIP], [XLSX, ZIP], [PPTX, ZIP], ['application/msword', OLE], ['application/msword', RTF], ['application/vnd.ms-excel', OLE], ['application/vnd.ms-excel', TEXT], ['application/vnd.ms-powerpoint', OLE]];
for (const [mime, content] of accepted) assert.equal(matchesFileSignature(mime, content), true, 'accepts ' + mime);
const rejected = [['application/pdf', EXE], ['application/pdf', bytes('')], ['image/png', PDF], ['text/plain', EXE], ['text/csv', bytes('')], [DOCX, OLE], [DOCX, EXE], ['application/msword', ZIP], ['application/vnd.ms-powerpoint', TEXT], ['application/x-msdownload', EXE]];
for (const [mime, content] of rejected) assert.equal(matchesFileSignature(mime, content), false, 'rejects ' + mime);

assert.match(edge, /import \{ isValidTransactionAmount, matchesFileSignature, SIGNATURE_BYTES \} from "\.\/validation\.ts";/);
assert.match(edge, /if \(!isValidTransactionAmount\(body\.amount\)\) \{/);
assert.doesNotMatch(edge, /MAX_TRANSACTION_AMOUNT/);
assert.match(edge, /"\/storage\/v1\/object\/authenticated\/" \+ FILE_BUCKET/);
assert.match(edge, /if \(!matchesFileSignature\(String\(body\.mime_type\), prefix\)\) \{\s*await removeStoredObject\(path, requestId\);\s*throw new ApiError\(400, "FILE_CONTENT_MISMATCH"\);/);
assert.match(edge, /route === "\/files\/abort" && req\.method === "POST"/);
assert.match(edge, /if \(referenced\) return \{ removed: false, reason: "IN_USE" \};/, 'abort never removes an object that metadata references');
assert.match(workspace, /await api\('\/files\/abort', 'POST', \{ parent_record_id: record\.id, path: signed\.path \}\)/);
assert.match(workspace, /FILE_CONTENT_MISMATCH: 'fileContentMismatch'/);
for (const label of ["fileContentMismatch: '文件内容与文件类型不符", "fileContentMismatch: 'The file content does not match", "fileContentMismatch: 'ファイルの内容が"]) assert.ok(workspace.includes(label), label);

// --- version and service worker ---------------------------------------------------
const html = fs.readFileSync('index.html', 'utf8');
assert.match(html, /APP_VERSION='V10.(?:58_company_complete_reads|59_company_entity_attachments)'/);
const sw = fs.readFileSync('sw.js', 'utf8');
assert.match(sw, /daily-weekly-planner-v10-(?:58-company-complete-reads|59-company-entity-attachments)/);
assert.ok(sw.includes("'./company-record-loader.js'"), 'service worker caches the loader module');
assert.equal(fs.readFileSync('VERSION', 'utf8').trim(), '10.58.0');
assert.equal(JSON.parse(fs.readFileSync('package.json', 'utf8')).version, '10.58.0');

console.log('V10.58 complete company reads, cache and rate-limit validation passed.');
