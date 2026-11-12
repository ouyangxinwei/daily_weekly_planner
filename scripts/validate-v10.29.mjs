import fs from 'node:fs';import assert from 'node:assert/strict';import vm from 'node:vm';
const h=fs.readFileSync('index.html','utf8'),i=fs.readFileSync('i18n.js','utf8'),sw=fs.readFileSync('sw.js','utf8');
for(const x of ["MEMO_KEY='personal-memo:v1'","memo:MEMO_KEY","memo:'memo'","module-memo","MEMO_DEFAULT_CATEGORIES","migrateLocalOneStarTasks","migrateCloudOneStarTasks","migrateOneStarAcrossModuleStates","memoSourceModule","_memoMigrationVersion","const PAGE_SIZE=10"])assert.ok(h.includes(x),x);
assert.ok(i.includes("'备忘':'Memo'")&&i.includes("'备忘':'メモ'"));assert.ok(sw.includes('daily-weekly-planner-v10-31-plan-star-search-order'));
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
assert.ok(h.includes("APP_VERSION='V10.31_plan_star_search_order'"));
assert.ok(h.includes("share.textContent=percent+'%'"));
assert.ok(h.includes("activePages[paginationKey()]=Math.floor(target.index/PAGE_SIZE)+1")&&h.includes("activePages[paginationKey()]=Math.floor(targetIndex/PAGE_SIZE)+1"));
assert.ok(h.includes(".memo-mode #star-summary{display:none!important}"));
for(const mode of ['work','language','organize','results','future'])assert.ok(!h.includes('.'+mode+'-mode #star-summary'),'star summary remains visible in '+mode);
assert.ok(i.includes('"未完成任务 · 星级分布":"Open Tasks · Priority Distribution"'));
assert.ok(fs.readFileSync('CHANGELOG.md','utf8').startsWith('# V10.31'));
assert.ok(fs.readFileSync('CHANGELOG.en.md','utf8').startsWith('# V10.31'));
assert.ok(fs.readFileSync('CHANGELOG.ja.md','utf8').startsWith('# V10.31'));


assert.ok(h.includes("summary.eligible.filter(plan=>GLOBAL_SEARCH_PERIODS.includes(plan.period))"));
assert.ok(h.includes("findFirstPriorityPeriod(state.plans,priority,state.completions,completionKey,$('sort-order').value,GLOBAL_SEARCH_PERIODS)"));
assert.ok(i.includes('"没有找到符合条件的未完成任务":"No matching open task was found"'));
const a=h.indexOf('function findFirstPriorityTarget('),b=h.indexOf('function findFirstPriorityPeriod(',a),c=h.indexOf('function renderPagination(',b);
assert.ok(a>=0&&b>a&&c>b);
const findTarget=vm.runInNewContext('('+h.slice(a,b).trim()+')',{validPriority:v=>Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=5?Number(v):3});
const findPeriod=vm.runInNewContext('('+h.slice(b,c).trim()+')',{findFirstPriorityTarget:findTarget,validPriority:v=>Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=5?Number(v):3});
const rows=[{id:'d1',period:'daily',title:'Daily no',priority:4,createdAt:'2026-01-01'},{id:'dr2',period:'daily_random',title:'Z',priority:2,createdAt:'2026-01-02'},{id:'dr1',period:'daily_random',title:'A',priority:2,createdAt:'2026-01-03'},{id:'w1',period:'weekly',title:'Weekly',priority:2,createdAt:'2026-01-04'},{id:'wr1',period:'weekly_random',title:'Weekly random',priority:2,createdAt:'2026-01-05'},{id:'m1',period:'monthly',title:'Monthly',priority:2,createdAt:'2026-01-06'},{id:'mr1',period:'monthly_random',title:'Monthly random',priority:2,createdAt:'2026-01-07'},{id:'y1',period:'yearly',title:'Yearly',priority:2,createdAt:'2026-01-08'}];
const key=p=>p.id,order=['daily','daily_random','weekly','weekly_random','monthly','monthly_random','yearly'];
const first=findPeriod(rows,2,{},key,'title',order);assert.equal(first.period,'daily_random');assert.equal(first.plan.id,'dr1');
const next=findPeriod(rows.filter(p=>p.period!=='daily_random'),2,{},key,'priority-desc',order);assert.equal(next.period,'weekly');
assert.equal(findPeriod(rows,1,{},key,'title',order),null);
console.log('V10.29/V10.30/V10.31 validation passed.');

