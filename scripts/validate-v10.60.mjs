import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getMonthlyCashflow } from '../company-records-rules.js';

const now = new Date(2026, 10, 24, 12, 0, 0);
const records = [
  { id: 'usd-in-1', status: 'completed', amount: '0.1', currency: 'USD', record_date: '2026-11-02', data: { direction: 'income' } },
  { id: 'usd-in-2', status: 'completed', amount: '0.2', currency: 'USD', record_date: '2026-11-30', data: { direction: 'income' } },
  { id: 'usd-out', status: 'completed', amount: '0.05', currency: 'USD', record_date: '2026-11-15', data: { direction: 'expense' } },
  { id: 'usd-planned-in', status: 'planned', amount: '10', currency: 'USD', record_date: '2026-11-20', data: { direction: 'income' } },
  { id: 'usd-planned-out', status: 'planned', amount: '4', currency: 'USD', record_date: '2026-11-21', data: { direction: 'expense' } },
  { id: 'usd-cancelled', status: 'cancelled', amount: '999', currency: 'USD', record_date: '2026-11-22', data: { direction: 'income' } },
  { id: 'jpy-in', status: 'completed', amount: '1200', currency: 'JPY', record_date: '2026-11-10', data: { direction: 'income' } },
  { id: 'usd-old', status: 'completed', amount: '5', currency: 'USD', record_date: '2025-11-30', data: { direction: 'income' } },
  { id: 'usd-first', status: 'completed', amount: '7', currency: 'USD', record_date: '2025-12-01', data: { direction: 'income' } },
  { id: 'usd-invalid-date', status: 'completed', amount: '8', currency: 'USD', record_date: 'not-a-date', data: { direction: 'income' } },
  { id: 'usd-invalid-amount', status: 'completed', amount: 'not-money', currency: 'USD', record_date: '2026-11-12', data: { direction: 'income' } }
];

const usd = getMonthlyCashflow(records, 'USD', now, 12);
assert.equal(usd.periods.length, 12);
assert.equal(usd.periods[0].key, '2025-12');
assert.equal(usd.periods.at(-1).key, '2026-11');
assert.equal(usd.totals.income, 7300000n, 'exact income total includes only the 0.3 November income and 7 in the first month');
assert.equal(usd.totals.expense, 50000n);
assert.equal(usd.totals.net, 7250000n);
assert.equal(usd.totals.plannedIncome, 10000000n);
assert.equal(usd.totals.plannedExpense, 4000000n);
assert.equal(usd.totals.completedCount, 4);
assert.equal(usd.totals.plannedCount, 2);
const november = usd.periods.at(-1);
assert.equal(november.income, 300000n, '0.1 + 0.2 remains exact');
assert.equal(november.expense, 50000n);
assert.equal(november.net, 250000n);
assert.equal(november.plannedIncome, 10000000n);
assert.equal(november.plannedExpense, 4000000n);
assert.equal(usd.periods[0].income, 7000000n);
assert.ok(usd.periods.slice(1, -1).every(period => period.income === 0n && period.expense === 0n));

const jpy = getMonthlyCashflow(records, 'JPY', now, 12);
assert.equal(jpy.totals.income, 1200000000n);
assert.equal(jpy.totals.expense, 0n);
assert.equal(jpy.totals.net, 1200000000n);
assert.equal(jpy.totals.completedCount, 1);

const empty = getMonthlyCashflow([], 'CNY', now, 12);
assert.equal(empty.periods.length, 12);
assert.equal(empty.totals.completedCount, 0);
assert.ok(empty.periods.every(period => period.income === 0n && period.expense === 0n));
assert.throws(() => getMonthlyCashflow([], 'EUR', now), /Unsupported currency/);
assert.throws(() => getMonthlyCashflow([], 'JPY', new Date('invalid')), /valid local date/);
assert.throws(() => getMonthlyCashflow([], 'JPY', now, 0), /between 1 and 36/);

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const ui = read('company-records-workspace.js');
const css = read('company-business.css');
const version = read('VERSION').trim();
const pkg = JSON.parse(read('package.json'));
const html = read('index.html');
const sw = read('sw.js');
assert.ok(['10.60.0', '10.61.0', '10.62.0'].includes(version));
assert.equal(pkg.version, version);
assert.match(html, /APP_VERSION='V10\.(?:60_company_monthly_cashflow|61_company_status_history|62_business_activity_history)'/);
assert.match(sw, /daily-weekly-planner-v10-(?:60-monthly-cashflow|61-company-status-history|62-business-activity-history)/);
assert.match(ui, /const TABS = \['transactions', 'documents', 'cashflowTrends'\]/);
assert.match(ui, /fetchAll\('transaction'\)/);
assert.match(ui, /getMonthlyCashflow\(state\.cashflowTransactions, state\.cashflowCurrency, new Date\(\), 12\)/);
assert.match(ui, /cashflowTrends: '月度收支趋势'/);
assert.match(ui, /cashflowTrends: 'Monthly cashflow'/);
assert.match(ui, /cashflowTrends: '月次収支推移'/);
assert.match(ui, /cashflowPanel\.hidden = !cashflow/);
assert.match(css, /\.cw-cashflow-chart/);
assert.match(css, /\.cw-cashflow-fill-income/);
assert.match(css, /\.cw-cashflow-fill-expense/);
assert.doesNotMatch(ui, /exchangeRate|fxRate|convertCurrency/i);

console.log('V10.60 monthly cashflow validation passed.');
