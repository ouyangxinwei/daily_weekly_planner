import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

function localDateKey() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

test('development diary supports weekly and daily views, create, edit, search, category filter and delete', async ({ page }) => {
  await openLocalTestApp(page);
  const entries = [];
  const calls = [];
  let nextId = 1;

  await page.evaluate(() => {
    window.PlannerCompanyContext = Object.freeze({ getAuth: () => ({
      url: 'https://kopvznygsqsheibsjjvv.supabase.co',
      key: 'playwright-public-key',
      username: 'oooo',
      password: 'not-a-real-password'
    }) });
  });

  await page.route('**/rest/v1/rpc/planner_diary_*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const body = route.request().postDataJSON();
    calls.push({ name, body });
    let result;
    if (name === 'planner_diary_list_week') {
      result = entries.filter(x => x.date >= body.p_week_start && x.date <= body.p_week_end);
    } else if (name === 'planner_diary_list_day') {
      result = entries.filter(x => x.date === body.p_date);
    } else if (name === 'planner_diary_search') {
      const q = String(body.p_keyword || '').toLowerCase();
      result = entries.filter(x =>
        (!body.p_category || x.category === body.p_category) &&
        [x.title, x.content, ...(x.tags || [])].some(v => String(v || '').toLowerCase().includes(q))
      ).slice(0, 50);
    } else if (name === 'planner_diary_create') {
      const row = { id: 'diary-' + nextId++, date: body.p_date, title: body.p_title, content: body.p_content, category: body.p_category, tags: body.p_tags, duration_min: body.p_duration_min };
      entries.push(row);
      result = [row];
    } else if (name === 'planner_diary_update') {
      const row = entries.find(x => x.id === body.p_id);
      Object.assign(row, { date: body.p_date, title: body.p_title, content: body.p_content, category: body.p_category, tags: body.p_tags, duration_min: body.p_duration_min });
      result = [row];
    } else if (name === 'planner_diary_delete') {
      const index = entries.findIndex(x => x.id === body.p_id);
      if (index >= 0) entries.splice(index, 1);
      result = true;
    } else {
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Unknown diary RPC' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
  });

  await page.locator('#module-diary').click();
  const root = page.locator('#development-diary');
  await expect(root).toBeVisible();
  await expect(root.locator('.diary-day')).toHaveCount(7);
  await expect(root).toContainText('空白日');

  await root.locator('[data-add]').click();
  const form = page.locator('#diary-form');
  await form.locator('[name="date"]').fill(localDateKey());
  await form.locator('[name="category"]').selectOption('tech');
  await form.locator('[name="title"]').fill('E2E diary entry');
  await form.locator('[name="tags"]').fill('playwright, regression');
  await form.locator('[name="duration_min"]').fill('45');
  await form.locator('[name="content"]').fill('Initial diary detail');
  await form.locator('button[type="submit"]').click();

  await expect(root.locator('.diary-entry-toggle')).toContainText('E2E diary entry');
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({ title: 'E2E diary entry', category: 'tech', tags: ['playwright', 'regression'], duration_min: 45 });

  await root.locator('.diary-entry-toggle').click();
  await root.locator('[data-edit]').click();
  await expect(form.locator('[name="title"]')).toHaveValue('E2E diary entry');
  await form.locator('[name="title"]').fill('E2E diary entry edited');
  await form.locator('[name="category"]').selectOption('life');
  await form.locator('[name="content"]').fill('Updated diary detail');
  await form.locator('button[type="submit"]').click();
  await expect(root.locator('.diary-entry-toggle')).toContainText('E2E diary entry edited');
  expect(entries[0]).toMatchObject({ title: 'E2E diary entry edited', category: 'life', content: 'Updated diary detail' });

  await root.locator('[data-mode-day]').click();
  await expect(root.locator('[data-label]')).toContainText('日视图');
  await expect(root.locator('.diary-entry-toggle')).toContainText('E2E diary entry edited');

  await root.locator('[data-keyword]').fill('Updated diary detail');
  await root.locator('form[data-search] button').filter({ hasText: '搜索' }).click();
  await expect(root.locator('[data-label]')).toContainText('搜索结果');
  await expect(root.locator('.diary-entry-toggle')).toContainText('E2E diary entry edited');
  await root.locator('[data-category]').selectOption('tech');
  await expect(root.locator('.diary-empty')).toContainText('没有找到');

  await root.locator('[data-category]').selectOption('life');
  await expect(root.locator('.diary-entry-toggle')).toContainText('E2E diary entry edited');
  await root.locator('[data-clear]').click();
  await root.locator('.diary-entry-toggle').click();
  page.once('dialog', dialog => dialog.accept());
  await root.locator('[data-delete]').click();
  await expect(root.locator('.diary-entry-toggle')).toHaveCount(0);
  expect(entries).toHaveLength(0);
  expect(calls.some(x => x.name === 'planner_diary_create')).toBe(true);
  expect(calls.some(x => x.name === 'planner_diary_update')).toBe(true);
  expect(calls.some(x => x.name === 'planner_diary_search')).toBe(true);
  expect(calls.some(x => x.name === 'planner_diary_delete')).toBe(true);
  expect(calls.every(x => x.body.p_username === 'oooo' && x.body.p_password === 'not-a-real-password')).toBe(true);
});
