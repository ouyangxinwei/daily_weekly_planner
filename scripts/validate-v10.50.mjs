import assert from 'node:assert/strict';
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
console.log('V10.50 task due-date filter validation passed.');
