import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('language-workspace.js', 'utf8');
const css = fs.readFileSync('language-workspace.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const gitignore = fs.readFileSync('.gitignore', 'utf8');
const zh = fs.readFileSync('CHANGELOG.md', 'utf8');
const en = fs.readFileSync('CHANGELOG.en.md', 'utf8');
const ja = fs.readFileSync('CHANGELOG.ja.md', 'utf8');

// 版本与缓存
assert.ok(html.includes("APP_VERSION='V10.40_weekly_weather_bottom'"));
assert.ok(sw.includes("const CACHE_NAME = 'daily-weekly-planner-v10-40-weekly-weather-bottom'"));
assert.equal(fs.readFileSync('VERSION', 'utf8').trim(), '10.39.0');
assert.ok(zh.includes('# V10.38') && en.includes('# V10.38') && ja.includes('# V10.38'));
assert.ok(html.includes('src="./language-workspace.js?v=2.1.0"'));
assert.ok(js.includes("const WORKSPACE_VERSION = '2.1.0'"));

// 托业题库页
assert.ok(js.includes("['toeic', '托业题库', '♪']"));
for (const act of ['toeic-open', 'toeic-part', 'toeic-nav', 'toeic-page', 'toeic-pick', 'toeic-script', 'toeic-answer', 'toeic-clear']) assert.ok(js.includes("case '" + act + "'"), act);
for (const c of ['.lw-sets', '.lw-exq', '.lw-opt.is-correct', '.lw-opt.is-wrong', '.lw-script-body', 'html[data-theme="dark"] .lw-opt']) assert.ok(css.includes(c), c);
assert.ok(fs.existsSync('tests/e2e/toeic-workspace.spec.js'));
assert.ok(fs.existsSync('tools/toeic_tool.py'));
// 题目内容有版权，导入数据不得进入仓库
for (const p of ['language-workspace-import.json', 'tools/input/', 'tools/output/']) assert.ok(gitignore.includes(p), '.gitignore ' + p);

// 在沙箱中执行模块：exam 字段的规范化通过 upgrade() 验证
const sandbox = { window: {}, document: { readyState: 'loading', addEventListener() {} }, crypto: { randomUUID: () => 'id-' + Math.random() }, console };
vm.createContext(sandbox);
vm.runInContext(js, sandbox);
const { upgrade, version } = sandbox.window.LanguageWorkspace;
assert.equal(version, '2.1.0');
const T = '2026-01-01T00:00:00.000Z';
const item = (id, extra = {}) => ({ id, title: id, language: '英语', type: 'listening', category: 'c', prompt: '', answer: '', options: [], notes: '', status: 'not_started', createdAt: T, updatedAt: T, ...extra });
const out = upgrade({
  schemaVersion: 2, records: [], notes: [], settings: { activeTab: 'toeic', toeic: { picks: { 'toeic-s06-t1-pt1-q001': 'B' } } },
  items: [
    item('a', { exam: { set: 6, test: 1, part: 3, number: 44, groupStart: 44, groupEnd: 46 } }),
    item('toeic-s09-t2-pt3-q047'),                                   // 没有 exam：按 id 推算题组
    item('toeic-s09-t2-pt4-q100'),
    item('toeic-s09-t2-pt2-q010'),                                   // Pt1、Pt2 没有题组
    item('bad', { exam: { set: 'x', test: 1, part: 9, number: 'bad' } }),
    item('outside', { exam: { set: 6, test: 1, part: 3, number: 50, groupStart: 44, groupEnd: 46 } }),
    item('toeic-s06-t1-pt5-q101'),                                   // Pt5 以上不识别
    item('plain-word', { type: 'vocabulary' })
  ]
});
const byId = id => out.items.find(x => x.id === id);
assert.deepEqual({ ...byId('a').exam }, { set: 6, test: 1, part: 3, number: 44, groupStart: 44, groupEnd: 46 });
assert.deepEqual({ ...byId('toeic-s09-t2-pt3-q047').exam }, { set: 9, test: 2, part: 3, number: 47, groupStart: 47, groupEnd: 49 });
assert.deepEqual({ ...byId('toeic-s09-t2-pt4-q100').exam }, { set: 9, test: 2, part: 4, number: 100, groupStart: 98, groupEnd: 100 });
assert.deepEqual({ ...byId('toeic-s09-t2-pt2-q010').exam }, { set: 9, test: 2, part: 2, number: 10 });
for (const id of ['bad', 'outside', 'toeic-s06-t1-pt5-q101', 'plain-word']) assert.equal(byId(id).exam, undefined, id);
assert.equal(out.settings.activeTab, 'toeic');
assert.equal(out.settings.toeic.picks['toeic-s06-t1-pt1-q001'], 'B', 'picks survive import');

// 抽取纯函数验证：原文/题目拆分、正确答案识别、选项解析
const extract = name => {
  const start = js.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name + ' not found');
  let depth = 0, i = js.indexOf('{', start);
  for (; i < js.length; i++) {
    if (js[i] === '{') depth++;
    else if (js[i] === '}' && --depth === 0) break;
  }
  return js.slice(start, i + 1);
};
const fns = new Function(
  "const SCRIPT_MARK = '【原文】', QUESTION_MARK = '【题目】', LETTERS = ['A', 'B', 'C', 'D'];" +
  extract('splitPrompt') + extract('correctLetter') + extract('parseOptions') +
  'return { splitPrompt, correctLetter, parseOptions };')();

assert.deepEqual(fns.splitPrompt('【原文】\nScript line.\n\n【题目】\nNumber 1. Q?'), { script: 'Script line.', question: 'Number 1. Q?' });
assert.deepEqual(fns.splitPrompt('Number 2. Plain.'), { script: '', question: 'Number 2. Plain.' });
assert.equal(fns.correctLetter({ answer: 'C' }), 'C');
assert.equal(fns.correctLetter({ answer: 'B) Some text' }), 'B');
assert.equal(fns.correctLetter({ answer: ' D。' }), 'D');
assert.equal(fns.correctLetter({ answer: 'A man is walking.' }), '', 'sentence starting with A is not an option letter');
assert.equal(fns.correctLetter({ answer: '' }), '');
const opts = fns.parseOptions({ options: ['A) One', 'B) [待补充 6_T1_pt3_num44_B]', 'no letter'] });
assert.deepEqual(opts.map(o => [o.letter, o.text, o.missing]), [['A', 'One', false], ['B', '[待补充 6_T1_pt3_num44_B]', true], ['C', 'no letter', false]]);

console.log('V10.38 TOEIC question bank validation passed.');
