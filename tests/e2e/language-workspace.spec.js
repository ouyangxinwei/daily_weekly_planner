import { test, expect } from '@playwright/test';
import { MODULES, addLocalTestRecord, openLocalTestApp, loginToLocalTestApp, openLanguageWorkspace, addLanguageItem, readWorkspace, WORKSPACE_KEY } from './helpers.js';

const BACKUP_KEY = WORKSPACE_KEY + ':pre-v2-backup';
const ACTIVE_WORKSPACE_KEY = 'personal-planner:active-workspace:v1';

test.beforeEach(async ({ page }) => {
  await openLocalTestApp(page);
});

test('workspace switcher swaps the main area, keeps plan state and restores after refresh', async ({ page }) => {
  await page.locator('#search-input').fill('keep-me');
  await expect(page.locator('#workspace-plan')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#language-workspace-root')).toBeHidden();

  await openLanguageWorkspace(page);
  await expect(page.locator('#task-list')).toBeHidden();
  await expect(page.locator('#module-plan')).toBeHidden();
  await expect(page.locator('#theme-toggle')).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), ACTIVE_WORKSPACE_KEY)).toBe('language');

  await page.locator('#workspace-plan').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-workspace');
  await expect(page.locator('#language-workspace-root')).toBeHidden();
  await expect(page.locator('#task-list')).toBeVisible();
  await expect(page.locator('#search-input')).toHaveValue('keep-me');

  await openLanguageWorkspace(page);
  await page.reload();
  await loginToLocalTestApp(page);
  await expect(page.locator('#workspace-language')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#language-workspace-root')).toBeVisible();
  await expect(page.locator('#task-list')).toBeHidden();
});

test('language tasks module shows legacy task data again', async ({ page }) => {
  await expect(page.locator('#module-language')).toHaveText('外语任务');
  await addLocalTestRecord(page, MODULES.find(m => m.id === 'language'), 'Legacy language task');
  await expect(page.locator('#language-workspace-root')).toBeHidden();
  await page.reload();
  await loginToLocalTestApp(page);
  await page.locator('#module-language').click();
  await expect(page.locator('#task-list')).toBeVisible();
  await expect(page.locator('#task-list')).toContainText('Legacy language task');
  const workspace = await readWorkspace(page);
  expect(workspace === null || !workspace.items.some(x => x.title === 'Legacy language task')).toBe(true);
});

test('V1 workspace data is migrated with a backup and status mapping', async ({ page }) => {
  const v1 = {
    schemaVersion: 1,
    items: [
      { id: 'a', title: 'Old new item', language: '英语', type: 'vocabulary', category: 'x', prompt: 'p', answer: 'q', options: [], notes: '', status: 'new', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'b', title: 'Old mistake item', language: '日语', type: 'grammar', category: 'y', prompt: 'p', answer: 'q', options: [], notes: '', status: 'mistake', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' }
    ],
    records: [{ id: 'r1', itemId: 'b', title: 'Old mistake item', language: '日语', result: 'mistake', at: '2026-02-01T00:00:00.000Z' }],
    settings: { activeTab: 'home' }
  };
  const raw = JSON.stringify(v1);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [WORKSPACE_KEY, raw]);
  await page.reload();
  await loginToLocalTestApp(page);

  const stored = await readWorkspace(page);
  expect(stored.schemaVersion).toBe(2);
  expect(stored.items.map(x => x.status)).toEqual(['not_started', 'review']);
  expect(stored.records).toHaveLength(1);
  expect(stored.records[0].action).toBe('review');
  expect(await page.evaluate(k => localStorage.getItem(k), BACKUP_KEY)).toBe(raw);

  await openLanguageWorkspace(page);
  await page.locator('.lw-nav [data-act="tab"][data-tab="mistakes"]').click();
  await expect(page.locator('#language-workspace-root')).toContainText('Old mistake item');

  // 再次加载不覆盖升级前备份
  await page.reload();
  await loginToLocalTestApp(page);
  expect(await page.evaluate(k => localStorage.getItem(k), BACKUP_KEY)).toBe(raw);
});

test('unreadable workspace data opens read-only and is never overwritten', async ({ page }) => {
  await page.evaluate(k => localStorage.setItem(k, '{"schemaVersion":9,"items":"broken"}'), WORKSPACE_KEY);
  await page.reload();
  await loginToLocalTestApp(page);
  await openLanguageWorkspace(page);
  await expect(page.locator('.lw-alert')).toBeVisible();
  await page.locator('.lw-nav [data-act="tab"][data-tab="content"]').click();
  expect(await page.evaluate(k => localStorage.getItem(k), WORKSPACE_KEY)).toBe('{"schemaVersion":9,"items":"broken"}');
});

