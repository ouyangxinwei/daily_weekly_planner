import { expect } from '@playwright/test';

export const MODULES = [
  { id: 'plan', label: '慢慢计划', key: 'personal-planner:v1' },
  { id: 'work', label: '工作', key: 'personal-work:v1' },
  { id: 'language', label: '外语学习', key: 'personal-language:v1' },
  { id: 'organize', label: '慢慢整理', key: 'personal-organizer:v1' },
  { id: 'results', label: '成绩', key: 'personal-results:v1' },
  { id: 'future', label: '未来', key: 'personal-future:v1' },
  { id: 'memo', label: '备忘', key: 'personal-memo:v1' }
];

export async function installCloudIsolation(page) {
  await page.route('**/rest/v1/**', async route => {
    const url = route.request().url();
    if (url.includes('/rpc/planner_login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'true'
      });
      return;
    }
    await route.abort('blockedbyclient');
  });
}

export async function loginToLocalTestApp(page) {
  await expect(page.locator('#access-gate')).toBeVisible();
  await page.locator('#gate-key').fill('playwright-test-public-key');
  await page.locator('#gate-password').fill('not-a-real-password');
  await page.locator('#access-form button[type="submit"]').click();
  await expect(page.locator('#app-shell')).toBeVisible();
}

export async function openLocalTestApp(page) {
  await installCloudIsolation(page);
  await page.goto('/');
  await loginToLocalTestApp(page);
}

export async function addLocalTestRecord(page, module, title) {
  await page.locator(`#module-${module.id}`).click();
  await expect(page.locator(`#module-${module.id}`)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#quick-add-title').fill(title);
  await page.locator('#quick-add-form button[type="submit"]').click();
  await expect(page.locator('#task-list .task-title')).toHaveText(title);
  const stored = await page.evaluate(key => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, module.key);
  expect(stored?.plans?.some(item => item.title === title)).toBe(true);
}
