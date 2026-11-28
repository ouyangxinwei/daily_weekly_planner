import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

const PLANNER_KEY = 'personal-planner:v1';

test('planner keeps invalid JSON unchanged and blocks edits until recovery', async ({ page }) => {
  const corrupted = '{"plans":';
  await page.addInitScript(value => localStorage.setItem('personal-planner:v1', value), corrupted);
  await openLocalTestApp(page);

  await expect(page.locator('#storage-error')).toBeVisible();
  await page.locator('#quick-add-title').fill('must not overwrite damaged data');
  await page.locator('#quick-add-form button[type="submit"]').click();

  await expect(page.locator('#storage-error')).toContainText(/锁定写入|禁止修改/);
  expect(await page.evaluate(key => localStorage.getItem(key), PLANNER_KEY)).toBe(corrupted);
});

test('planner rejects mixed valid and malformed records without dropping either record', async ({ page }) => {
  const mixed = JSON.stringify({
    schemaVersion: 1,
    categories: ['学习'],
    plans: [
      { id: 'valid-plan', title: 'keep me', period: 'daily', category: '学习' },
      { id: 'invalid-plan', title: 'bad period', period: 'not-a-period', category: '学习' }
    ],
    completions: {},
    trash: []
  });
  await page.addInitScript(value => localStorage.setItem('personal-planner:v1', value), mixed);
  await openLocalTestApp(page);

  await expect(page.locator('#storage-error')).toBeVisible();
  await page.locator('#quick-add-title').fill('must not replace mixed data');
  await page.locator('#quick-add-form button[type="submit"]').click();

  expect(await page.evaluate(key => localStorage.getItem(key), PLANNER_KEY)).toBe(mixed);
});

test('planner allows explicit validated backup import to recover a locked store', async ({ page }) => {
  const corrupted = '{"broken":true';
  await page.addInitScript(value => localStorage.setItem('personal-planner:v1', value), corrupted);
  await openLocalTestApp(page);
  await expect(page.locator('#storage-error')).toBeVisible();

  page.on('dialog', dialog => dialog.accept());
  const backup = {
    schemaVersion: 1,
    categories: ['学习'],
    plans: [{ id: 'recovered-plan', title: 'Recovered plan', period: 'daily', category: '学习' }],
    completions: {},
    trash: []
  };
  await page.locator('#backup-file').setInputFiles({
    name: 'recovery.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup))
  });

  await expect(page.locator('#task-list .task-title')).toContainText('Recovered plan');
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PLANNER_KEY);
  expect(stored.plans.some(plan => plan.id === 'recovered-plan')).toBe(true);
  await expect(page.locator('#storage-error')).toBeHidden();
});
