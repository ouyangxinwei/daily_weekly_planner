import { test, expect } from '@playwright/test';
import { openLocalTestApp, loginToLocalTestApp, openLanguageWorkspace, readWorkspace } from './helpers.js';

// 托业题库页（套 → T → Part、题组一页、原文折叠、选项点选判对错）。
// 这里的题目全部是编造的示例文字，不含任何真实考试内容。

const T = '2026-01-01T00:00:00.000Z';
const optionsOf = (tag, count, missing) => ['A', 'B', 'C', 'D'].slice(0, count).map(l => l + ') ' + (missing ? `[待补充 ${tag}_${l}]` : `Sample ${tag} option ${l}`));

function toeicItem(set, test, part, number, extra = {}) {
  const grouped = part >= 3;
  const gs = extra.groupStart, ge = extra.groupEnd;
  const question = `Number ${number}. Sample question ${number}.` + (extra.graphic ? ' Look at the graphic.' : '');
  const prompt = grouped
    ? `【原文】\nQuestions ${gs} through ${ge} refer to the following conversation.\nScript line for group ${gs}.\nAnother script line for group ${gs}.\n\n【题目】\n${question}`
    : question;
  const item = {
    id: `toeic-s${String(set).padStart(2, '0')}-t${test}-pt${part}-q${String(number).padStart(3, '0')}`,
    title: `第${set}套 T${test} Pt${part} Q${number}`,
    language: '英语', type: 'listening', category: `Pt${part}`, unit: `第${set}套 T${test}`, level: '',
    prompt, options: optionsOf(`q${number}`, part === 2 ? 3 : 4, extra.missing),
    answer: extra.answer || '', notes: extra.notes || '',
    status: 'not_started', lastStudiedAt: null, createdAt: T, updatedAt: T,
    exam: { set, test, part, number, ...(grouped ? { groupStart: gs, groupEnd: ge } : {}) }
  };
  if (extra.noExam) delete item.exam;
  return item;
}

function sampleBank() {
  const items = [
    toeicItem(6, 1, 1, 1), toeicItem(6, 1, 1, 2),
    ...[7, 8, 9, 10, 11, 12, 13].map(n => toeicItem(6, 1, 2, n)),
    toeicItem(6, 1, 3, 32, { groupStart: 32, groupEnd: 34, answer: 'B', notes: 'Sample explanation.' }),
    toeicItem(6, 1, 3, 33, { groupStart: 32, groupEnd: 34, missing: true }),
    toeicItem(6, 1, 3, 34, { groupStart: 32, groupEnd: 34, answer: 'C) Sample q34 option C' }),
    toeicItem(6, 1, 3, 35, { groupStart: 35, groupEnd: 37 }),
    toeicItem(6, 1, 3, 36, { groupStart: 35, groupEnd: 37 }),
    toeicItem(6, 1, 3, 37, { groupStart: 35, groupEnd: 37, graphic: true }),
    toeicItem(6, 1, 4, 71, { groupStart: 71, groupEnd: 73 }),
    toeicItem(6, 1, 4, 72, { groupStart: 71, groupEnd: 73 }),
    toeicItem(6, 1, 4, 73, { groupStart: 71, groupEnd: 73 }),
    toeicItem(7, 2, 1, 1)
  ];
  return items;
}

const bankJson = items => JSON.stringify({ schemaVersion: 2, moduleType: 'language-workspace', items, records: [], notes: [], settings: { activeTab: 'home' } });

async function importBank(page, items = sampleBank()) {
  await openLanguageWorkspace(page);
  await page.locator('[data-act="tab"][data-tab="settings"]').click();
  page.once('dialog', d => d.accept());
  await page.locator('#lw-import-file').setInputFiles({ name: 'bank.json', mimeType: 'application/json', buffer: Buffer.from(bankJson(items)) });
  await expect.poll(async () => (await readWorkspace(page))?.items.length).toBe(items.length);
}

