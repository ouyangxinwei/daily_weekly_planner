import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const i18n = fs.readFileSync(new URL('../i18n.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const changelog = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const changelogEn = fs.readFileSync(new URL('../CHANGELOG.en.md', import.meta.url), 'utf8');
const changelogJa = fs.readFileSync(new URL('../CHANGELOG.ja.md', import.meta.url), 'utf8');

assert.ok(html.includes('function clearCloudMessage()'));
assert.ok(html.includes('function clearAllCloudMessage()'));
assert.ok(html.includes("SYNC_META_KEY='personal-planner:sync-meta:v1'"));
for (const [name, clearFn] of [
  ['uploadCloudState', 'clearCloudMessage'],
  ['downloadCloudState', 'clearCloudMessage'],
  ['uploadAllCloudState', 'clearAllCloudMessage'],
  ['downloadAllCloudState', 'clearAllCloudMessage']
]) {
  const start = html.indexOf('async function ' + name + '(');
  assert.notEqual(start, -1, name + ' exists');
  const end = html.indexOf('\n    async function ', start + 10);
  const body = html.slice(start, end < 0 ? html.length : end);
  assert.ok(body.includes('confirmSync('), name + ' requires explicit confirmation');
  assert.ok(body.includes('{' + clearFn + '();return;}'), name + ' clears status when confirmation is declined');
}
assert.ok(html.includes('function clearCloudMessage()'));
assert.ok(html.includes('function clearAllCloudMessage()'));
assert.ok(html.includes('assertCloudUnchanged('), 'cloud snapshot is rechecked after confirmation');
assert.ok(html.includes('_syncMeta'), 'cloud module timestamps remain supported');
assert.ok(changelog.includes('# V10.26'), 'V10.26 release notes remain in history');
assert.ok(changelog.includes('# V10.26'), 'V10.26 release notes remain in history');
assert.ok(changelogEn.includes('# V10.26'), 'English V10.26 notes remain in history');
assert.ok(changelogJa.includes('# V10.26'), 'Japanese V10.26 notes remain in history');
assert.ok(i18n.includes('Pre-sync data check'));
assert.ok(i18n.includes('同期前のデータ確認'));
console.log('V10.26 clear-sync-status-on-cancel checks passed.');