test('study actions drive the five learning states and create records', async ({ page }) => {
  await openLanguageWorkspace(page);
  await addLanguageItem(page, { title: 'E2E Japanese vocabulary', language: '日语', unit: 'N1 第 3 课', level: 'N1', prompt: '勉強', answer: '学习' });
  let stored = await readWorkspace(page);
  expect(stored.items[0].status).toBe('not_started');
  expect(stored.records).toHaveLength(0);
  await expect(page.locator('#lw-card-list')).toContainText('单元：N1 第 3 课');
  await expect(page.locator('#lw-card-list')).toContainText('未学习');

  await page.locator('#lw-card-list [data-act="detail"]').first().click();
  await expect(page.locator('.lw-detail')).toContainText('学习中');
  await expect(page.locator('.lw-answer')).not.toBeVisible();
  await page.locator('[data-act="reveal"]').click();
  await expect(page.locator('.lw-answer')).toContainText('学习');

  for (const [action, state] of [['complete', 'completed'], ['review', 'review'], ['master', 'mastered'], ['relearn', 'learning']]) {
    await page.locator(`[data-act="study"][data-action="${action}"]`).click();
    stored = await readWorkspace(page);
    expect(stored.items[0].status).toBe(state);
  }
  expect(stored.records.map(r => r.action)).toEqual(['start', 'complete', 'review', 'master', 'relearn']);
  expect(stored.items[0].lastStudiedAt).toBeTruthy();

  // 编辑不改变状态，编辑框中没有状态选择
  await page.locator('.lw-detail [data-act="edit"]').click();
  await expect(page.locator('#lw-form select')).toHaveCount(2);
  await page.locator('#lw-title').fill('E2E Japanese vocabulary edited');
  await page.locator('#lw-form button[type="submit"]').click();
  stored = await readWorkspace(page);
  expect(stored.items[0].status).toBe('learning');

  await page.locator('.lw-nav [data-act="tab"][data-tab="records"]').click();
  await expect(page.locator('.lw-records')).toContainText('重新学习');
});

test('practice centre prefers review items and skips mastered items', async ({ page }) => {
  await openLanguageWorkspace(page);
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({
    schemaVersion: 2, notes: [], records: [], settings: { activeTab: 'practice' },
    items: [
      { id: 'm', title: 'Mastered one', language: '英语', type: 'vocabulary', category: 'x', unit: '', level: '', prompt: '', answer: '', options: [], notes: '', status: 'mastered', lastStudiedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'r', title: 'Review one', language: '英语', type: 'vocabulary', category: 'x', unit: '', level: '', prompt: '', answer: '', options: [], notes: '', status: 'review', lastStudiedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'n', title: 'New one', language: '英语', type: 'vocabulary', category: 'x', unit: '', level: '', prompt: '', answer: '', options: [], notes: '', status: 'not_started', lastStudiedAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
    ]
  })), WORKSPACE_KEY);
  await page.reload();
  await loginToLocalTestApp(page);
  await expect(page.locator('.lw-quiz h4')).toHaveText('Review one');
  await page.locator('[data-act="study"][data-action="master"]').click();
  await expect(page.locator('.lw-quiz h4')).toHaveText('New one');
  await page.locator('[data-act="study"][data-action="master"]').click();
  await expect(page.locator('#language-workspace-root')).toContainText('所有内容都已标记掌握');
});

