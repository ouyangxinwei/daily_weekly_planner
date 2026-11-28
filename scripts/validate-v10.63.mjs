import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getBusinessDecisionReport } from '../company-decision-center.js';

const report = getBusinessDecisionReport({
  customers: [{ id: 'c1' }, { id: 'c2' }],
  projects: [
    { id: 'p1', title: 'Late project', status: 'active', due_date: '2026-11-20' },
    { id: 'p2', title: 'Current project', status: 'active', due_date: '2026-11-28' },
    { id: 'p3', title: 'Done project', status: 'completed', due_date: '2026-11-01' }
  ],
  tasks: [
    { id: 't1', title: 'Late task', status: 'todo', due_date: '2026-11-21', parent_record_id: 'p1' },
    { id: 't2', title: 'Blocked task', status: 'blocked', due_date: '2026-11-27', parent_record_id: 'p2' },
    { id: 't3', title: 'Today task', status: 'in_progress', due_date: '2026-11-25', parent_record_id: 'p2' },
    { id: 't4', title: 'No project', status: 'todo', due_date: null, parent_record_id: null }
  ],
  followups: [
    { id: 'f1', title: 'Late follow-up', status: 'pending', data: { next_follow_up_date: '2026-11-22' } },
    { id: 'f2', title: 'Unscheduled follow-up', status: 'pending', data: {} }
  ],
  transactions: [
    { currency: 'JPY', amount: '1000.25', status: 'completed', record_date: '2026-11-05', data: { direction: 'income' } },
    { currency: 'JPY', amount: '250.10', status: 'completed', record_date: '2026-11-06', data: { direction: 'expense' } },
    { currency: 'JPY', amount: '500', status: 'planned', record_date: '2026-11-07', data: { direction: 'income' } },
    { currency: 'CNY', amount: '20', status: 'completed', record_date: '2026-11-08', data: { direction: 'income' } },
    { currency: 'USD', amount: '999', status: 'cancelled', record_date: '2026-11-09', data: { direction: 'income' } }
  ],
  activity: [
    { event_id: 'a1', record_id: 'p1', record_type: 'project', title: 'Old event', event_type: 'created', occurred_at: '2026-11-01T08:00:00Z' },
    { event_id: 'a2', record_id: 't1', record_type: 'task', title: 'New event', event_type: 'updated', occurred_at: '2026-11-24T08:00:00Z' }
  ]
}, '2026-11-25');

assert.equal(report.metrics.customers, 2);
assert.equal(report.metrics.activeProjects, 2);
assert.equal(report.metrics.openTasks, 4);
assert.equal(report.metrics.pendingFollowups, 2);
assert.equal(report.metrics.overdueTasks, 1);
assert.equal(report.metrics.overdueProjects, 1);
assert.equal(report.metrics.overdueFollowups, 1);
assert.equal(report.metrics.blockedTasks, 1);
assert.equal(report.finance.JPY.income, 1000250000n);
assert.equal(report.finance.JPY.expense, 250100000n);
assert.equal(report.finance.JPY.net, 750150000n);
assert.equal(report.finance.JPY.plannedIncome, 500000000n);
assert.equal(report.finance.CNY.income, 20000000n);
assert.equal(report.finance.USD.income, 0n);
assert.equal(report.recommendations[0].key, 'overdueTasks');
assert.equal(report.recentActivity[0].event_id, 'a2');
assert.throws(() => getBusinessDecisionReport({}, '2026-02-30'), TypeError);

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const ui = read('../company-business.js');
const css = read('../company-business.css');
const sw = read('../sw.js');
const html = read('../index.html');
const pkg = JSON.parse(read('../package.json'));
const version = read('../VERSION').trim();
const workflow = read('../.github/workflows/validate-v10.13.yml');
assert.ok(['10.63.0', '10.64.0', '10.65.0', '10.66.0', '10.68.0', '10.69.0', '10.70.0', '10.71.0', '10.72.0', '10.72.1'].includes(version));
assert.equal(pkg.version, version);
assert.ok(pkg.scripts['test:validate:company-decision-center']);
assert.match(html, /APP_VERSION='V10\.(?:63_business_decision_center|64_customer_project_contributions|65_customer_relationship_health|66_project_delivery_analysis|68_repository_cloud|69_ui_role_mode|70_repository_bulk_clear|71_learning_meetings|72_entry_and_learning_meetings)'/);
assert.match(sw, /daily-weekly-planner-v10-(?:63-business-decision-center|64-customer-project-contributions|65-customer-relationship-health|66-project-delivery-analysis|68-repository-cloud|69-ui-role-mode|70-repository-bulk-clear|71-learning-meetings|72-entry-learning-meetings)/);
assert.match(sw, /company-decision-center\.js/);
assert.match(ui, /decisionCenter/);
assert.match(ui, /loadBusinessDecisionCenter/);
assert.match(ui, /loadRecentActivityHistory/);
assert.match(ui, /loadBusinessRecords\(\['customer', 'project', 'task', 'follow_up', 'transaction'\]/);
assert.match(ui, /getBusinessDecisionReport/);
assert.match(css, /cw-decision-finance/);
assert.match(workflow, /node scripts\/validate-v10\.63\.mjs/);
console.log('V10.63 business decision center validation passed.');
