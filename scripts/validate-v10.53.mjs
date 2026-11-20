import assert from 'node:assert/strict';
import { getProjectCustomerOverview } from '../company-project-customer-overview.js';

const result = getProjectCustomerOverview({
  customers: [{ id: 'c1', title: 'Customer A' }, { id: 'c2', title: 'Customer B' }],
  projects: [
    { id: 'p1', title: 'Project A', parent_record_id: 'c1', status: 'active', due_date: '2026-11-19', updated_at: '2026-11-20', data: { progress_percent: 50 } },
    { id: 'p2', title: 'Project B', parent_record_id: 'c1', status: 'completed', data: { progress_percent: 100 } },
    { id: 'p3', title: 'Project C', parent_record_id: 'c2', status: 'planned', data: { progress_percent: 20 } },
    { id: 'p4', title: 'Project D', parent_record_id: 'c2', status: 'cancelled', data: { progress_percent: 0 } }
  ],
  tasks: [
    { id: 't1', parent_record_id: 'p1', status: 'completed' },
    { id: 't2', parent_record_id: 'p1', status: 'todo' },
    { id: 't3', parent_record_id: 'p2', status: 'completed' }
  ],
  followups: [
    { id: 'f1', parent_record_id: 'c2', record_date: '2026-11-20', status: 'pending' },
    { id: 'f2', parent_record_id: 'p1', record_date: '2026-11-19', data: { project_id: 'p1', customer_id: 'c1' } }
  ]
}, '2026-11-20');

assert.equal(result.totalProjects, 4);
assert.deepEqual(result.statusCounts, { planned: 1, active: 1, on_hold: 0, completed: 1, cancelled: 1 });
assert.equal(result.averageProgress, 57); // excludes cancelled projects: (50 + 100 + 20) / 3
assert.equal(result.completedProjects, 1);
assert.equal(result.overdueProjects, 1);
assert.equal(result.totalCustomers, 2);
assert.equal(result.customersWithProjects, 2);
assert.equal(result.totalTasks, 3);
assert.equal(result.completedTasks, 2);
assert.equal(result.projectRows.find(row => row.project.id === 'p1').taskCompleted, 1);
assert.equal(result.customerRows.find(row => row.customer.id === 'c1').followupCount, 1);
assert.equal(result.customerRows.find(row => row.customer.id === 'c2').followupCount, 1);
assert.deepEqual(getProjectCustomerOverview({}).statusCounts, { planned: 0, active: 0, on_hold: 0, completed: 0, cancelled: 0 });
console.log('V10.53 project/customer overview validation passed.');
