import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

test('repository management remains available from the company workspace', async ({ page }) => {
  await openLocalTestApp(page);

  await page.route('**/functions/v1/company-api/repositories', async route => {
    const method = route.request().method();
    const headers = {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:4173',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type'
    };
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers,
        body: JSON.stringify({ data: { repositories: [] } })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers,
      body: JSON.stringify({ data: { repositories: [] } })
    });
  });

  await page.locator('#workspace-company').click();
  await expect(page.locator('#company-workspace-root')).toBeVisible();

  const repositoryButton = page.locator('#open-repository-management');
  await expect(repositoryButton).toBeVisible();
  await repositoryButton.click();

  await expect(page.locator('#repository-management-dialog')).toBeVisible();
  await expect(page.locator('#repository-status-message')).not.toContainText('请先在计划工作区登录');
});
