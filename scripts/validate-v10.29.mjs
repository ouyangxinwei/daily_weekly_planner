import fs from 'node:fs';import assert from 'node:assert/strict';import vm from 'node:vm';
const h=fs.readFileSync('index.html','utf8'),i=fs.readFileSync('i18n.js','utf8'),sw=fs.readFileSync('sw.js','utf8');
for(const x of ["MEMO_KEY='personal-memo:v1'","memo:MEMO_KEY","memo:'memo'","module-memo","MEMO_DEFAULT_CATEGORIES","migrateLocalOneStarTasks","migrateCloudOneStarTasks","migrateOneStarAcrossModuleStates","memoSourceModule","_memoMigrationVersion","const PAGE_SIZE=10"])assert.ok(h.includes(x),x);
assert.ok(i.includes("'备忘':'Memo'")&&i.includes("'备忘':'メモ'"));assert.ok(sw.includes('daily-weekly-planner-v10-30-module-star-statistics'));
assert.ok(fs.readFileSync('CHANGELOG.md','utf8').includes('# V10.29'));assert.ok(fs.readFileSync('CHANGELOG.en.md','utf8').includes('# V10.29'));assert.ok(fs.readFileSync('CHANGELOG.ja.md','utf8').includes('# V10.29'));

const helperStart=h.indexOf('function buildPrioritySummary(');
const helperEnd=h.indexOf('\n    function renderStarSummary',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart,'module star statistics helper exists');
const helperSource=h.slice(helperStart,helperEnd);
const buildPrioritySummary=vm.runInNewContext('('+helperSource+')',{validPriority:value=>Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=5?Number(value):3});
const summary=buildPrioritySummary([{id:'a',priority:5},{id:'b',priority:3},{id:'c',priority:3},{id:'d',priority:1,archivedAt:'2026-11-01'},{id:'e',priority:2},{id:'f',priority:4}],{'b|work':true},plan=>plan.id+'|work');
assert.equal(summary.total,4,'completed and archived tasks are excluded from open-task statistics');
assert.deepEqual(JSON.parse(JSON.stringify(summary.counts)),{'1':0,'2':1,'3':1,'4':1,'5':1});
assert.ok(h.includes("const supportedModules=['work','language','organize','results','future']"));
assert.ok(h.includes("APP_VERSION='V10.30_module_star_statistics'"));
assert.ok(h.includes("share.textContent=percent+'%'"));
assert.ok(h.includes("activePages[paginationKey()]=Math.floor(Math.max(0,targetIndex)/PAGE_SIZE)+1"));
assert.ok(h.includes(".memo-mode #star-summary{display:none!important}"));
for(const mode of ['work','language','organize','results','future'])assert.ok(!h.includes('.'+mode+'-mode #star-summary'),'star summary remains visible in '+mode);
assert.ok(i.includes('"未完成任务 · 星级分布":"Open Tasks · Priority Distribution"'));
assert.ok(fs.readFileSync('CHANGELOG.md','utf8').startsWith('# V10.30'));
assert.ok(fs.readFileSync('CHANGELOG.en.md','utf8').startsWith('# V10.30'));
assert.ok(fs.readFileSync('CHANGELOG.ja.md','utf8').startsWith('# V10.30'));

console.log('V10.29 Memo migration and V10.30 module star statistics checks passed.');
