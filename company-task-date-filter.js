const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDateKey(value) {
  const candidate = String(value ?? '').slice(0, 10);
  if (!DATE_KEY_PATTERN.test(candidate)) return '';
  const [year, month, day] = candidate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  return candidate;
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function addCalendarDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function matchesTaskDueDate(record, filter, today = getLocalDateKey()) {
  if (!filter) return true;
  const dueDate = normalizeDateKey(record?.due_date);
  switch (filter) {
    case 'overdue':
      return Boolean(dueDate) && dueDate < today && record?.status !== 'completed';
    case 'today':
      return Boolean(dueDate) && dueDate === today;
    case 'next7':
      return Boolean(dueDate) && dueDate >= today && dueDate <= addCalendarDays(today, 6);
    case 'none':
      return !dueDate;
    default:
      return true;
  }
}
