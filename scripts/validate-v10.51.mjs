import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getBusinessOverviewMetrics, getRecentBusinessRecords } from '../company-overview-metrics.js';

const today = '2026-11-20';
const data = {
  customers: [{}, {}, {}],
  projects: [{ status:'active' }, { status:'completed' }, { status:'active' }],
  tasks: [
    { status:'todo', due_date:'2026-11-19' },
    { status:'completed', due_date:'2026-11-19' },
    { status:'blocked', due_date:'2026-11-20' },
    { status:'in_progress', due_date:'2026-11-26' },
    { status:'todo', due_date:'2026-11-27' },
    { status:'todo', due_date:'2026-02-30' },
    { status:'todo', due_date:null }
  ],
  followups: [
    { status:'pending', data:{ next_follow_up_date:'2026-11-19' } },
    { status:'completed', data:{ next_follow_up_date:'2026-11-18' } },
    { status:'pending', data:{ next_follow_up_date:'2026-11-20' } }
  ]
};
assert.deepEqual(getBusinessOverviewMetrics(data, today), {
  customers:3, activeProjects:2, unfinishedTasks:6, pendingFollowups:2,
  overdueTasks:1, dueTodayTasks:1, next7Tasks:1, overdueFollowups:1
});
assert.deepEqual(getBusinessOverviewMetrics({}, today), {
  customers:0, activeProjects:0, unfinishedTasks:0, pendingFollowups:0,
  overdueTasks:0, dueTodayTasks:0, next7Tasks:0, overdueFollowups:0
});
const recent = getRecentBusinessRecords([
  { id:'old', updated_at:'2026-01-01' },
  { id:'new', updated_at:'2026-11-20' },
  { id:'middle', updated_at:'2026-10-01' },
  { id:'no-date' }
], 2);
assert.deepEqual(recent.map(record => record.id), ['new','middle']);
const source = readFileSync(new URL('../company-business.js', import.meta.url), 'utf8');
for (const marker of [
  "fetchCompleteRecords('/records?record_type=customer'",
  "fetchCompleteRecords('/records?record_type=project'",
  "fetchCompleteRecords('/records?record_type=task'",
  "fetchCompleteRecords('/records?record_type=follow_up'",
  "if (reportedTotal !== expectedTotal)",
  "id = 'cw-business-overview'",
  "data.next_follow_up_date",
  "getBusinessOverviewMetrics(data, today)",
  "getRecentBusinessRecords(records,3)",
  "state.followupDueFilter === 'overdue'"
]) assert.ok(source.includes(marker), 'Missing overview integration: ' + marker);
for (const label of ["overview:'业务总览'", "overview:'Business overview'", "overview:'業務概要'"]) {
  assert.ok(source.includes(label), 'Missing translated overview label: ' + label);
}
console.log('V10.51 business overview validation passed.');
