import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

test('repository management remains available from the company workspace', async ({ page }) => {
  await openLocalTestApp(page);

  await page.route('**/functions/v1/company-api/**', async route => {
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
    const path = new URL(route.request().url()).pathname.replace('/functions/v1/company-api', '');
    if (method === 'POST' && path === '/auth/verify') {
      await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ data: { authenticated: true, username: 'oooo' } }) });
      return;
    }
    if (method === 'GET' && path === '/repositories') {
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
  console.log('repository button diagnostics', await repositoryButton.evaluate(el => ({
    workspace: document.documentElement.dataset.workspace,
    display: getComputedStyle(el).display,
    visibility: getComputedStyle(el).visibility,
    hidden: el.hidden,
    inlineStyle: el.getAttribute('style'),
    parentStyle: el.parentElement.getAttribute('style'),
    parentDisplay: getComputedStyle(el.parentElement).display,
    matchingHideRules: [...document.styleSheets].flatMap(sheet => {
      try { return [...sheet.cssRules].filter(rule => rule.selectorText && el.matches(rule.selectorText) && rule.style?.display === 'none').map(rule => rule.selectorText); }
      catch { return []; }
    })
  })));
  await expect(repositoryButton).toBeVisible();
  await repositoryButton.click();

  await expect(page.locator('#repository-management-dialog')).toBeVisible();
  await expect(page.locator('#repository-status-message')).not.toContainText('请先在计划工作区登录');
});
