import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('language-workspace.js', 'utf8');
const css = fs.readFileSync('language-workspace.css', 'utf8');
const i18n = fs.readFileSync('i18n.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const zh = fs.readFileSync('CHANGELOG.md', 'utf8');
const en = fs.readFileSync('CHANGELOG.en.md', 'utf8');
const ja = fs.readFileSync('CHANGELOG.ja.md', 'utf8');

// 版本与缓存
assert.match(html, /APP_VERSION='V10\.3[5-9]_[a-z0-9_]+'/);
assert.match(html, /type="module" src="\.\/language-workspace\.js\?v=2\.\d+\.\d+"/);
assert.match(sw, /daily-weekly-planner-v10-3[5-9]-/);
assert.match(fs.readFileSync('VERSION', 'utf8').trim(), /^10\.3[5-9]\.\d+$/);
assert.ok(zh.includes('# V10.35') && en.includes('# V10.35') && ja.includes('# V10.35'));

// 工作区切换
assert.ok(html.includes('id="workspace-plan"') && html.includes('id="workspace-language"'));
assert.ok(html.includes("<script data-workspace-boot>try{if(localStorage.getItem('personal-planner:active-workspace:v1')==='language')"));
assert.ok(html.includes('html[data-workspace="language"] #app-shell>.top~*:not(#language-workspace-root):not(dialog){display:none!important}'));
assert.ok(!/<script>\s*try\{if\(localStorage\.getItem\('personal-planner:active-workspace/.test(html), 'boot script must not be the first bare <script> used by CI syntax checks');
assert.ok(js.includes("const WORKSPACE_KEY = 'personal-planner:active-workspace:v1'"));
assert.ok(!js.includes("'module-language'") && !js.includes('#module-language'), 'workspace must no longer hijack the language tasks module button');

// 外语任务模块保持原存储与同步分区
assert.ok(html.includes('id="module-language" aria-pressed="false">外语任务</button>'));
assert.ok(html.includes("LANGUAGE_KEY='personal-language:v1'"));
assert.ok(html.includes("language:'language'"));
assert.ok(i18n.includes('"外语任务":"Language Tasks"') && i18n.includes('"外语任务":"語学タスク"'));

// 工作区数据边界
assert.ok(js.includes("const KEY = 'personal-language-study-workspace:v1'"));
assert.ok(js.includes("const BACKUP_KEY = KEY + ':pre-v2-backup'"));
assert.ok(!js.includes('personal-language:v1'), 'workspace must not touch legacy language tasks storage');
assert.ok(!/\/rest\/v1|supabaseRequest|fetch\(|XMLHttpRequest/.test(js), 'workspace must not make network or Supabase requests');
for (const s of ['not_started', 'learning', 'completed', 'review', 'mastered']) assert.ok(js.includes(s + ':'), 'status ' + s);
for (const c of ['.lw-pagination', '.lw-note', '.lw-alert', 'html[data-theme="dark"] .lw-']) assert.ok(css.includes(c), c);

// 迁移逻辑：在沙箱中执行模块并调用暴露的 upgrade()
const sandbox = { window: {}, document: { readyState: 'loading', addEventListener() {} }, crypto: { randomUUID: () => 'id-' + Math.random() }, console };
vm.createContext(sandbox);
vm.runInContext(js, sandbox);
const { upgrade, schemaVersion } = sandbox.window.LanguageWorkspace;
assert.equal(schemaVersion, 2);
const v1 = {
  schemaVersion: 1,
  items: [
    { id: 'a', title: 'A', language: '英语', type: 'vocabulary', category: 'x', prompt: 'p', answer: 'q', options: [], notes: 'n', status: 'new', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', title: 'B', language: '日语', type: 'grammar', category: 'y', prompt: '', answer: '', options: ['1'], notes: '', status: 'mistake', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
    { id: 'c', title: 'C', language: '德语', type: 'reading', category: 'z', prompt: '', answer: '', options: [], notes: '', status: 'mastered', createdAt: '2026-01-03T00:00:00.000Z', updatedAt: '2026-01-03T00:00:00.000Z' }
  ],
  records: [
    { id: 'r1', itemId: 'b', title: 'B', language: '日语', result: 'mistake', at: '2026-02-01T00:00:00.000Z' },
    { id: 'r2', itemId: 'c', title: 'C', language: '德语', result: 'mastered', at: '2026-02-02T00:00:00.000Z' },
    { id: 'r3', itemId: 'deleted', title: 'D', language: '英语', result: 'mastered', at: '2026-02-03T00:00:00.000Z' }
  ],
  settings: { activeTab: 'records' }
};
const v2 = upgrade(v1);
assert.equal(v2.schemaVersion, 2);
assert.equal(v2.items.length, 3);
assert.equal(v2.records.length, 3);
assert.deepEqual(Array.from(v2.items, x => x.status), ['not_started', 'review', 'mastered']);
assert.deepEqual(Array.from(v2.records, r => r.action), ['review', 'master', 'master']);
assert.equal(v2.records[0].result, 'mistake', 'original V1 result field is kept');
assert.equal(v2.items[0].lastStudiedAt, null);
assert.equal(v2.items[1].lastStudiedAt, '2026-02-01T00:00:00.000Z');
assert.equal(v2.items[1].type, 'grammar');
assert.equal(v2.records[0].type, 'grammar');
assert.equal(v2.settings.activeTab, 'records');
assert.deepEqual(Array.from(v2.notes), []);
assert.equal(upgrade(v2).items.length, 3, 'V2 data is accepted unchanged');
assert.equal(upgrade({ schemaVersion: 3, items: [], records: [] }), null);
assert.equal(upgrade({ schemaVersion: 1, items: {}, records: [] }), null);
assert.equal(upgrade({ schemaVersion: 1, items: [{ title: 'no id' }], records: [] }), null);

console.log('V10.35 language workspace V2 validation passed.');
