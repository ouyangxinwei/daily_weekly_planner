import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

test('learning meetings can be created and persist in local browser storage', async ({ page }) => {
  await openLocalTestApp(page);
  await page.locator('#open-learning-meetings').click();
  await expect(page.locator('#learning-meetings-dialog')).toBeVisible();

  await page.getByRole('button', { name: /新增会议/ }).click();
  await page.locator('.lm-form input[name="title"]').fill('V10.72 E2E learning meeting');
  await page.locator('.lm-form input[name="startDate"]').fill('2099-05-18');
  await page.locator('.lm-form button[type="submit"]').click();

  await expect(page.locator('#learning-meetings-root')).toContainText('V10.72 E2E learning meeting');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('planner:learning_meetings') || '[]'));
  expect(stored.some(item => item.title === 'V10.72 E2E learning meeting' && item.startDate === '2099-05-18')).toBe(true);
});


test('learning meetings preserve malformed local data and block writes until recovery', async ({ page }) => {
  const corrupted = '{"title":"incomplete"';
  await page.addInitScript(value => {
    localStorage.setItem('planner:learning_meetings', value);
  }, corrupted);

  await openLocalTestApp(page);
  await page.locator('#open-learning-meetings').click();
  await expect(page.locator('#learning-meetings-dialog')).toBeVisible();
  await expect(page.locator('#learning-meetings-root')).toContainText(/读取本地数据失败|Could not read local data|ローカルデータの読み込みに失敗/);

  const stored = await page.evaluate(() => localStorage.getItem('planner:learning_meetings'));
  expect(stored).toBe(corrupted);
  const recoveryButton = page.locator('#learning-meetings-root button');
  await expect(recoveryButton).toHaveCount(1);
  await expect(recoveryButton).toContainText(/导入 JSON 文件|Import JSON file|JSON ファイルを読み込む/);
});

test('learning meetings reject a non-array storage payload without overwriting it', async ({ page }) => {
  const invalidShape = JSON.stringify({ title: 'not-an-array' });
  await page.addInitScript(value => {
    localStorage.setItem('planner:learning_meetings', value);
  }, invalidShape);

  await openLocalTestApp(page);
  await page.locator('#open-learning-meetings').click();
  await expect(page.locator('#learning-meetings-root')).toContainText(/读取本地数据失败|Could not read local data|ローカルデータの読み込みに失敗/);

  const stored = await page.evaluate(() => localStorage.getItem('planner:learning_meetings'));
  expect(stored).toBe(invalidShape);
});


test('learning meetings fail closed when one record in an otherwise valid array is malformed', async ({ page }) => {
  const mixed = JSON.stringify([
    { id: 'lm-valid', title: 'Valid meeting', startDate: '2099-05-18' },
    { id: 'lm-invalid', title: '', startDate: 'not-a-date' }
  ]);
  await page.addInitScript(value => localStorage.setItem('planner:learning_meetings', value), mixed);

  await openLocalTestApp(page);
  await page.locator('#open-learning-meetings').click();
  await expect(page.locator('#learning-meetings-root')).toContainText(/读取本地数据失败|Could not read local data|ローカルデータの読み込みに失敗/);
  expect(await page.evaluate(() => localStorage.getItem('planner:learning_meetings'))).toBe(mixed);
  await expect(page.locator('#learning-meetings-root button')).toHaveCount(1);
});

test('learning meetings recover a locked store only after preview and explicit import confirmation', async ({ page }) => {
  const corrupted = '[{"title":';
  await page.addInitScript(value => localStorage.setItem('planner:learning_meetings', value), corrupted);

  await openLocalTestApp(page);
  await page.locator('#open-learning-meetings').click();
  await expect(page.locator('#learning-meetings-root')).toContainText(/读取本地数据失败|Could not read local data|ローカルデータの読み込みに失敗/);

  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('#learning-meetings-root button').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'meetings-recovery.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([{ title: 'Recovered meeting', startDate: '2099-05-18' }]))
  });

  await expect(page.locator('#learning-meetings-root')).toContainText('Recovered meeting');
  const confirmButton = page.locator('#learning-meetings-root button').filter({ hasText: /导入 1 条|Import 1|1 件をインポート/ });
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();

  await expect(page.locator('#learning-meetings-root')).toContainText('Recovered meeting');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('planner:learning_meetings')));
  expect(stored.some(item => item.title === 'Recovered meeting')).toBe(true);
});
