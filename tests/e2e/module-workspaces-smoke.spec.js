import { test, expect } from './fixtures.js';
import { MODULES, addLocalTestRecord, loginToLocalTestApp } from './helpers.js';

// MVP smoke coverage for the five additional personal workspaces.
// The shared fixture supplies mocked login and blocks non-login Supabase REST calls.
const TARGET_MODULES = MODULES.filter(({ id }) =>
  ['work', 'language', 'organize', 'results', 'future'].includes(id)
);

test('work, language, organize, results and future modules save and restore local records', async ({ authenticatedPage: page }) => {
  const records = TARGET_MODULES.map(module => ({
    module,
    title: `e2e-mvp-${module.id}-${Date.now()}`
  }));

  for (const { module, title } of records) {
    await addLocalTestRecord(page, module, title);
  }

  // Confirm each module writes to its own LocalStorage partition.
  const partitionTitles = await page.evaluate(keys => Object.fromEntries(
    keys.map(({ id, key }) => {
      const state = JSON.parse(localStorage.getItem(key) || 'null');
      return [id, (state?.plans || []).map(item => item.title)];
    })
  ), TARGET_MODULES);

  for (const { module, title } of records) {
    expect(partitionTitles[module.id]).toContain(title);
    for (const other of TARGET_MODULES.filter(item => item.id !== module.id)) {
      expect(partitionTitles[other.id]).not.toContain(title);
    }
  }

  // A reload creates a fresh page session; authenticate again through the mock.
  await page.reload();
  await loginToLocalTestApp(page);

  for (const { module, title } of records) {
    await page.locator(`#module-${module.id}`).click();
    await expect(page.locator(`#module-${module.id}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#task-list .task-title')).toHaveText(title);
  }
});