const openToeic = page => page.locator('[data-act="tab"][data-tab="toeic"]').click();
async function openPart(page, set, test, part) {
  await openToeic(page);
  await page.locator(`[data-act="toeic-open"][data-set="${set}"][data-test="${test}"]`).click();
  await page.locator(`[data-act="toeic-part"][data-part="${part}"]`).click();
}
const optionOf = (page, number, letter) => page.locator(`.lw-exq:has(.lw-exq-no:text-is("Q${number}")) .lw-opt[data-letter="${letter}"]`);
const questionOf = (page, number) => page.locator(`.lw-exq:has(.lw-exq-no:text-is("Q${number}"))`);

test.beforeEach(async ({ page }) => {
  await openLocalTestApp(page);
});

test('toeic tab shows an empty state that leads to data management', async ({ page }) => {
  await openLanguageWorkspace(page);
  await openToeic(page);
  await expect(page.locator('#lw-view .lw-empty')).toContainText('还没有托业题');
  await page.locator('#lw-view .lw-empty [data-act="tab"][data-tab="settings"]').click();
  await expect(page.locator('#lw-view')).toContainText('数据管理');
});

test('browses 套 → T → Part and shows each Pt3 group on one page', async ({ page }) => {
  await importBank(page);
  await openToeic(page);
  await expect(page.locator('.lw-set')).toHaveCount(2);
  await expect(page.locator('.lw-set').first()).toContainText('第 6 套');
  await expect(page.locator('.lw-set').first()).toContainText('已答 0/');

  await page.locator('[data-act="toeic-open"][data-set="6"][data-test="1"]').click();
  await expect(page.locator('.lw-crumbs')).toContainText('托业题库');
  await expect(page.locator('.lw-part')).toHaveCount(4);
  await expect(page.locator('.lw-part').nth(2)).toContainText('Pt3 对话');
  await expect(page.locator('.lw-part').nth(2)).toContainText('6 题 · 2 组');

  await page.locator('[data-act="toeic-part"][data-part="3"]').click();
  await expect(page.locator('.lw-exq')).toHaveCount(3);
  await expect(page.locator('.lw-exq-no')).toHaveText(['Q32', 'Q33', 'Q34']);
  await expect(page.locator('.lw-chip')).toHaveCount(2);
  await expect(page.locator('.lw-chip.current')).toHaveText('32–34');

  await page.locator('[data-act="toeic-page"]', { hasText: '下一组' }).click();
  await expect(page.locator('.lw-exq-no')).toHaveText(['Q35', 'Q36', 'Q37']);
  const finish = page.locator('.lw-exam-foot [data-act="toeic-nav"][data-level="test"]');
  await expect(finish).toContainText('完成，返回 Part 列表');
  await expect(page.locator('.lw-exam-foot [data-act="toeic-page"]', { hasText: '下一组' })).toHaveCount(0);
  await finish.click();
  await expect(page.locator('.lw-part')).toHaveCount(4);

  await page.locator('.lw-crumbs [data-level="root"]').click();
  await expect(page.locator('.lw-set')).toHaveCount(2);
});

test('script is collapsed by default, the question stays separate, and Pt2 is paged by five', async ({ page }) => {
  await importBank(page);
  await openPart(page, 6, 1, 3);
  const toggle = page.locator('.lw-script-btn');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.lw-script-body')).toHaveCount(0);
  await expect(page.locator('.lw-exq-text').first()).toHaveText('Sample question 32.');
  await toggle.click();
  await expect(page.locator('.lw-script-body')).toContainText('Script line for group 32.');
  await expect(page.locator('.lw-exq-text').first()).not.toContainText('Script line');
  await page.locator('.lw-script-btn').click();
  await expect(page.locator('.lw-script-body')).toHaveCount(0);

  await page.locator('.lw-crumbs [data-level="test"]').click();
  await page.locator('[data-act="toeic-part"][data-part="2"]').click();
  await expect(page.locator('.lw-script')).toHaveCount(0);
  await expect(page.locator('.lw-exq')).toHaveCount(5);
  await expect(page.locator('.lw-chip')).toHaveCount(2);
  await page.locator('.lw-chip').nth(1).click();
  await expect(page.locator('.lw-exq-no')).toHaveText(['Q12', 'Q13']);
  await expect(optionOf(page, 12, 'D')).toHaveCount(0);   // Pt2 只有 A–C
});

