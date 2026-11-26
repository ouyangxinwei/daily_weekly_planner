import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('repository-management.js','utf8');
const css=fs.readFileSync('repository-management.css','utf8');
const seed=JSON.parse(fs.readFileSync('data/repositories.seed.json','utf8'));
const sw=fs.readFileSync('sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=fs.readFileSync('VERSION','utf8').trim();

assert.equal(seed.type,'oooo.repository-management');
assert.equal(seed.version,1);
assert.equal(seed.repositories.length,16);
assert.equal(new Set(seed.repositories.map(x=>x.url)).size,16);
for(const item of seed.repositories){
  assert.match(item.url,/^https:\/\/github\.com\/[^/]+\/[^/]+$/);
  assert.equal(item.status,'待整理');
  assert.ok(item.tags.includes('待核实'));
  assert.deepEqual(item.techStack,[]);
}
assert.ok(html.includes('id="open-repository-management"'));
assert.ok(html.includes('id="repository-management-dialog"'));
assert.ok(html.includes('repository-management.css'));
assert.ok(html.includes('repository-management.js'));
assert.ok(js.includes("planner-repositories:v1"));
assert.ok(js.includes("oooo.repository-management"));
assert.ok(js.includes("pendingImport"));
assert.ok(js.includes("confirmImport"));
assert.ok(js.includes("URL"));
assert.ok(css.includes('#repository-management-dialog'));
assert.ok(sw.includes('repository-management.js'));
assert.ok(sw.includes('repository-management.css'));
assert.ok(sw.includes('data/repositories.seed.json'));
assert.match(version,/^10\.67\.0$/);
assert.equal(pkg.version,version);
assert.match(html,/APP_VERSION='V10\.67_repository_management'/);
console.log('V10.67 repository management validation passed (16 seed repositories, import guard, UI assets, version).');
