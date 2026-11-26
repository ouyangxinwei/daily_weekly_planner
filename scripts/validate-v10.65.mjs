import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCustomerRelationshipHealth } from '../company-customer-health.js';

const report = getCustomerRelationshipHealth({
  customers: [
    { id: 'c1', title: 'Stale active customer', created_at: '2025-01-01T00:00:00Z' },
    { id: 'c2', title: 'Overdue customer', created_at: '2025-01-01T00:00:00Z' },
    { id: 'c3', title: 'New customer', created_at: '2026-11-10T00:00:00Z' },
    { id: 'c4', title: 'Unscheduled customer', created_at: '2025-01-01T00:00:00Z' },
    { id: 'c5', title: 'No history project customer', created_at: '2025-01-01T00:00:00Z' }
  ],
  projects: [
    { id: 'p1', title: 'Project One', parent_record_id: 'c1', status: 'active' },
    { id: 'p2', title: 'Project Two', parent_record_id: 'c5', status: 'active' },
    { id: 'p3', title: 'Completed Project', parent_record_id: 'c2', status: 'completed' }
  ],
  followups: [
    { id: 'f1', status: 'completed', record_date: '2026-09-01T10:00:00Z', data: { customer_id: 'c1' } },
    { id: 'f2', status: 'pending', record_date: '2026-11-01T10:00:00Z', data: { customer_id: 'c2', next_follow_up_date: '2026-11-20' } },
    { id: 'f3', status: 'pending', record_date: '2026-11-10T10:00:00Z', related_record_ids: ['c4'], data: {} }
  ]
}, '2026-11-25', 30);

assert.equal(report.metrics.customers, 5);
assert.equal(report.metrics.customersWithActiveProjects, 2);
assert.equal(report.metrics.customersWithoutActiveProjects, 3);
assert.equal(report.metrics.customersWithOverdueFollowups, 1);
assert.equal(report.metrics.customersWithPendingNoDate, 1);
assert.equal(report.metrics.staleCustomersWithProjects, 2);
assert.equal(report.metrics.customersWithoutHistory, 2);
assert.equal(report.rows[0].id, 'c2');
assert.equal(report.rows[0].priority, 'urgent');
assert.equal(report.rows.find(row => row.id === 'c1').priority, 'high');
assert.equal(report.rows.find(row => row.id === 'c4').pendingWithoutNextDate, 1);
assert.equal(report.rows.find(row => row.id === 'c3').priority, 'none');
assert.throws(() => getCustomerRelationshipHealth({}, '2026-02-30'), TypeError);
assert.throws(() => getCustomerRelationshipHealth({}, '2026-11-25', 0), RangeError);

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const ui = read('../company-business.js');
const css = read('../company-business.css');
const sw = read('../sw.js');
const html = read('../index.html');
const pkg = JSON.parse(read('../package.json'));
const version = read('../VERSION').trim();
const workflow = read('../.github/workflows/validate-v10.13.yml');
assert.ok(['10.65.0', '10.66.0', '10.68.0', '10.69.0', '10.70.0'].includes(version));
assert.equal(pkg.version, version);
assert.ok(pkg.scripts['test:validate:customer-health']);
assert.match(html, /APP_VERSION='V10\.(?:65_customer_relationship_health|66_project_delivery_analysis|68_repository_cloud|69_ui_role_mode|70_repository_bulk_clear)'/);
assert.match(sw, /daily-weekly-planner-v10-(?:65-customer-relationship-health|66-project-delivery-analysis|68-repository-cloud|69-ui-role-mode|70-repository-bulk-clear)/);
assert.match(sw, /company-customer-health\.js/);
assert.match(ui, /customerHealth/);
assert.match(ui, /loadCustomerRelationshipHealth/);
assert.match(ui, /getCustomerRelationshipHealth/);
assert.match(css, /cw-customer-health-kpis/);
assert.match(workflow, /node scripts\/validate-v10\.65\.mjs/);
console.log('V10.65 customer relationship health validation passed.');
