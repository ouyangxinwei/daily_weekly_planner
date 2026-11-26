import assert from 'node:assert/strict';
import { getBusinessTrendReport } from '../company-business-trends.js';
import { readFileSync } from 'node:fs';

const projectHistory = [
  { id: 1, record_id: 'p1', old_status: null, new_status: 'planned', changed_at: '2026-01-02T09:00:00Z' },
  { id: 2, record_id: 'p1', old_status: 'planned', new_status: 'active', changed_at: '2026-01-03T09:00:00Z' },
  { id: 3, record_id: 'p1', old_status: 'active', new_status: 'completed', changed_at: '2026-01-05T09:00:00Z' },
  { id: 4, record_id: 'p1', old_status: 'completed', new_status: 'active', changed_at: '2026-01-06T09:00:00Z' },
  { id: 5, record_id: 'p1', old_status: 'active', new_status: 'completed', changed_at: '2026-02-02T09:00:00Z' },
  { id: 6, record_id: 'p2', old_status: null, new_status: 'completed', changed_at: '2026-01-07T09:00:00Z' }
];
const taskHistory = [
  { id: 7, record_id: 't1', old_status: 'todo', new_status: 'completed', changed_at: '2026-01-04T09:00:00Z' },
  { id: 8, record_id: 't1', old_status: 'completed', new_status: 'in_progress', changed_at: '2026-01-05T09:00:00Z' },
  { id: 9, record_id: 't1', old_status: 'in_progress', new_status: 'completed', changed_at: '2026-01-08T09:00:00Z' }
];
const report = getBusinessTrendReport({
  projects: [{ id: 'p1', status: 'active', created_at: '2025-12-20T09:00:00Z', updated_at: '2026-02-03T09:00:00Z' }, { id: 'p2', status: 'completed', created_at: '2026-01-07T08:00:00Z', updated_at: '2026-01-07T09:00:00Z' }],
  tasks: [{ id: 't1', status: 'completed', created_at: '2026-01-01T08:00:00Z', updated_at: '2026-02-10T09:00:00Z' }],
  followups: [],
  projectStatusHistory: projectHistory,
  taskStatusHistory: taskHistory
}, 'month', '2026-02-15');
assert.equal(report.periods.length, 6);
assert.equal(report.periods.find(p => p.key === '2026-01-01').projectsCompleted, 2);
assert.equal(report.periods.find(p => p.key === '2026-02-01').projectsCompleted, 1);
assert.equal(report.periods.find(p => p.key === '2026-01-01').tasksCompleted, 2);
assert.equal(report.periods.find(p => p.key === '2026-02-01').tasksCompleted, 0);
assert.equal(report.periods.find(p => p.key === '2026-01-01').projectsCreated, 1);
assert.equal(report.periods.find(p => p.key === '2026-01-01').tasksCreated, 1);

const source = readFileSync(new URL('../company-business.js', import.meta.url), 'utf8');
const edge = readFileSync(new URL('../supabase/functions/company-api/index.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20261124120058_company_record_status_history_phase_3b_c.sql', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
assert.match(source, /loadAllStatusHistory/);
assert.match(source, /status-history/);
assert.match(source, /statusHistoryTitle/);
assert.match(edge, /company_list_status_history/);
assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all on table public\.company_record_status_history from public, anon, authenticated, service_role/i);
assert.match(migration, /after update of status on public\.company_records/i);
assert.match(migration, /old_status is distinct from new_status/i);
assert.match(migration, /company_assert_access\(p_username, p_password\)/);
assert.match(pkg.version, /^10\.(?:61|62|63|64|65|66|68|69|70|71)\.0$/);
assert.ok(pkg.scripts['test:validate:company-status-history']);
assert.match(html, /V10\.(?:61_company_status_history|62_business_activity_history|63_business_decision_center|64_customer_project_contributions|65_customer_relationship_health|66_project_delivery_analysis|68_repository_cloud|69_ui_role_mode|70_repository_bulk_clear|71_learning_meetings)/);
assert.match(sw, /v10-(?:61-company-status-history|62-business-activity-history|63-business-decision-center|64-customer-project-contributions|65-customer-relationship-health|66-project-delivery-analysis|68-repository-cloud|69-ui-role-mode|70-repository-bulk-clear|71-learning-meetings)/);
console.log('V10.61 status history validation passed.');
