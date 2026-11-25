import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getBusinessContributionReport } from '../company-contribution-analysis.js';

const report = getBusinessContributionReport({
  customers: [{ id: 'c1', title: 'Customer One' }, { id: 'c2', title: 'Customer Two' }],
  projects: [{ id: 'p1', title: 'Project One', parent_record_id: 'c1' }, { id: 'p2', title: 'Project Two', parent_record_id: 'c2' }],
  transactions: [
    { id: 'x1', currency: 'JPY', amount: '1000.25', status: 'completed', record_date: '2026-11-05', data: { direction: 'income', customer_id: 'c1', project_id: 'p1' } },
    { id: 'x2', currency: 'JPY', amount: '100.50', status: 'completed', record_date: '2026-11-06', data: { direction: 'expense', customer_id: 'c1', project_id: 'p1' } },
    { id: 'x3', currency: 'JPY', amount: '200', status: 'planned', record_date: '2026-11-07', data: { direction: 'income', customer_id: 'c2', project_id: 'p2' } },
    { id: 'x4', currency: 'JPY', amount: '50', status: 'completed', record_date: '2026-11-08', data: { direction: 'income' } },
    { id: 'x5', currency: 'JPY', amount: '999', status: 'cancelled', record_date: '2026-11-09', data: { direction: 'income', customer_id: 'c1' } },
    { id: 'x6', currency: 'JPY', amount: '999', status: 'completed', record_date: '2025-10-01', data: { direction: 'income', customer_id: 'c1' } },
    { id: 'x7', currency: 'CNY', amount: '300', status: 'completed', record_date: '2026-11-10', data: { direction: 'income', customer_id: 'c2' } },
    { id: 'x8', currency: 'JPY', amount: '25', status: 'planned', record_date: '2026-11-11', data: { direction: 'expense' } }
  ]
}, 'JPY', new Date('2026-11-25T12:00:00'), 12);

assert.equal(report.start, '2025-12-01');
assert.equal(report.includedCount, 5);
assert.equal(report.totals.income, 1050250000n);
assert.equal(report.totals.expense, 100500000n);
assert.equal(report.totals.net, 949750000n);
assert.equal(report.totals.plannedIncome, 200000000n);
assert.equal(report.totals.plannedExpense, 25000000n);
assert.equal(report.customers.length, 2);
assert.equal(report.customers[0].id, 'c1');
assert.equal(report.customers[0].income, 1000250000n);
assert.equal(report.projects[0].id, 'p1');
assert.equal(report.unassigned.count, 2);
assert.equal(report.unassigned.income, 50000000n);
assert.equal(report.unassigned.plannedExpense, 25000000n);
assert.equal(report.customers.reduce((sum, row) => sum + row.incomeShareBps, 0n), 9523n);
assert.throws(() => getBusinessContributionReport({}, 'EUR', new Date('2026-11-25T12:00:00')), TypeError);

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const ui = read('../company-business.js');
const css = read('../company-business.css');
const sw = read('../sw.js');
const html = read('../index.html');
const pkg = JSON.parse(read('../package.json'));
const version = read('../VERSION').trim();
const workflow = read('../.github/workflows/validate-v10.13.yml');
assert.ok(['10.64.0', '10.65.0'].includes(version));
assert.equal(pkg.version, version);
assert.ok(pkg.scripts['test:validate:company-contributions']);
assert.match(html, /APP_VERSION='V10\.(?:64_customer_project_contributions|65_customer_relationship_health)'/);
assert.match(sw, /daily-weekly-planner-v10-(?:64-customer-project-contributions|65-customer-relationship-health)/);
assert.match(sw, /company-contribution-analysis\.js/);
assert.match(ui, /contributionAnalysis/);
assert.match(ui, /loadBusinessContributionAnalysis/);
assert.match(ui, /getBusinessContributionReport/);
assert.match(ui, /contributionCurrency/);
assert.match(ui, /currency:'Currency'/);
assert.match(css, /cw-contribution-summary/);
assert.match(workflow, /node scripts\/validate-v10\.64\.mjs/);
console.log('V10.64 customer/project contribution validation passed.');
