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

assert.ok(['10.59.0', '10.60.0'].includes(version));
assert.equal(pkg.version, version);
assert.match(index, /APP_VERSION='V10\.59_company_entity_attachments'/);
assert.match(sw, /v10-(?:59-company-entity-attachments|60-monthly-cashflow)/);

assert.match(records, /function openAttachments\(record\)/);
assert.match(records, /window\.CompanyRecords = Object\.freeze\(\{[^}]*openAttachments/);
assert.match(records, /\/files\/upload-url/);
assert.match(records, /\/files\/abort/);
assert.match(records, /\/download-url/);
assert.doesNotMatch(records, /localStorage|sessionStorage|indexedDB/i);

assert.match(website, /attachments:\{zh:'附件',en:'Attachments',ja:'添付ファイル'\}/);
assert.match(website, /window\.CompanyRecords\?\.openAttachments\(customer\)/);
assert.match(website, /actions\.append\(projectsButton,followupsButton,attachmentsButton,edit,remove\)/);

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
