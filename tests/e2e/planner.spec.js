import { test, expect } from '@playwright/test';
import { MODULES, openLocalTestApp, loginToLocalTestApp, addLocalTestRecord } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await openLocalTestApp(page);
});

test('all seven module navigation buttons switch to the requested module', async ({ page }) => {
  for (const module of MODULES) {
    const button = page.locator(`#module-${module.id}`);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#app-shell')).toBeVisible();
  }
});

test('each module saves only to its own LocalStorage partition and survives refresh', async ({ page }) => {
  const titles = new Map();

  for (const module of MODULES) {
    const title = `e2e-isolation-${module.id}`;
    titles.set(module.id, title);
    await addLocalTestRecord(page, module, title);
  }

  const partitions = await page.evaluate(keys => Object.fromEntries(
    keys.map(({ id, key }) => {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      return [id, (parsed?.plans || []).map(item => item.title)];
    })
  ), MODULES);

  for (const module of MODULES) {
    expect(partitions[module.id]).toContain(titles.get(module.id));
    for (const other of MODULES.filter(item => item.id !== module.id)) {
      expect(partitions[other.id]).not.toContain(titles.get(module.id));
    }
  }

  await page.reload();
  await loginToLocalTestApp(page);

  for (const module of MODULES) {
    await page.locator(`#module-${module.id}`).click();
    await expect(page.locator('#task-list .task-title')).toHaveText(titles.get(module.id));
  }
});

test('Plan completion state is persisted locally after refresh', async ({ page }) => {
  const title = 'e2e-plan-completion-persistence';
  await addLocalTestRecord(page, MODULES[0], title);

  const task = page.locator('#task-list .task').filter({ hasText: title });
  await task.locator('input.check').check();
  await expect(task).toHaveClass(/done/);

  const completionSaved = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('personal-planner:v1'));
    return Object.values(state.completions).some(value => value === true);
  });
  expect(completionSaved).toBe(true);

  await page.reload();
  await loginToLocalTestApp(page);
  const restoredTask = page.locator('#task-list .task').filter({ hasText: title });
  await expect(restoredTask).toHaveClass(/done/);
});
