import { test, expect } from './fixtures.js';
import { loginToLocalTestApp } from './helpers.js';

test('authenticated user can create, edit, complete, and restore a plan after refresh', async ({ authenticatedPage: page }) => {
  const originalTitle = 'E2E plan journey - original';
  const updatedTitle = 'E2E plan journey - updated';
  const note = 'Created and edited by the isolated Playwright user journey';

  // Create a plan through the same controls a person uses.
  await page.locator('#new-plan').click();
  await expect(page.locator('#plan-dialog')).toBeVisible();
  await page.locator('#plan-title').fill(originalTitle);
  await page.locator('#plan-note').fill(note);
  await page.locator('#plan-form button[type="submit"]').click();

  const createdTask = page.locator('#task-list .task').filter({ hasText: originalTitle });
  await expect(createdTask).toBeVisible();
  await expect(page.locator('#plan-dialog')).toBeHidden();

  // Edit the plan through its row action.
  await createdTask.getByRole('button', { name: `编辑：${originalTitle}` }).click();
  await expect(page.locator('#plan-dialog')).toBeVisible();
  await page.locator('#plan-title').fill(updatedTitle);
  await page.locator('#plan-form button[type="submit"]').click();

  const updatedTask = page.locator('#task-list .task').filter({ hasText: updatedTitle });
  await expect(updatedTask).toBeVisible();
  await expect(page.locator('#task-list')).not.toContainText(originalTitle);

  // Complete the plan and verify that the completion record is stored locally.
  await updatedTask.locator('input.check').check();
  await expect(updatedTask).toHaveClass(/done/);

  const beforeRefresh = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('personal-planner:v1') || 'null');
    return {
      plan: state?.plans?.find(item => item.title === 'E2E plan journey - updated') || null,
      completed: Object.values(state?.completions || {}).some(value => value === true)
    };
  });
  expect(beforeRefresh.plan?.note).toBe(note);
  expect(beforeRefresh.completed).toBe(true);

  // A reload starts a new page session, so sign in again using the mocked auth RPC.
  await page.reload();
  await loginToLocalTestApp(page);

  const restoredTask = page.locator('#task-list .task').filter({ hasText: updatedTitle });
  await expect(restoredTask).toBeVisible();
  await expect(restoredTask).toHaveClass(/done/);

  const afterRefresh = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('personal-planner:v1') || 'null');
    return {
      plan: state?.plans?.find(item => item.title === 'E2E plan journey - updated') || null,
      completed: Object.values(state?.completions || {}).some(value => value === true)
    };
  });
  expect(afterRefresh.plan?.note).toBe(note);
  expect(afterRefresh.completed).toBe(true);
});
