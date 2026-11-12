import fs from 'node:fs';import assert from 'node:assert/strict';
const h=fs.readFileSync('index.html','utf8'),i=fs.readFileSync('i18n.js','utf8'),sw=fs.readFileSync('sw.js','utf8');
for(const x of ["MEMO_KEY='personal-memo:v1'","memo:MEMO_KEY","memo:'memo'","module-memo","MEMO_DEFAULT_CATEGORIES","migrateLocalOneStarTasks","migrateCloudOneStarTasks","migrateOneStarAcrossModuleStates","memoSourceModule","_memoMigrationVersion","const PAGE_SIZE=10"])assert.ok(h.includes(x),x);
assert.ok(i.includes("'备忘':'Memo'")&&i.includes("'备忘':'メモ'"));assert.ok(sw.includes('daily-weekly-planner-v10-29-memo-migration'));
assert.ok(fs.readFileSync('CHANGELOG.md','utf8').startsWith('# V10.29'));assert.ok(fs.readFileSync('CHANGELOG.en.md','utf8').startsWith('# V10.29'));assert.ok(fs.readFileSync('CHANGELOG.ja.md','utf8').startsWith('# V10.29'));
console.log('Memo module static checks passed.');
