import assert from 'node:assert/strict';
import { getBusinessTrendReport } from '../company-business-trends.js';

const weekly = getBusinessTrendReport({
  projects: [
    { id: 'p1', status: 'active', created_at: '2026-01-05T09:00:00Z', updated_at: '2026-01-05T09:00:00Z' },
    { id: 'p2', status: 'completed', created_at: '2025-12-20T09:00:00Z', updated_at: '2026-01-06T09:00:00Z' },
    { id: 'p3', status: 'planned', created_at: '2026-01-06T09:00:00Z', updated_at: '2026-01-06T09:00:00Z' },
    { id: 'p4', status: 'completed', created_at: '2025-12-01T09:00:00Z', updated_at: '2025-12-31T09:00:00Z' }
  ],
  tasks: [
    { id: 't1', status: 'todo', created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
    { id: 't2', status: 'completed', created_at: '2025-12-20T10:00:00Z', updated_at: '2026-01-07T10:00:00Z' },
    { id: 't3', status: 'in_progress', created_at: '2026-01-06T10:00:00Z', updated_at: '2026-01-07T10:00:00Z' }
  ],
  followups: [
    { id: 'f1', record_date: '2025-12-31', created_at: '2026-01-06T11:00:00Z' },
    { id: 'f2', record_date: '', created_at: '2026-01-07T11:00:00Z' },
    { id: 'f3', record_date: 'invalid', created_at: '2026-01-08T11:00:00Z' },
    { id: 'f4', record_date: '2026-01-10', created_at: '2026-01-04T11:00:00Z' }
  ]
}, 'week', '2026-01-05');

assert.equal(weekly.periods.length, 8);
assert.equal(weekly.periods[0].start, '2025-11-17');
assert.equal(weekly.periods.at(-1).start, '2026-01-05');
assert.equal(weekly.periods.at(-1).end, '2026-01-11');
assert.equal(weekly.periods.at(-1).projectsCreated, 2);
assert.equal(weekly.periods.at(-1).projectsCompleted, 1);
assert.equal(weekly.periods.at(-1).tasksCreated, 2);
assert.equal(weekly.periods.at(-1).tasksCompleted, 1);
assert.equal(weekly.periods.at(-1).followups, 2);
assert.equal(weekly.periods.at(-2).followups, 1);
assert.equal(weekly.metrics.find(item => item.key === 'projectsCreated').change, 2);
assert.equal(weekly.metrics.find(item => item.key === 'projectsCompleted').change, 1);
assert.equal(weekly.metrics.find(item => item.key === 'followups').change, 1);

const monthly = getBusinessTrendReport({
  projects: [
    { status: 'completed', created_at: '2025-12-31', updated_at: '2026-01-02' },
    { status: 'active', created_at: '2026-01-01', updated_at: '2026-01-02' }
  ],
  tasks: [{ status: 'completed', created_at: '2025-08-31', updated_at: '2025-12-31' }],
  followups: [{ record_date: '2025-08-31', created_at: '2026-01-02' }]
}, 'month', '2026-01-05');

assert.equal(monthly.periods.length, 6);
assert.equal(monthly.periods[0].key, '2025-08-01');
assert.equal(monthly.periods.at(-1).key, '2026-01-01');
assert.equal(monthly.periods.at(-1).projectsCompleted, 1);
assert.equal(monthly.periods.at(-1).projectsCreated, 1);
assert.equal(monthly.periods.find(item => item.key === '2025-12-01').tasksCompleted, 1);
assert.equal(monthly.periods.find(item => item.key === '2025-08-01').followups, 1);

const empty = getBusinessTrendReport({}, 'month', '2026-01-05');
assert.equal(empty.periods.length, 6);
assert.ok(empty.periods.every(period => period.projectsCreated === 0 && period.projectsCompleted === 0 && period.tasksCreated === 0 && period.tasksCompleted === 0 && period.followups === 0));
assert.throws(() => getBusinessTrendReport({}, 'week', '2026-02-30'), /valid local date/);
console.log('V10.54 business trends validation passed.');
