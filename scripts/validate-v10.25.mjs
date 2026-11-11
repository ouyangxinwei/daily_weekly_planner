import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const i18n = fs.readFileSync(new URL('../i18n.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

assert.match(html, /APP_VERSION='V10\.27_move_plan_to_results_future'/);
assert.match(html, /SYNC_META_KEY='personal-planner:sync-meta:v1'/);
for (const name of ['uploadCloudState', 'downloadCloudState', 'uploadAllCloudState', 'downloadAllCloudState']) {
  const start = html.indexOf('async function ' + name + '(');
  assert.notEqual(start, -1, name + ' exists');
  const end = html.indexOf('\n    async function ', start + 10);
  const body = html.slice(start, end < 0 ? html.length : end);
  assert.match(body, /confirmSync\(/, name + ' requires explicit pre-sync confirmation');
}
assert.match(html, /assertCloudUnchanged\(/, 'cloud snapshot is rechecked after confirmation');
assert.match(html, /_syncMeta/, 'cloud module timestamps are carried in snapshot metadata');
assert.match(html, /function save\(nextState=state\)[\s\S]*?writeLocalSyncMeta/, 'local saves update independent sync metadata');
assert.match(i18n, /Pre-sync data check/);
assert.match(i18n, /同期前のデータ確認/);
assert.match(sw, /daily-weekly-planner-v10-28-pagination/);
console.log('V10.26 sync overwrite protection static checks passed.');