test('content list filters by unit and status and paginates at 10 items', async ({ page }) => {
  const now = Date.parse('2026-03-01T00:00:00.000Z');
  await page.evaluate(([k, now]) => localStorage.setItem(k, JSON.stringify({
    schemaVersion: 2, notes: [], records: [], settings: { activeTab: 'content' },
    items: Array.from({ length: 23 }, (_, i) => ({
      id: 'i' + i, title: 'Item ' + String(i).padStart(2, '0'), language: i % 2 ? '日语' : '英语', type: 'vocabulary', category: 'c',
      unit: i < 5 ? 'Unit A' : (i < 8 ? '' : 'Unit B'), level: '', prompt: '', answer: '', options: [], notes: '',
      status: i < 3 ? 'review' : 'not_started', lastStudiedAt: null,
      createdAt: new Date(now + i * 1000).toISOString(), updatedAt: new Date(now + i * 1000).toISOString()
    }))
  })), [WORKSPACE_KEY, now]);
  await page.reload();
  await loginToLocalTestApp(page);
  await openLanguageWorkspace(page);

  const cards = page.locator('#lw-card-list .lw-item');
  await expect(cards).toHaveCount(10);
  await expect(page.locator('.lw-page-info')).toHaveText('1 / 3');
  await page.locator('.lw-page[data-page="3"]').click();
  await expect(cards).toHaveCount(3);

  await page.locator('[data-filter="unit"]').selectOption('Unit A');
  await expect(cards).toHaveCount(5);
  await expect(page.locator('.lw-pagination')).toHaveCount(0);
  await page.locator('[data-filter="unit"]').selectOption('__none__');
  await expect(cards).toHaveCount(3);
  await page.locator('[data-filter="unit"]').selectOption('');
  await page.locator('[data-filter="status"]').selectOption('review');
  await expect(cards).toHaveCount(3);
  await page.locator('[data-filter="status"]').selectOption('');
  await page.locator('[data-filter="sort"]').selectOption('title');
  await expect(cards.first()).toContainText('Item 00');
  await page.locator('#lw-search').fill('Item 2');
  await expect(cards).toHaveCount(3);
  await expect(page.locator('#lw-search')).toBeFocused();

  await page.locator('.lw-nav [data-act="tab"][data-tab="mistakes"]').click();
  await expect(page.locator('#language-workspace-root .lw-item')).toHaveCount(3);
});

test('personal notes can be added, edited and deleted and survive refresh', async ({ page }) => {
  await openLanguageWorkspace(page);
  await addLanguageItem(page, { title: 'E2E notes item' });
  await page.locator('#lw-card-list [data-act="detail"]').first().click();
  await page.locator('#lw-note-new').fill('first note');
  await page.locator('[data-form="note-add"] button[type="submit"]').click();
  await expect(page.locator('.lw-note-list')).toContainText('first note');

  await page.locator('[data-act="note-edit"]').click();
  await page.locator('#lw-note-edit').fill('edited note');
  await page.locator('[data-form="note-edit"] button[type="submit"]').click();
  await expect(page.locator('.lw-note-list')).toContainText('edited note');

  await page.reload();
  await loginToLocalTestApp(page);
  let stored = await readWorkspace(page);
  expect(stored.notes).toHaveLength(1);
  expect(stored.notes[0].text).toBe('edited note');

  await page.locator('#lw-card-list [data-act="detail"]').first().click();
  page.once('dialog', d => d.accept());
  await page.locator('[data-act="note-delete"]').click();
  await expect(page.locator('.lw-notes')).toContainText('还没有笔记');
  stored = await readWorkspace(page);
  expect(stored.notes).toHaveLength(0);
});

test('exports V2 backup and imports both V1 and V2 backups', async ({ page }) => {
  await openLanguageWorkspace(page);
  await addLanguageItem(page, { title: 'E2E export record' });
  await page.locator('.lw-nav [data-act="tab"][data-tab="settings"]').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-act="export"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^language-study-backup-.*\.json$/);
  const exported = JSON.parse(await (await download.createReadStream()).toArray().then(c => Buffer.concat(c).toString('utf8')));
  expect(exported.schemaVersion).toBe(2);
  expect(exported.moduleType).toBe('language-workspace');
  expect(Array.isArray(exported.notes)).toBe(true);

  page.on('dialog', d => d.accept());
  const v1 = { schemaVersion: 1, items: [{ id: 'x', title: 'Imported V1', language: '英语', type: 'vocabulary', status: 'mistake' }], records: [] };
  await page.locator('#lw-import-file').setInputFiles({ name: 'v1.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(v1)) });
  await expect.poll(async () => (await readWorkspace(page)).items.map(x => x.title)).toEqual(['Imported V1']);
  expect((await readWorkspace(page)).items[0].status).toBe('review');

  await page.locator('.lw-nav [data-act="tab"][data-tab="settings"]').click();
  await page.locator('#lw-import-file').setInputFiles({ name: 'v2.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
  await expect.poll(async () => (await readWorkspace(page)).items.map(x => x.title)).toEqual(['E2E export record']);

  const before = JSON.stringify(await readWorkspace(page));
  await page.locator('.lw-nav [data-act="tab"][data-tab="settings"]').click();
  await page.locator('#lw-import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":1}') });
  await expect(page.locator('#lw-toast')).toContainText('格式不正确');
  expect(JSON.stringify(await readWorkspace(page))).toBe(before);
});
