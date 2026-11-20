const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDate(value) {
  const key = String(value ?? '').slice(0, 10);
  if (!DATE_KEY.test(key)) return '';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? key : '';
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function getBusinessOverviewMetrics(data, today) {
  const customers = Array.isArray(data?.customers) ? data.customers : [];
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const followups = Array.isArray(data?.followups) ? data.followups : [];
  const taskDue = tasks.filter(task => task.status !== 'completed' && normalizeDate(task.due_date));
  const overdueTasks = taskDue.filter(task => normalizeDate(task.due_date) < today);
  const dueTodayTasks = taskDue.filter(task => normalizeDate(task.due_date) === today);
  const next7Tasks = taskDue.filter(task => {
    const due = normalizeDate(task.due_date);
    return due >= today && due <= addDays(today, 6);
  });
  const overdueFollowups = followups.filter(record => {
    const nextDate = normalizeDate(record?.data?.next_follow_up_date);
    return record.status === 'pending' && nextDate && nextDate < today;
  });
  return {
    customers: customers.length,
    activeProjects: projects.filter(project => project.status === 'active').length,
    unfinishedTasks: tasks.filter(task => task.status !== 'completed').length,
    pendingFollowups: followups.filter(record => record.status === 'pending').length,
    overdueTasks: overdueTasks.length,
    dueTodayTasks: dueTodayTasks.length,
    next7Tasks: next7Tasks.length,
    overdueFollowups: overdueFollowups.length
  };
}

export function getRecentBusinessRecords(records, limit = 3) {
  return [...(Array.isArray(records) ? records : [])]
    .sort((a, b) => {
      const date = record => Date.parse(record?.updated_at || record?.created_at || record?.record_date || '') || 0;
      return date(b) - date(a);
    })
    .slice(0, limit);
}
