import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const zh = fs.readFileSync('CHANGELOG.md', 'utf8');
const en = fs.readFileSync('CHANGELOG.en.md', 'utf8');
const ja = fs.readFileSync('CHANGELOG.ja.md', 'utf8');

assert.match(html, /APP_VERSION='V10\.(3[6-9]|40)_[a-z0-9_]+'/);
assert.match(sw, /daily-weekly-planner-v10-(3[6-9]|40)-/);
assert.match(fs.readFileSync('VERSION', 'utf8').trim(), /^10\.(3[6-9]|40)\.\d+$/);
assert.ok(zh.includes('# V10.36') && en.includes('# V10.36') && ja.includes('# V10.36'));

// 两个上传入口都写入 _clientSyncMeta
assert.ok(html.includes('payload._clientSyncMeta={modules:{...(syncMeta&&syncMeta.modules||{})}}'), 'whole upload stores client module times');
assert.ok(html.includes('payload._clientSyncMeta={modules:moduleTimes}'), 'single-module upload stores client module times');

// 抽取 cloudSyncMeta 并在隔离环境中验证比较逻辑
const extract = name => {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name + ' not found');
  let depth = 0, i = html.indexOf('{', start);
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) break;
  }
  return html.slice(start, i + 1);
};
const ALL_MODULES = ['plan', 'work', 'language', 'organize', 'results', 'future', 'memo'];
const cloudSyncMeta = new Function('ALL_MODULES', extract('validSyncTimestamp') + extract('cloudSyncMeta') + 'return cloudSyncMeta;')(ALL_MODULES);

const T = h => `2026-11-18T0${h}:00:00.000Z`;
const serverSix = { plan: T(1), work: T(1), language: T(1), organize: T(1), results: T(1), future: T(1) };

// 服务器端 _syncMeta 不含 memo 时，使用上传时保存的 _clientSyncMeta
let meta = cloudSyncMeta({ _syncMeta: { updatedAt: T(9), modules: serverSix }, _clientSyncMeta: { modules: { ...serverSix, memo: T(5) } } });
assert.equal(meta.modules.memo, T(5));
assert.equal(meta.modules.plan, T(1));
assert.equal(meta.updatedAt, T(9));

// 服务器值优先
meta = cloudSyncMeta({ _syncMeta: { updatedAt: T(9), modules: { ...serverSix, plan: T(2) } }, _clientSyncMeta: { modules: { plan: T(1), memo: T(5) } } });
assert.equal(meta.modules.plan, T(2));

// 旧快照：没有 _clientSyncMeta 时保持原行为（memo 无法确认）
meta = cloudSyncMeta({ _syncMeta: { updatedAt: T(9), modules: serverSix } });
assert.equal(meta.modules.memo, null);

// 没有模块时间表时，全部回退到数据库更新时间
meta = cloudSyncMeta({ _syncMeta: { updatedAt: T(9) } });
assert.ok(ALL_MODULES.every(m => meta.modules[m] === T(9)));

// 无效时间被忽略
meta = cloudSyncMeta({ _syncMeta: { updatedAt: T(9), modules: serverSix }, _clientSyncMeta: { modules: { memo: 'not-a-date' } } });
assert.equal(meta.modules.memo, null);

console.log('V10.36 sync time memo fix validation passed.');
