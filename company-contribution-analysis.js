import { CURRENCIES, parseAmountMicros, recordRelations } from './company-records-rules.js';

function dateKey(value) {
  const raw = String(value ?? '');
  const key = raw.slice(0, 10);
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(key)) return '';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? key : '';
}

function zeroTotals() {
  return { income: 0n, expense: 0n, net: 0n, plannedIncome: 0n, plannedExpense: 0n, completedCount: 0, plannedCount: 0 };
}

function addTransaction(target, direction, status, amount) {
  if (status === 'completed') {
    target[direction] += amount;
    target.completedCount += 1;
  } else if (status === 'planned') {
    target[direction === 'income' ? 'plannedIncome' : 'plannedExpense'] += amount;
    target.plannedCount += 1;
  }
  target.net = target.income - target.expense;
}

function ensureGroup(map, id, title) {
  if (!map.has(id)) map.set(id, { id, title: title || '—', ...zeroTotals() });
  return map.get(id);
}

function finishGroups(map, totalIncome) {
  return [...map.values()].map(item => ({
    ...item,
    incomeShareBps: totalIncome > 0n ? item.income * 10000n / totalIncome : 0n
  })).sort((a, b) => a.income === b.income ? (a.expense > b.expense ? -1 : a.expense < b.expense ? 1 : a.title.localeCompare(b.title)) : (a.income > b.income ? -1 : 1));
}

export function getBusinessContributionReport(data = {}, currency, now = new Date(), months = 12) {
  if (!CURRENCIES.includes(currency)) throw new TypeError('Unsupported currency.');
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError('A valid local date is required.');
  if (!Number.isInteger(months) || months < 1 || months > 36) throw new RangeError('Months must be between 1 and 36.');
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const start = [firstMonth.getFullYear(), String(firstMonth.getMonth() + 1).padStart(2, '0'), '01'].join('-');
  const customers = Array.isArray(data.customers) ? data.customers : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const customerMap = new Map(customers.map(item => [item.id, item]));
  const projectMap = new Map(projects.map(item => [item.id, item]));
  const customerGroups = new Map(), projectGroups = new Map();
  const totals = zeroTotals(), unassigned = { ...zeroTotals(), count: 0 };
  let includedCount = 0;

  for (const record of transactions) {
    if (record?.currency !== currency) continue;
    const day = dateKey(record.record_date);
    if (!day || day < start || day > today) continue;
    const direction = record?.data?.direction;
    if (!['income', 'expense'].includes(direction) || !['completed', 'planned'].includes(record.status)) continue;
    const amount = parseAmountMicros(record.amount);
    if (amount === null || amount <= 0n) continue;
    includedCount += 1;
    addTransaction(totals, direction, record.status, amount);

    const relations = recordRelations(record);
    const projectId = relations.projectId || '';
    const project = projectMap.get(projectId);
    const customerId = relations.customerId || project?.parent_record_id || '';
    const customer = customerMap.get(customerId);
    if (customerId) addTransaction(ensureGroup(customerGroups, customerId, customer?.title || record.data?.customer_title || '—'), direction, record.status, amount);
    if (projectId) addTransaction(ensureGroup(projectGroups, projectId, project?.title || record.data?.project_title || '—'), direction, record.status, amount);
    if (!customerId && !projectId) {
      addTransaction(unassigned, direction, record.status, amount);
      unassigned.count += 1;
    }
  }

  return {
    currency, start, end: today, months, includedCount, totals,
    customers: finishGroups(customerGroups, totals.income).slice(0, 10),
    projects: finishGroups(projectGroups, totals.income).slice(0, 10),
    unassigned
  };
}
