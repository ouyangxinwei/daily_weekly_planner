import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

// V10.56 Stage 3-A: transactions, business documents and private attachments.
// Everything runs against an in-memory mock of company-api and Storage; no real
// account, Supabase project or file storage is touched.
const SUPABASE = 'https://kopvznygsqsheibsjjvv.supabase.co';
const CUSTOMER_ID = '00000000-0000-4000-8000-000000000551';
const PROJECT_ID = '00000000-0000-4000-8000-000000000552';
let nextId = 0x560;
const newId = () => '00000000-0000-4000-8000-' + String(nextId++).padStart(12, '0');

async function mockCompanyApi(page) {
  const records = [
    { id: CUSTOMER_ID, record_type: 'customer', title: 'E2E Trading Co', business_type: 'trade', status: 'active', data: {}, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
    { id: PROJECT_ID, record_type: 'project', title: 'E2E Import Order', business_type: 'trade', status: 'active', parent_record_id: CUSTOMER_ID, data: {}, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' }
  ];
  const stored = new Map();
  const calls = [];
  const cors = (route, options) => route.fulfill({ ...options, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:4173', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-upsert', ...(options.headers || {}) } });
  const json = (route, status, data) => cors(route, { status, contentType: 'application/json', body: JSON.stringify(data) });
  await page.route('**/functions/v1/company-api/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace('/functions/v1/company-api', ''), method = req.method();
    if (method === 'OPTIONS') return cors(route, { status: 204 });
    const body = method === 'POST' || method === 'PATCH' ? req.postDataJSON() : null;
    calls.push({ method, path, body, auth: req.headers().authorization });
    if (method === 'POST' && path === '/auth/verify') return json(route, 200, { data: { authenticated: true } });
    if (method === 'GET' && (path === '/customers' || path === '/records')) {
      const type = path === '/customers' ? 'customer' : url.searchParams.get('record_type');
      const rows = records.filter(r => r.record_type === type);
      const offset = Number(url.searchParams.get('offset') || 0), limit = Number(url.searchParams.get('limit') || 20);
      return json(route, 200, { data: { items: rows.slice(offset, offset + limit), total: rows.length, limit, offset } });
    }
    if (method === 'POST' && path === '/records') {
      if (body.record_type === 'file') return json(route, 400, { error: 'FILE_ENDPOINT_REQUIRED' });
      const row = { id: newId(), ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      records.push(row); return json(route, 201, { data: row });
    }
    const recordMatch = path.match(/^\/records\/([0-9a-f-]+)$/);
    if (recordMatch && method === 'PATCH') { const row = records.find(r => r.id === recordMatch[1]); Object.assign(row, body, { updated_at: new Date().toISOString() }); return json(route, 200, { data: row }); }
    if (recordMatch && method === 'DELETE') {
      if (records.some(r => r.parent_record_id === recordMatch[1])) return json(route, 409, { error: 'RECORD_IN_USE_OR_INVALID_RELATION' });
      records.splice(records.findIndex(r => r.id === recordMatch[1]), 1); return json(route, 200, { data: { deleted: true } });
    }
    if (method === 'POST' && path === '/files/upload-url') {
      const objectPath = body.parent_record_id + '/' + newId();
      return json(route, 200, { data: { path: objectPath, upload_url: SUPABASE + '/storage/v1/object/upload/sign/company-documents/' + objectPath + '?token=e2e', max_bytes: 10485760 } });
    }
    if (method === 'POST' && path === '/files') {
      if (!stored.has(body.path)) return json(route, 409, { error: 'FILE_NOT_UPLOADED' });
      const row = { id: newId(), record_type: 'file', title: body.file_name, status: 'stored', parent_record_id: body.parent_record_id, data: { file: { bucket: 'company-documents', path: body.path, fileName: body.file_name, mimeType: body.mime_type, fileSize: body.file_size, uploadedAt: new Date().toISOString() } }, created_at: new Date().toISOString() };
      records.push(row); return json(route, 201, { data: row });
    }
    if (method === 'GET' && path === '/files') {
      const rows = records.filter(r => r.record_type === 'file' && r.parent_record_id === url.searchParams.get('parent_record_id'));
      return json(route, 200, { data: { items: rows, total: rows.length } });
    }
    const download = path.match(/^\/files\/([0-9a-f-]+)\/download-url$/);
    if (download && method === 'GET') {
      const file = records.find(r => r.id === download[1]);
      return json(route, 200, { data: { url: SUPABASE + '/storage/v1/object/sign/company-documents/' + file.data.file.path + '?token=e2e&download=' + encodeURIComponent(file.data.file.fileName), expires_in: 300 } });
    }
    const fileDelete = path.match(/^\/files\/([0-9a-f-]+)$/);
    if (fileDelete && method === 'DELETE') {
      const index = records.findIndex(r => r.id === fileDelete[1]); stored.delete(records[index].data.file.path); records.splice(index, 1);
      return json(route, 200, { data: { deleted: true } });
    }
    return json(route, 404, { error: 'NOT_FOUND' });
  });
  // Context-level route so the download popup is intercepted too (never reaches a real host).
  await page.context().route('**/storage/v1/object/**', async route => {
    const req = route.request(), url = new URL(req.url());
    if (req.method() === 'OPTIONS') return cors(route, { status: 204 });
    calls.push({ method: req.method(), path: url.pathname, url: req.url(), storage: true, contentType: req.headers()['content-type'], authorization: req.headers().authorization });
    if (req.method() === 'PUT') {
      stored.set(url.pathname.replace('/storage/v1/object/upload/sign/company-documents/', ''), req.postDataBuffer()?.length || 0);
      return cors(route, { status: 200, contentType: 'application/json', body: '{"Key":"ok"}' });
    }
    return cors(route, { status: 200, contentType: 'application/pdf', body: '%PDF-1.4', headers: { 'Content-Disposition': 'attachment' } });
  });
  return { records, calls, stored };
}

test('company workspace manages transactions, documents and private attachments', async ({ page }) => {
  await openLocalTestApp(page);
  await page.evaluate(() => {
    window.PlannerCompanyContext = Object.freeze({ getAuth: () => ({ url: 'https://kopvznygsqsheibsjjvv.supabase.co', key: 'playwright-public-key', username: 'oooo', password: 'not-a-real-password' }) });
  });
  const { records, calls, stored } = await mockCompanyApi(page);
  page.on('dialog', dialog => dialog.accept());

  await page.locator('#workspace-company').click();
  await expect(page.locator('#company-workspace-root')).toBeVisible();

  // --- Transactions ---------------------------------------------------------
  await page.locator('#cw-business-nav button[data-tab="transactions"]').click();
  await expect(page.locator('#cw-business-nav button[data-tab="transactions"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#cw-records-panel')).toBeVisible();
  await expect(page.locator('#cw-business-panel')).toBeHidden();
  await expect(page.locator('#cw-customer-panel')).toBeHidden();
  await expect(page.locator('#cw-records-list')).toContainText('还没有交易记录');

  await page.locator('#cw-records-new').click();
  await page.locator('#cw-rec-title').fill('Deposit for import order');
  await page.locator('#cw-rec-amount').fill('0');
  await page.locator('#cw-records-save').click();
  await expect(page.locator('#cw-records-error')).toContainText('金额必须大于 0');
  await page.locator('#cw-rec-amount').fill('120,000');
  await page.locator('#cw-rec-customer').selectOption(CUSTOMER_ID);
  await page.locator('#cw-rec-project').selectOption(PROJECT_ID);
  await page.locator('#cw-rec-category').fill('Deposit');
  await page.locator('#cw-records-save').click();
  await expect(page.locator('#cw-records-list')).toContainText('Deposit for import order');
  const income = records.find(r => r.title === 'Deposit for import order');
  expect(income).toMatchObject({ record_type: 'transaction', amount: '120000', currency: 'JPY', status: 'completed', parent_record_id: PROJECT_ID, related_record_ids: [CUSTOMER_ID], business_type: 'trade' });
  expect(income.data).toMatchObject({ direction: 'income', customer_id: CUSTOMER_ID, project_id: PROJECT_ID, category: 'Deposit' });

  await page.locator('#cw-records-new').click();
  await page.locator('#cw-rec-title').fill('Freight');
  await page.locator('#cw-rec-direction').selectOption('expense');
  await page.locator('#cw-rec-amount').fill('20000');
  await page.locator('#cw-records-save').click();
  await expect(page.locator('#cw-records-list')).toContainText('Freight');
  expect(records.find(r => r.title === 'Freight')).toMatchObject({ parent_record_id: null, related_record_ids: [] });

  await page.locator('#cw-records-new').click();
  await page.locator('#cw-rec-title').fill('USD consulting');
  await page.locator('#cw-rec-amount').fill('0.1');
  await page.locator('#cw-rec-currency').selectOption('USD');
  await page.locator('#cw-records-save').click();
  await expect(page.locator('#cw-records-list')).toContainText('USD consulting');

  const summary = page.locator('#cw-records-summary');
  await expect(summary).toContainText('JPY');
  await expect(summary).toContainText('120,000');
  await expect(summary).toContainText('100,000');
  await expect(summary).toContainText('USD');
  await expect(summary).toContainText('0.10');

  await page.locator('#cw-records-filter-c').selectOption('USD');
  await expect(page.locator('#cw-records-list .cw-records-card')).toHaveCount(1);
  await expect(summary).not.toContainText('JPY');
  await page.locator('#cw-records-filter-c').selectOption('');
  await page.locator('#cw-records-filter-customer').selectOption(CUSTOMER_ID);
  await expect(page.locator('#cw-records-list .cw-records-card')).toHaveCount(1);
  await page.locator('#cw-records-filter-customer').selectOption('');

  await page.locator('.cw-records-card', { hasText: 'Freight' }).getByRole('button', { name: '编辑' }).click();
  await page.locator('#cw-rec-amount').fill('25000');
  await page.locator('#cw-rec-status').selectOption('planned');
  await page.locator('#cw-records-save').click();
  await expect(summary).toContainText('25,000');
  const freightPatch = calls.find(c => c.method === 'PATCH');
  expect(freightPatch.body.record_type).toBeUndefined();
  expect(freightPatch.body).toMatchObject({ amount: '25000', status: 'planned' });

  await page.locator('.cw-records-card', { hasText: 'USD consulting' }).getByRole('button', { name: '删除' }).click();
  await expect(page.locator('#cw-records-list')).not.toContainText('USD consulting');

  // --- Documents and attachments ------------------------------------------
  await page.locator('#cw-business-nav button[data-tab="documents"]').click();
  await expect(page.locator('#cw-business-nav button[data-tab="documents"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#cw-records-summary')).toBeHidden();
  await expect(page.locator('#cw-records-list')).toContainText('还没有业务文档');
  await page.locator('#cw-records-new').click();
  await page.locator('#cw-rec-title').fill('Import order contract');
  await page.locator('#cw-rec-doctype').selectOption('contract');
  await page.locator('#cw-rec-number').fill('C-2026-001');
  await page.locator('#cw-rec-status').selectOption('issued');
  await page.locator('#cw-rec-project').selectOption(PROJECT_ID);
  await page.locator('#cw-records-save').click();
  await expect(page.locator('#cw-records-list')).toContainText('Import order contract');
  const contract = records.find(r => r.title === 'Import order contract');
  expect(contract).toMatchObject({ record_type: 'document', status: 'issued', parent_record_id: PROJECT_ID, related_record_ids: [CUSTOMER_ID] });
  expect(contract.data).toMatchObject({ document_type: 'contract', document_number: 'C-2026-001', customer_id: CUSTOMER_ID });

  const card = page.locator('.cw-records-card', { hasText: 'Import order contract' });
  await card.getByRole('button', { name: '附件 (0)' }).click();
  await expect(page.locator('#cw-records-files')).toBeVisible();
  await expect(page.locator('#cw-files-list')).toContainText('还没有附件');

  await page.locator('#cw-files-input').setInputFiles({ name: 'virus.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
  await page.locator('#cw-files-upload').click();
  await expect(page.locator('#cw-files-feedback')).toContainText('不支持该文件类型');
  expect(calls.some(c => c.path === '/files/upload-url')).toBe(false);

  await page.locator('#cw-files-input').setInputFiles({ name: 'oversized.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await page.locator('#cw-files-upload').click();
  await expect(page.locator('#cw-files-feedback')).toContainText('文件超过 10 MB');
  expect(calls.some(c => c.path === '/files/upload-url')).toBe(false);

  await page.locator('#cw-files-input').setInputFiles({ name: 'contract.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 e2e contract') });
  await page.locator('#cw-files-upload').click();
  await expect(page.locator('#cw-files-feedback')).toContainText('附件已上传');
  await expect(page.locator('#cw-files-list')).toContainText('contract.pdf');
  const signRequest = calls.find(c => c.path === '/files/upload-url');
  expect(signRequest.body).toEqual({ parent_record_id: contract.id, file_name: 'contract.pdf', mime_type: 'application/pdf', file_size: 21 });
  const put = calls.find(c => c.storage && c.method === 'PUT');
  expect(put.contentType).toBe('application/pdf');
  expect(put.authorization).toBeUndefined();
  expect(stored.size).toBe(1);
  const complete = calls.find(c => c.method === 'POST' && c.path === '/files');
  expect(complete.body.path.startsWith(contract.id + '/')).toBe(true);

  const popupPromise = page.waitForEvent('popup');
  await page.locator('#cw-files-list').getByRole('button', { name: '下载' }).click();
  const popup = await popupPromise;
  await expect.poll(() => calls.find(c => c.storage && c.method === 'GET')?.url || '').toContain('/storage/v1/object/sign/company-documents/' + contract.id + '/');
  expect(calls.find(c => c.storage && c.method === 'GET').url).toContain('download=contract.pdf');
  await popup.close();

  await page.locator('#cw-files-close').click();
  await expect(card.getByRole('button', { name: '附件 (1)' })).toBeVisible();
  await card.getByRole('button', { name: '删除' }).click();
  await expect(page.locator('#cw-records-feedback')).toContainText('请先删除附件');
  expect(records.some(r => r.id === contract.id)).toBe(true);

  await card.getByRole('button', { name: '附件 (1)' }).click();
  await page.locator('#cw-files-list').getByRole('button', { name: '删除' }).click();
  await expect(page.locator('#cw-files-list')).toContainText('还没有附件');
  expect(stored.size).toBe(0);
  await page.locator('#cw-files-close').click();
  await card.getByRole('button', { name: '删除' }).click();
  await expect(page.locator('#cw-records-list')).not.toContainText('Import order contract');

  // --- Existing tabs still work after visiting the new ones -------------------
  await page.locator('#cw-business-nav button[data-tab="projects"]').click();
  await expect(page.locator('#cw-records-panel')).toBeHidden();
  await expect(page.locator('#cw-business-panel')).toBeVisible();
  await expect(page.locator('#cw-business-list')).toContainText('E2E Import Order');

  // --- No company data in browser storage; every API call authenticated -------
  const storedCompanyKeys = await page.evaluate(() => Object.keys(localStorage).filter(key => /company|transaction|document/i.test(key)));
  expect(storedCompanyKeys).toEqual([]);
  for (const call of calls.filter(c => !c.storage)) expect(call.auth).toMatch(/^Basic /);
});
