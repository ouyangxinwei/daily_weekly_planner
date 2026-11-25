import { CURRENCIES, getMonthlyCashflow } from './company-records-rules.js';

const DATE_KEY = /^\\d{4}-\\d{2}-\\d{2}$/;

function validDate(value) {
  const key = String(value ?? '').slice(0, 10);
  if (!DATE_KEY.test(key)) return '';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? key : '';
}

function addDays(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function safeArray(value) { return Array.isArray(value) ? value : []; }
function timestamp(value) { const parsed = Date.parse(value || ''); return Number.isFinite(parsed) ? parsed : 0; }

export function getBusinessDecisionReport(data = {}, today) {
  const date = validDate(today);
  if (!date || date !== today) throw new TypeError('A valid local date key is required.');
  const customers = safeArray(data.customers);
  const projects = safeArray(data.projects);
  const tasks = safeArray(data.tasks);
  const followups = safeArray(data.followups);
  const transactions = safeArray(data.transactions);
  const activity = safeArray(data.activity);
  const activeProjects = projects.filter(item => item.status === 'active');
  const openTasks = tasks.filter(item => item.status !== 'completed');
  const overdueProjects = activeProjects.filter(item => validDate(item.due_date) && validDate(item.due_date) < date);
  const dueSoonProjects = activeProjects.filter(item => {
    const due = validDate(item.due_date);
    return due && due >= date && due <= addDays(date, 7);
  });
  const overdueTasks = openTasks.filter(item => validDate(item.due_date) && validDate(item.due_date) < date);
  const dueTodayTasks = openTasks.filter(item => validDate(item.due_date) === date);
  const dueSoonTasks = openTasks.filter(item => {
    const due = validDate(item.due_date);
    return due && due > date && due <= addDays(date, 7);
  });
  const blockedTasks = openTasks.filter(item => item.status === 'blocked');
  const overdueFollowups = followups.filter(item => item.status === 'pending' && validDate(item.data?.next_follow_up_date) && validDate(item.data.next_follow_up_date) < date);
  const unplannedFollowups = followups.filter(item => item.status === 'pending' && !validDate(item.data?.next_follow_up_date));
  const projectIds = new Set(projects.map(item => item.id));
  const tasksWithoutProject = openTasks.filter(item => !projectIds.has(item.parent_record_id));
  const recommendations = [];
  const add = (priority, key, records, type) => {
    if (records.length) recommendations.push({ priority, key, count: records.length, type, records: records.slice(0, 8) });
  };
  add('urgent', 'overdueTasks', overdueTasks, 'tasks');
  add('urgent', 'overdueProjects', overdueProjects, 'projects');
  add('urgent', 'overdueFollowups', overdueFollowups, 'followups');
  add('high', 'blockedTasks', blockedTasks, 'tasks');
  add('high', 'dueTodayTasks', dueTodayTasks, 'tasks');
  add('normal', 'dueSoonTasks', dueSoonTasks, 'tasks');
  add('normal', 'dueSoonProjects', dueSoonProjects, 'projects');
  add('normal', 'unplannedFollowups', unplannedFollowups, 'followups');
  add('normal', 'tasksWithoutProject', tasksWithoutProject, 'tasks');
  recommendations.sort((a, b) => ({ urgent: 0, high: 1, normal: 2 }[a.priority] - { urgent: 0, high: 1, normal: 2 }[b.priority]);
  const finance = Object.fromEntries(CURRENCIES.map(currency => {
    const report = getMonthlyCashflow(transactions, currency, new Date(date + 'T12:00:00'), 12);
    return [currency, report.totals];
  }));
  const recentActivity = [...activity].sort((a, b) => timestamp(b.occurred_at) - timestamp(a.occurred_at)).slice(0, 12);
  return {
    metrics: {
      customers: customers.length,
      activeProjects: activeProjects.length,
      completedProjects: projects.filter(item => item.status === 'completed').length,
      openTasks: openTasks.length,
      pendingFollowups: followups.filter(item => item.status === 'pending').length,
      transactions: transactions.length,
      overdueTasks: overdueTasks.length,
      overdueProjects: overdueProjects.length,
      overdueFollowups: overdueFollowups.length,
      blockedTasks: blockedTasks.length
    },
    finance,
    recommendations,
    recentActivity,
    recentRecords: [
      ...projects.map(item => ({ ...item, record_type: 'project', _timestamp: timestamp(item.updated_at || item.created_at) })),
      ...tasks.map(item => ({ ...item, record_type: 'task', _timestamp: timestamp(item.updated_at || item.created_at) })),
      ...followups.map(item => ({ ...item, record_type: 'follow_up', _timestamp: timestamp(item.updated_at || item.created_at) })),
      ...customers.map(item => ({ ...item, record_type: 'customer', _timestamp: timestamp(item.updated_at || item.created_at) }))
    ].sort((a, b) => b._timestamp - a._timestamp).slice(0, 8),
    generatedAt: date
  };
}
