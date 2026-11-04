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
  ['cloud partition merge', 'payload[CLOUD_PARTITIONS[activeModule]]=state'],
  ['cloud partition download', 'data[CLOUD_PARTITIONS[activeModule]]'],
  ['active module persistence', 'ACTIVE_MODULE_KEY'],
  ['service worker cache version', 'daily-weekly-planner-v10-18-business-operation-tracing']
];
for (const [label, needle] of required) {
  const source = label === 'service worker cache version' ? sw : html;
  if (!source.includes(needle)) throw new Error('Missing application contract: ' + label);
}
if (html.includes('挪威语')) throw new Error('Norwegian category must not be present in app code');
for (const term of ['外语学习','英语','德语','俄语','日语','工作记录','会议','待处理','进行中']) {
  if (!i18n.includes(JSON.stringify(term))) throw new Error('Missing i18n source term: ' + term);
}
if (!changelog.includes('## V10.14 · four_module_management')) throw new Error('Missing V10.14 changelog');

const loggingRequired = [
  ['runtime log entry', 'id="open-runtime-logs"'],
  ['runtime log dialog', 'id="runtime-log-dialog"'],
  ['runtime log details', 'id="runtime-log-detail-dialog"'],
  ['runtime log search', 'id="runtime-log-search"'],
  ['runtime log export JSON', 'id="runtime-log-export-json"'],
  ['runtime log export CSV', 'id="runtime-log-export-csv"'],
  ['runtime log clear', 'id="runtime-log-clear"'],
  ['runtime log script', 'runtime-logs.js'],
  ['runtime log app version', "APP_VERSION='V10.18_business_operation_tracing'"]
];
for (const [label, needle] of loggingRequired) {
  if (!html.includes(needle)) throw new Error('Missing runtime logging contract: ' + label);
}
const viewer = fs.readFileSync('runtime-logs.js', 'utf8');
for (const needle of ['AppLogger.list', 'executionId', 'application/json', 'text/csv', 'setDebug']) {
  if (!viewer.includes(needle)) throw new Error('Missing runtime log viewer capability: ' + needle);
}

console.log('V10.14 four-module and V10.18 four-module operation tracing static contract checks passed.');
