import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/    function buildPlanCategoryMigration\(source\)\{[\s\S]*?\n    \}/);
assert.ok(match, 'Production migration transformer must exist in index.html');
const buildPlanCategoryMigration = vm.runInNewContext(`(${match[0].trim()})`);

const record = (id, category, extra = {}) => ({
  id, title: `record ${id}`, note: `note ${id}`, period: 'daily',
  category, status: '进行中', priority: 4, dueAt: '2026-11-05T10:30',
  createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z',
  ...extra
});
const original = {
  schemaVersion: 1,
  categories: ['学习', '工作', '生活', '健康', '财务', '兴趣'],
  plans: [
    record('active-work', '工作'),
    record('archived-work', '工作', { archivedAt: '2026-10-03T00:00:00.000Z' }),
    record('other-category', '学习', { note: 'must remain unchanged' })
  ],
  completions: { 'active-work|plan': true, 'other-category|plan': false },
  trash: [{
    plan: record('trash-work', '工作', { archivedAt: '' }),
    deletedAt: '2026-10-04T00:00:00.000Z',
    completions: { 'trash-work|plan': true }
  }]
};
const snapshot = JSON.stringify(original);
const first = buildPlanCategoryMigration(original);
assert.equal(first.changed, true, 'legacy Work category must trigger migration');
assert.deepEqual(JSON.parse(JSON.stringify(first.state.categories)), ['学习','生活','健康','财务','兴趣','未分类']);
for (const item of first.state.plans) {
  if (item.id === 'active-work' || item.id === 'archived-work') assert.equal(item.category, '未分类');
}
assert.equal(first.state.trash[0].plan.category, '未分类', 'Trash record must migrate');
assert.equal(first.state.plans.find(p => p.id === 'other-category').category, '学习');
assert.equal(JSON.stringify(original), snapshot, 'source object must not be mutated');
const expected = JSON.parse(JSON.stringify(original));
expected.categories = ['学习','生活','健康','财务','兴趣','未分类'];
expected.plans[0].category = '未分类';
expected.plans[1].category = '未分类';
expected.trash[0].plan.category = '未分类';
assert.equal(JSON.stringify(first.state), JSON.stringify(expected), 'only category fields and category list may change');

const second = buildPlanCategoryMigration(first.state);
assert.equal(second.changed, false, 'migration must be idempotent');
assert.equal(JSON.stringify(second.state), JSON.stringify(first.state));

const alreadyMigrated = {
  schemaVersion: 1, categories: ['学习','生活','未分类'],
  plans: [record('existing', '学习')], completions: {}, trash: []
};
const noOp = buildPlanCategoryMigration(alreadyMigrated);
assert.equal(noOp.changed, false, 'already migrated state must be a no-op');

const uncategorizedMissing = {
  schemaVersion: 1, categories: ['学习','生活'],
  plans: [record('ordinary', '学习')], completions: {}, trash: []
};
const ensured = buildPlanCategoryMigration(uncategorizedMissing);
assert.equal(ensured.changed, true, 'fixed Uncategorized category must be added');
assert.deepEqual(JSON.parse(JSON.stringify(ensured.state.categories)), ['学习','生活','未分类']);

console.log('Phase 2 Plan migration regression tests passed (active, archived, Trash, field preservation, order, idempotence, source immutability).');
