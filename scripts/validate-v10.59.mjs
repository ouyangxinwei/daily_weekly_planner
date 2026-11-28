import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const website = read('company-website.js');
const business = read('company-business.js');
const records = read('company-records-workspace.js');
const api = read('supabase/functions/company-api/index.ts');
const version = read('VERSION').trim();
const pkg = JSON.parse(read('package.json'));
const sw = read('sw.js');
const index = read('index.html');

assert.ok(['10.59.0', '10.60.0', '10.61.0', '10.62.0', '10.63.0', '10.64.0', '10.65.0', '10.66.0', '10.68.0', '10.69.0', '10.70.0', '10.71.0', '10.72.0', '10.72.1'].includes(version));
assert.equal(pkg.version, version);
assert.match(index, /APP_VERSION='V10\.(?:59_company_entity_attachments|60_company_monthly_cashflow|61_company_status_history|62_business_activity_history|63_business_decision_center|64_customer_project_contributions|65_customer_relationship_health|66_project_delivery_analysis|68_repository_cloud|69_ui_role_mode|70_repository_bulk_clear|71_learning_meetings|72_entry_and_learning_meetings)'/);
assert.match(sw, /v10-(?:59-company-entity-attachments|60-monthly-cashflow|61-company-status-history|62-business-activity-history|63-business-decision-center|64-customer-project-contributions|65-customer-relationship-health|66-project-delivery-analysis|68-repository-cloud|69-ui-role-mode|70-repository-bulk-clear|71-learning-meetings|72-entry-learning-meetings)/);

assert.match(records, /function openAttachments\(record\)/);
assert.match(records, /window\.CompanyRecords = Object\.freeze\(\{[^}]*openAttachments/);
assert.match(records, /\/files\/upload-url/);
assert.match(records, /\/files\/abort/);
assert.match(records, /\/download-url/);
assert.doesNotMatch(records, /localStorage|sessionStorage|indexedDB/i);

assert.match(website, /attachments:\{zh:'附件',en:'Attachments',ja:'添付ファイル'\}/);
assert.match(website, /window\.CompanyRecords\?\.openAttachments\(customer\)/);
assert.match(website, /actions\.append\(projectsButton,followupsButton,attachmentsButton,(?:historyButton,)?edit,remove\)/);

assert.match(business, /attachments:'附件'/);
assert.match(business, /attachments:'Attachments'/);
assert.match(business, /attachments:'添付ファイル'/);
assert.match(business, /window\.CompanyRecords\?\.openAttachments\(record\)/);

for (const type of ['customer', 'project', 'task', 'follow_up', 'transaction', 'document']) {
  assert.match(api, new RegExp('"' + type + '"'));
}
assert.match(api, /const ATTACHABLE_RECORD_TYPES = new Set\(\["customer", "project", "task", "follow_up", "transaction", "document"\]\)/);
assert.match(api, /const MAX_FILE_BYTES = 10 \* 1024 \* 1024/);

console.log('V10.59 company entity attachment validation passed.');
