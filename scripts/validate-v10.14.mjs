import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const i18n = fs.readFileSync('i18n.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

const required = [
  ['four module buttons', 'id="module-plan" aria-pressed="true"'],
  ['work module button', 'id="module-work"'],
  ['language module button', 'id="module-language"'],
  ['organize module button', 'id="module-organize"'],
  ['results module button', 'id="module-results"'],
  ['future module button', 'id="module-future"'],
  ['results local key', "RESULTS_KEY='personal-results:v1'"],
  ['future local key', "FUTURE_KEY='personal-future:v1'"],
  ['results defaults', "RESULTS_DEFAULT_CATEGORIES=['考试成绩','资格证书','学习成果','其他']"],
  ['future defaults', "FUTURE_DEFAULT_CATEGORIES=['短期目标','中期目标','长期目标','人生愿望','其他']"],
  ['six modules', "const ALL_MODULES=['plan','work','language','organize','results','future']"],
  ['results cloud partition', "results:'results'"],
  ['future cloud partition', "future:'future'"],
  ['work local key', "WORK_KEY='personal-work:v1'"],
  ['language local key', "LANGUAGE_KEY='personal-language:v1'"],
  ['plan defaults preserve order', "PLAN_DEFAULT_CATEGORIES=['学习','生活','健康','财务','兴趣','未分类']"],
  ['work defaults', "WORK_DEFAULT_CATEGORIES=['待处理','进行中','已完成','工作记录','会议','其他']"],
  ['language defaults', "LANGUAGE_DEFAULT_CATEGORIES=['英语','德语','俄语','日语','其他']"],
  ['plan migration runner', 'migrateLegacyPlanWorkCategory'],
  ['pure plan migration transformer', 'buildPlanCategoryMigration(source)'],
  ['migration persistence guard', 'save(migration.state)'],
  ['append fixed Uncategorized', "next.categories.push('未分类')"],
  ['trash migration', "item.plan?.category==='工作'"],
  ['fixed Uncategorized', "category==='未分类'"],
  ['work status field', 'id="work-status-field"'],
  ['persistent completion key', 'plan.id}|${activeModule}'],
  ['typed JSON backup', 'moduleType:activeModule'],
  ['module backup guard', 'raw?.moduleType!==activeModule'],
  ['legacy organizer partition', "organize:'organizer'"],
  ['cloud partition merge', 'payload[CLOUD_PARTITIONS[module]]=localState'],
  ['cloud partition download', 'data[CLOUD_PARTITIONS[module]]'],
  ['active module persistence', 'ACTIVE_MODULE_KEY'],
  ['service worker cache version', 'daily-weekly-planner-v10-28-pagination']
];
for (const [label, needle] of required) {
  const source = label === 'service worker cache version' ? sw : html;
  if (!source.includes(needle)) throw new Error('Missing application contract: ' + label);
}
if (html.includes('挪威语')) throw new Error('Norwegian category must not be present in app code');
for (const term of ['外语学习','英语','德语','俄语','日语','工作记录','会议','待处理','进行中']) {
  if (!i18n.includes(JSON.stringify(term))) throw new Error('Missing i18n source term: ' + term);
}
if (!changelog.includes('V10.24 成绩与未来双模块')) throw new Error('Missing V10.14 changelog');

const loggingRequired = [
  ['runtime log entry', 'id="open-runtime-logs"'],
  ['runtime log dialog', 'id="runtime-log-dialog"'],
  ['runtime log details', 'id="runtime-log-detail-dialog"'],
  ['runtime log search', 'id="runtime-log-search"'],
  ['runtime log export JSON', 'id="runtime-log-export-json"'],
  ['runtime log export CSV', 'id="runtime-log-export-csv"'],
  ['runtime log clear', 'id="runtime-log-clear"'],
  ['runtime log script', 'runtime-logs.js'],
  ['health check button', 'id="open-health-check"'],
  ['health check dialog', 'id="health-check-dialog"'],
  ['health check script', 'health-check.js'],
  ['Supabase request trace', "start('Cloud','supabaseRequest'"],
  ['data snapshot trace', "traceDataOperation('localModuleSnapshot'"],
  ['whole snapshot validation trace', "traceDataOperation('validateWholeCloudSnapshot'"],
  ['whole snapshot persistence trace', "traceDataOperation('persistWholeLocalSnapshot'"],
  ['runtime log app version', "APP_VERSION='V10."]
];
for (const [label, needle] of loggingRequired) {
  if (!html.includes(needle)) throw new Error('Missing runtime logging contract: ' + label);
}
const viewer = fs.readFileSync('runtime-logs.js', 'utf8');
for (const needle of ['AppLogger.list', 'executionId', 'application/json', 'text/csv', 'setDebug']) {
  if (!viewer.includes(needle)) throw new Error('Missing runtime log viewer capability: ' + needle);
}

const moveRequired = [
  ['move UI exists only in plan edit dialog', 'id="plan-move-field"'],
  ['move destination selector', 'id="plan-move-target"'],
  ['move action button', 'id="plan-move-button"'],
  ['one-way destination allowlist', "const allowed=['work','organize','language','results','future']"],
  ['move only from plan', "if(activeModule!=='plan'||!editingId||!allowed.includes(targetModule))return"],
  ['destination pending status', "status:'待处理'"],
  ['destination has no reminder', "dueAt:''"],
  ['source completion removed', 'delete next.completions[completionKey(moving)]'],
  ['destination-first persistence', 'localStorage.setItem(targetKey,JSON.stringify(destination))'],
  ['destination rollback', 'localStorage.setItem(targetKey,previousRaw)'],
  ['move app version', "APP_VERSION='V10."]
];
for (const [label, needle] of moveRequired) {
  if (!html.includes(needle)) throw new Error('Missing plan-to-module move contract: ' + label);
}
for (const term of ['移动到其他模块','工作模块','整理模块','外语学习模块','移动到所选模块']) {
  if (!i18n.includes(JSON.stringify(term))) throw new Error('Missing move i18n source term: ' + term);
}

const globalSearchRequired = [
  ['seven Plan period priority order', "GLOBAL_SEARCH_PERIODS=['daily','daily_random','weekly','weekly_random','monthly','monthly_random','yearly']"],
  ['global search entry point', 'function globalSearch()'],
  ['search ordering helper', 'function orderedGlobalSearchPlans'],
  ['global search button', "$('global-search-button').addEventListener('click',globalSearch)"],
  ['search Enter handler', "event.key==='Enter'"],
  ['search title field', "plan.title||''"],
  ['search note field', "plan.note||''"],
  ['search reference URL field', "plan.referenceUrl||''"],
  ['exclude archived records', '!plan.archivedAt'],
  ['exclude expired random-cycle records', 'plan.cycleId===periodKey(plan.period)'],
  ['clear category filter after match', "$('category-filter').value='all'"],
  ['first match highlighting', 'priority-target-highlight'],
  ['global search app version', "APP_VERSION='V10.27_move_plan_to_results_future'"]
];
for (const [label, needle] of globalSearchRequired) {
  if (!html.includes(needle)) throw new Error('Missing V10.22 global search contract: ' + label);
}
for (const term of ['全局检索','全局检索：名称、备注或参考网站','请输入检索关键词。','没有找到符合条件的内容。']) {
  if (!i18n.includes(JSON.stringify(term))) throw new Error('Missing global search i18n source term: ' + term);
}
if (!changelog.includes('## V10.22 · global_search')) throw new Error('Missing V10.22 changelog');


const themeRequired = [
 ['default dark theme','<html lang="zh-CN" data-theme="dark">'],
 ['theme preference key',"THEME_KEY='personal-planner:theme:v1'"],
 ['shared theme switch','id="theme-toggle"'],
 ['theme persistence','localStorage.setItem(THEME_KEY,next)'],
 ['blue ordinary periods','.period-tab[data-period="daily"],.period-tab[data-period="weekly"],.period-tab[data-period="monthly"],.period-tab[data-period="yearly"]'],
 ['orange random periods','.period-tab[data-period="daily_random"],.period-tab[data-period="weekly_random"],.period-tab[data-period="monthly_random"]']
];
for (const [label,needle] of themeRequired) if(!html.includes(needle)) throw new Error('Missing V10.23 theme contract: '+label);
for (const term of ['切换到白色主题','切换到黑色主题']) if(!i18n.includes(JSON.stringify(term))) throw new Error('Missing theme i18n source term: '+term);
if(!changelog.includes('## V10.23 · dark_theme_and_period_colors')) throw new Error('Missing V10.23 changelog');
console.log('V10.14 four-module, V10.18 operation tracing, V10.21 move, V10.22 global search and V10.23 theme/period-color checks passed.');
