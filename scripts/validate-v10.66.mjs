import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getProjectDeliveryAnalysis } from '../company-project-delivery-analysis.js';

const project = (id, overrides = {}) => ({
  id, title: id, status: 'active', start_date: '2026-11-01', due_date: '2026-11-11',
  data: { progress_percent: 50 }, ...overrides
});
const report = getProjectDeliveryAnalysis({ projects: [
  project('ahead', { data: { progress_percent: 70 } }),
  project('slight', { data: { progress_percent: 45 } }),
  project('slight-boundary', { data: { progress_percent: 40 } }),
  project('attention', { data: { progress_percent: 30 } }),
  project('attention-boundary', { data: { progress_percent: 25 } }),
  project('high', { data: { progress_percent: 10 } }),
  project('future', { start_date: '2026-12-01', due_date: '2026-12-10', data: { progress_percent: 0 } }),
  project('overdue', { due_date: '2026-11-20', data: { progress_percent: 20 } }),
  project('missing', { due_date: '' }),
  project('bad-date', { start_date: '2026-02-30' }),
  project('bad-order', { start_date: '2026-11-12', due_date: '2026-11-11' }),
  project('same-day', { start_date: '2026-11-05', due_date: '2026-11-05', data: { progress_percent: 100 } }),
  project('done', { status: 'completed', due_date: '2026-11-01', data: { progress_percent: 100 } }),
  project('cancelled', { status: 'cancelled' })
]}, '2026-11-06');

const byId = id => report.rows.find(row => row.project.id === id);
assert.equal(byId('ahead').plannedProgress, 50);
assert.equal(byId('ahead').variance, 20);
assert.equal(byId('ahead').risk, 'onTrack');
assert.equal(byId('slight').risk, 'slight');
assert.equal(byId('slight-boundary').risk, 'slight');
assert.equal(byId('attention').risk, 'attention');
assert.equal(byId('attention-boundary').risk, 'attention');
assert.equal(byId('high').risk, 'high');
assert.equal(byId('future').plannedProgress, 0);
assert.equal(byId('overdue').overdue, false);
assert.equal(byId('missing').dateIssue, 'missing_dates');
assert.equal(byId('bad-date').dateIssue, 'invalid_dates');
assert.equal(byId('bad-order').dateIssue, 'date_order');
assert.equal(byId('same-day').plannedProgress, 100);
assert.equal(byId('done').risk, 'completed');
assert.equal(byId('cancelled'), undefined);
assert.equal(getProjectDeliveryAnalysis({ projects: [project('late', { due_date: '2026-11-05' })] }, '2026-11-06').rows[0].overdue, true);
assert.equal(getProjectDeliveryAnalysis({ projects: [project('past-start', { start_date: '2026-11-07' })] }, '2026-11-06').rows[0].plannedProgress, 0);
assert.equal(getProjectDeliveryAnalysis({ projects: [project('past-due', { due_date: '2026-11-05' })] }, '2026-11-06').rows[0].plannedProgress, 100);
assert.throws(() => getProjectDeliveryAnalysis({}, '2026-02-30'), TypeError);
assert.equal(report.metrics.totalProjects, 13);
assert.equal(report.metrics.incomplete, 3);
assert.equal(report.metrics.completed, 1);

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const ui = read('../company-business.js');
const css = read('../company-business.css');
const sw = read('../sw.js');
const html = read('../index.html');
const pkg = JSON.parse(read('../package.json'));
const version = read('../VERSION').trim();
const workflow = read('../.github/workflows/validate-v10.13.yml');
assert.ok(['10.66.0', '10.68.0', '10.69.0', '10.70.0'].includes(version));
assert.equal(pkg.version, version);
assert.ok(pkg.scripts['test:validate:project-delivery']);
assert.match(html, /APP_VERSION='V10.(?:66_project_delivery_analysis|68_repository_cloud|69_ui_role_mode|70_repository_bulk_clear)'/);
assert.match(sw, /daily-weekly-planner-v10-(?:66-project-delivery-analysis|68-repository-cloud|69-ui-role-mode|70-repository-bulk-clear)/);
assert.ok(sw.includes('company-project-delivery-analysis.js'));
assert.match(ui, /deliveryAnalysis/);
assert.match(ui, /loadProjectDeliveryAnalysis/);
assert.ok(ui.includes("if(state.tab==='deliveryAnalysis')return loadProjectDeliveryAnalysis();"));
assert.match(ui, /getProjectDeliveryAnalysis/);
assert.match(css, /cw-delivery-kpis/);
assert.ok(workflow.includes('node scripts/validate-v10.66.mjs'));
console.log('V10.66 project delivery analysis validation passed.');
