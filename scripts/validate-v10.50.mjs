import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getLocalDateKey, matchesTaskDueDate } from '../company-task-date-filter.js';

const today = '2026-11-20';
const task = (due_date, status = 'todo') => ({ due_date, status });

assert.equal(getLocalDateKey(new Date(2026, 10, 20, 23, 59)), today);
assert.equal(matchesTaskDueDate(task('2026-11-19'), 'overdue', today), true);
assert.equal(matchesTaskDueDate(task('2026-11-19', 'completed'), 'overdue', today), false);
assert.equal(matchesTaskDueDate(task('2026-11-20'), 'today', today), true);
assert.equal(matchesTaskDueDate(task('2026-11-21'), 'next7', today), true);
assert.equal(matchesTaskDueDate(task('2026-11-26'), 'next7', today), true);
assert.equal(matchesTaskDueDate(task('2026-11-27'), 'next7', today), false);
assert.equal(matchesTaskDueDate(task(null), 'none', today), true);
assert.equal(matchesTaskDueDate(task(''), 'none', today), true);
assert.equal(matchesTaskDueDate(task('2026-11-20'), '', today), true);
assert.equal(matchesTaskDueDate(task('2026-02-30'), 'none', today), true);
const businessSource = readFileSync(new URL('../company-business.js', import.meta.url), 'utf8');
for (const marker of ["fetchAllRecords('task', Number.MAX_SAFE_INTEGER)", 'matchesTaskDueDate(record, state.taskDueFilter', "id=\"cw-business-due-filter\"", "state.taskDueFilter = $('cw-business-due-filter').value"]) {
  assert.ok(businessSource.includes(marker), 'Missing task due-date UI integration: ' + marker);
}
for (const label of ["overdueTasks:'逾期任务'", "overdueTasks:'Overdue'", "overdueTasks:'期限超過'"]) {
  assert.ok(businessSource.includes(label), 'Missing translated due-date label: ' + label);
}
console.log('V10.50 task due-date filter validation passed.');
