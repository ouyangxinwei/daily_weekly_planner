import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

const CUSTOMER_ID = '00000000-0000-4000-8000-000000000041';

test('company workspace creates, edits, searches and deletes a customer through the API', async ({ page }) => {
  await openLocalTestApp(page);

  const records = [];
  const calls = [];
  await page.evaluate(() => {
    window.PlannerCompanyContext = Object.freeze({
      getAuth: () => ({
        url: 'https://kopvznygsqsheibsjjvv.supabase.co',
        key: 'playwright-public-key',
        username: 'oooo',
        password: 'not-a-real-password'
      })
    });
  });

  await page.route('**/functions/v1/company-api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/functions/v1/company-api', '');
    const method = request.method();
    calls.push({ method, path, auth: request.headers()['authorization'] });

    if (method === 'POST' && path === '/auth/verify') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { authenticated: true, username: 'oooo' } }) });
      return;
    }
    if (method === 'GET' && path === '/customers') {
      const query = (url.searchParams.get('q') || '').toLowerCase();
      const filtered = records.filter(item => !query || item.title.toLowerCase().includes(query));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: filtered, total: filtered.length, limit: 20, offset: 0 } }) });
      return;
    }
    if (method === 'POST' && path === '/customers') {
      const body = request.postDataJSON();
      const customer = { id: CUSTOMER_ID, record_type: 'customer', ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      records.push(customer);
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ data: customer }) });
      return;
    }
    if (path === '/customers/' + CUSTOMER_ID && method === 'PATCH') {
      const body = request.postDataJSON();
      Object.assign(records[0], body, { updated_at: new Date().toISOString() });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: records[0] }) });
      return;
    }
    if (path === '/customers/' + CUSTOMER_ID && method === 'DELETE') {
      records.splice(0, 1);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { deleted: true } }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'NOT_FOUND' }) });
  });

  await page.locator('#workspace-company').click();
  await expect(page.locator('#company-workspace-root')).toBeVisible();
  await expect(page.locator('#cw-session')).toContainText('已连接公司业务数据库');

  await page.locator('#cw-new').click();
  await page.locator('#cw-title').fill('E2E Example Trading');
  await page.locator('#cw-business-type').selectOption('trade');
  await page.locator('#cw-status').selectOption('prospect');
  await page.locator('#cw-contact').fill('Test Contact');
  await page.locator('#cw-email').fill('customer@example.test');
  await page.locator('#cw-editor-form button[type="submit"]').click();
  await expect(page.locator('#cw-customer-list')).toContainText('E2E Example Trading');
  await expect(page.locator('#cw-customer-list')).toContainText('customer@example.test');

  await page.locator('#cw-customer-list button').filter({ hasText: '编辑' }).click();
  await page.locator('#cw-title').fill('E2E Example Trading Updated');
  await page.locator('#cw-editor-form button[type="submit"]').click();
  await expect(page.locator('#cw-customer-list')).toContainText('E2E Example Trading Updated');

  await page.locator('#cw-search').fill('Updated');
  await page.locator('#cw-search-form button[type="submit"]').click();
  await expect(page.locator('#cw-customer-list')).toContainText('E2E Example Trading Updated');

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#cw-customer-list button').filter({ hasText: '删除' }).click();
  await expect(page.locator('#cw-customer-list')).toContainText('还没有客户资料');

  expect(calls.some(call => call.method === 'POST' && call.path === '/customers')).toBe(true);
  expect(calls.some(call => call.method === 'PATCH' && call.path === '/customers/' + CUSTOMER_ID)).toBe(true);
  expect(calls.some(call => call.method === 'DELETE' && call.path === '/customers/' + CUSTOMER_ID)).toBe(true);
  expect(calls.every(call => call.auth?.startsWith('Basic '))).toBe(true);
  expect(records).toHaveLength(0);
});
