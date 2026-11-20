const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDateKey(value) {
  const key = String(value ?? '').slice(0, 10);
  if (!DATE_KEY_PATTERN.test(key)) return '';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? key : '';
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function getTodoCenterSections(tasks = [], followups = [], today) {
  const taskRecords = tasks.filter(record => record?.status !== 'completed');
  const datedTasks = taskRecords.map(record => ({ record, dueDate: normalizeDateKey(record?.due_date) }));
  const next7End = addDays(today, 7);
  const overdue = datedTasks.filter(item => item.dueDate && item.dueDate < today).map(item => item.record);
  const dueToday = datedTasks.filter(item => item.dueDate === today).map(item => item.record);
  const upcoming = datedTasks.filter(item => item.dueDate > today && item.dueDate <= next7End).map(item => item.record);
  const undated = datedTasks.filter(item => !item.dueDate).map(item => item.record);
  const pendingFollowups = followups
    .filter(record => record?.status === 'pending')
    .map(record => ({ record, dueDate: normalizeDateKey(record?.data?.next_follow_up_date) }))
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return String(b.record.record_date || '').localeCompare(String(a.record.record_date || ''));
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  return [
    { key:'todoOverdueTasks', type:'tasks', records:overdue },
    { key:'todoTodayTasks', type:'tasks', records:dueToday },
    { key:'todoUpcomingTasks', type:'tasks', records:upcoming },
    { key:'todoUndatedTasks', type:'tasks', records:undated },
    { key:'todoPendingFollowups', type:'followups', records:pendingFollowups.map(item => item.record) }
  ];
}

export function getTodoFollowupDateState(record, today) {
  const dueDate = normalizeDateKey(record?.data?.next_follow_up_date);
  if (!dueDate) return 'todoNoNextDate';
  if (dueDate < today) return 'todoFollowupOverdue';
  if (dueDate === today) return 'todoFollowupToday';
  return 'todoFollowupScheduled';
}