test('picking an option judges it when an answer exists and only records it otherwise', async ({ page }) => {
  await importBank(page);
  await openPart(page, 6, 1, 3);

  // 有答案：选错 → 标出正确答案并显示解析
  await optionOf(page, 32, 'A').click();
  await expect(optionOf(page, 32, 'A')).toHaveClass(/is-wrong/);
  await expect(optionOf(page, 32, 'B')).toHaveClass(/is-correct/);
  await expect(questionOf(page, 32)).toContainText('回答错误，正确答案是 B');
  await expect(questionOf(page, 32).locator('.lw-answer')).toContainText('Sample explanation.');
  await expect(optionOf(page, 32, 'A')).toBeFocused();     // 重绘后焦点仍在被点的选项上

  // 没有答案：只记录选择，并提示尚未填写
  await optionOf(page, 33, 'C').click();
  await expect(optionOf(page, 33, 'C')).toHaveClass(/is-picked/);
  await expect(questionOf(page, 33)).toContainText('已记录你的选择 C（尚未填写正确答案）');
  await expect(questionOf(page, 33).locator('.lw-answer')).toHaveCount(0);
  await expect(optionOf(page, 33, 'A')).toHaveClass(/is-missing/);   // 占位选项用弱化样式

  // 答案写成 "C) 选项内容" 也能判断
  await optionOf(page, 34, 'C').click();
  await expect(optionOf(page, 34, 'C')).toHaveClass(/is-correct/);
  await expect(questionOf(page, 34)).toContainText('✓ 回答正确');

  // 记录在 settings.toeic.picks，题目进入「学习中」，并显示统计
  let stored = await readWorkspace(page);
  expect(stored.settings.toeic.picks).toEqual({
    'toeic-s06-t1-pt3-q032': 'A', 'toeic-s06-t1-pt3-q033': 'C', 'toeic-s06-t1-pt3-q034': 'C'
  });
  expect(stored.items.filter(x => x.status === 'learning').map(x => x.exam.number)).toEqual([32, 33, 34]);
  await expect(page.locator('.lw-panel-head .lw-count')).toContainText('已答 3/6 · 答对 1/2');

  // 刷新后仍保留
  await page.reload();
  await loginToLocalTestApp(page);
  await openPart(page, 6, 1, 3);
  await expect(optionOf(page, 32, 'A')).toHaveClass(/is-wrong/);
  await expect(optionOf(page, 34, 'C')).toHaveClass(/is-correct/);

  // 清除本组选择
  await page.locator('[data-act="toeic-clear"]').click();
  await expect(page.locator('.lw-opt.is-picked, .lw-opt.is-wrong, .lw-opt.is-correct')).toHaveCount(0);
  stored = await readWorkspace(page);
  expect(stored.settings.toeic.picks).toEqual({});
});

test('answer can be revealed before picking, and graphic questions are flagged', async ({ page }) => {
  await importBank(page);
  await openPart(page, 6, 1, 3);
  await expect(questionOf(page, 33).locator('[data-act="toeic-answer"]')).toHaveCount(0);   // 没有答案时不显示按钮
  await questionOf(page, 32).locator('[data-act="toeic-answer"]').click();
  await expect(questionOf(page, 32).locator('.lw-answer')).toContainText('B');
  await questionOf(page, 32).locator('[data-act="toeic-answer"]').click();
  await expect(questionOf(page, 32).locator('.lw-answer')).toHaveCount(0);
  await page.locator('[data-act="toeic-page"]', { hasText: '下一组' }).click();
  await expect(questionOf(page, 37).locator('.lw-exq-tag')).toContainText('需看图表');
  await expect(questionOf(page, 35).locator('.lw-exq-tag')).toHaveCount(0);
});

