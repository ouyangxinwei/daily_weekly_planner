import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await openLocalTestApp(page);
});

test('language workspace supports content creation, practice, mistakes, records and isolation', async ({ page }) => {
  await page.locator('#module-language').click();
  await expect(page.locator('#language-workspace-root')).toBeVisible();
  await expect(page.locator('#task-list')).toBeHidden();

  await page.locator('#lw-add').click();
  await page.locator('#lw-title').fill('E2E Japanese vocabulary');
  await page.locator('#lw-lang').selectOption('日语');
  await page.locator('#lw-type').selectOption('vocabulary');
  await page.locator('#lw-prompt').fill('勉強');
  await page.locator('#lw-answer').fill('学习');
  await page.locator('#lw-notes').fill('E2E note');
  await page.locator('#lw-form button[type="submit"]').click();

  await expect(page.locator('#lw-card-list')).toContainText('E2E Japanese vocabulary');
  await expect(page.locator('#lw-card-list')).toContainText('日语');

  await page.locator('[data-tab="practice"]').click();
  await page.locator('#lw-reveal').click();
  await expect(page.locator('.lw-answer')).toContainText('学习');
  await page.locator('#lw-mistake').click();

  await page.locator('[data-tab="mistakes"]').click();
  await expect(page.locator('#language-workspace-root')).toContainText('E2E Japanese vocabulary');
  await page.locator('[data-tab="records"]').click();
  await expect(page.locator('#language-workspace-root')).toContainText('标记为需要复习');

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('personal-language-study-workspace:v1')));
  expect(stored.items).toHaveLength(1);
  expect(stored.items[0].status).toBe('mistake');
  expect(stored.records).toHaveLength(1);

  await page.locator('#module-plan').click();
  await expect(page.locator('#language-workspace-root')).toBeHidden();
  await page.locator('#module-language').click();
  await expect(page.locator('#language-workspace-root')).toBeVisible();
  await page.locator('[data-tab="content"]').click();
  await expect(page.locator('#lw-card-list')).toContainText('E2E Japanese vocabulary');
});

test('language workspace exports an independent JSON backup', async ({ page }) => {
  await page.locator('#module-language').click();
  await page.locator('#lw-add').click();
  await page.locator('#lw-title').fill('E2E export record');
  await page.locator('#lw-form button[type="submit"]').click();
  await page.locator('[data-tab="settings"]').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#lw-export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^language-study-backup-.*\.json$/);
});
