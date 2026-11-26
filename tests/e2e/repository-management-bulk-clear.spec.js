import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

const initialRepositories = [
  { id: 'github:example/alpha', name: 'alpha', url: 'https://github.com/example/alpha', defaultBranch: 'main', category: '待分类', techStack: ['JavaScript'], status: '待整理', priority: '中', tags: ['GitHub导入'], notes: '', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'github:example/beta', name: 'beta', url: 'https://github.com/example/beta', defaultBranch: 'main', category: '待分类', techStack: ['Python'], status: '待整理', priority: '中', tags: ['GitHub导入'], notes: '', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' }
];

async function openRepositoryManager(page, putRequests) {
  await openLocalTestApp(page);
  await page.route('**/functions/v1/company-api/**', async route => {
    const method = route.request().method();
    const headers = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type'
    };
    if (method === 'OPTIONS') { await route.fulfill({ status: 204, headers }); return; }
    const path = new URL(route.request().url()).pathname.replace('/functions/v1/company-api', '');
    if (method === 'POST' && path === '/auth/verify') {
      await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ data: { authenticated: true, username: 'oooo' } }) });
      return;
    }
    if (method === 'GET' && path === '/repositories') {
      await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ data: { repositories: initialRepositories } }) });
      return;
    }
    if (method === 'PUT' && path === '/repositories') {
      putRequests.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ data: { repositories: [] } }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', headers, body: JSON.stringify({ error: 'NOT_FOUND' }) });
  });
  await page.locator('#workspace-company').click();
  await expect(page.locator('#company-workspace-root')).toBeVisible();
  await page.locator('#open-repository-management').click();
  await expect(page.locator('#repository-management-dialog')).toBeVisible();
  await expect(page.locator('#repository-clear')).toBeEnabled();
}

test('clearing repository records is cancelled without a cloud write', async ({ page }) => {
  const putRequests = [];
  await openRepositoryManager(page, putRequests);
  await expect(page.locator('#repository-list .rm-card')).toHaveCount(2);
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#repository-clear').click();
  await expect(page.locator('#repository-list .rm-card')).toHaveCount(2);
  expect(putRequests).toHaveLength(0);
});

test('confirming repository clear replaces only the planner list with an empty snapshot', async ({ page }) => {
  const putRequests = [];
  await openRepositoryManager(page, putRequests);
  await expect(page.locator('#repository-list .rm-card')).toHaveCount(2);
  page.once('dialog', async dialog => { expect(dialog.message()).toContain('2'); await dialog.accept(); });
  await page.locator('#repository-clear').click();
  await expect.poll(() => putRequests.length).toBe(1);
  expect(putRequests[0]).toEqual({ repositories: [] });
  await expect(page.locator('#repository-list .rm-card')).toHaveCount(0);
  await expect(page.locator('#repository-clear')).toBeDisabled();
});