test('detail page and content cards keep the script out of the question', async ({ page }) => {
  await importBank(page);
  await openPart(page, 6, 1, 3);
  await questionOf(page, 33).locator('[data-act="detail"]').click();
  await expect(page.locator('.lw-detail-title')).toHaveText('第6套 T1 Pt3 Q33');
  await expect(page.locator('.lw-script-btn')).toBeVisible();
  await expect(page.locator('.lw-script-body')).toHaveCount(0);
  await expect(page.locator('.lw-detail .lw-opt, .lw-quiz .lw-opt').first()).toBeVisible();
  await page.locator('[data-act="back"]').click();
  await expect(page.locator('.lw-exq-no')).toHaveText(['Q32', 'Q33', 'Q34']);   // 返回到题组页

  await page.locator('[data-act="tab"][data-tab="content"]').first().click();
  const card = page.locator('#lw-card-list .lw-item', { hasText: 'Pt3 Q33' });
  await expect(card.locator('p').first()).toContainText('Sample question 33');
  await expect(card.locator('p').first()).not.toContainText('Script line');
});

test('legacy items without exam are recognised by id; other items stay plain', async ({ page }) => {
  const legacy = [
    toeicItem(9, 2, 3, 47, { noExam: true }),
    toeicItem(9, 2, 4, 100, { noExam: true }),
    { id: 'my-word', title: 'abandon', language: '英语', type: 'vocabulary', category: '单词', unit: '', level: '', prompt: 'abandon', options: [], answer: '放弃', notes: '', status: 'not_started', lastStudiedAt: null, createdAt: T, updatedAt: T,
      exam: { set: 'x', test: 1, part: 9, number: 'bad' } }   // 无效的 exam 会被丢弃
  ];
  await importBank(page, legacy);
  const stored = await readWorkspace(page);
  expect(stored.items.find(x => x.id === 'my-word').exam).toBeUndefined();
  expect(stored.items.find(x => x.id.endsWith('pt3-q047')).exam).toEqual({ set: 9, test: 2, part: 3, number: 47, groupStart: 47, groupEnd: 49 });
  expect(stored.items.find(x => x.id.endsWith('pt4-q100')).exam).toEqual({ set: 9, test: 2, part: 4, number: 100, groupStart: 98, groupEnd: 100 });

  await openToeic(page);
  await expect(page.locator('.lw-set')).toHaveCount(1);
  await page.locator('[data-act="toeic-open"][data-set="9"][data-test="2"]').click();
  await page.locator('[data-act="toeic-part"][data-part="4"]').click();
  await expect(page.locator('.lw-exq-no')).toHaveText(['Q100']);
  await expect(page.locator('.lw-panel-head p')).toContainText('第 1 / 1 组');
  await expect(page.locator('.lw-chip')).toHaveCount(0);   // 只有一页时不显示页码
});

test('picks travel with the exported backup', async ({ page }) => {
  await importBank(page);
  await openPart(page, 6, 1, 1);
  await optionOf(page, 1, 'B').click();
  await page.locator('[data-act="tab"][data-tab="settings"]').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-act="export"]').click();
  const download = await downloadPromise;
  const exported = JSON.parse(Buffer.concat(await (await download.createReadStream()).toArray()).toString('utf8'));
  expect(exported.settings.toeic.picks).toEqual({ 'toeic-s06-t1-pt1-q001': 'B' });
  expect(exported.items.find(x => x.exam?.number === 32).exam.groupEnd).toBe(34);
});
