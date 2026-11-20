const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDate(value) {
  if (value == null || value === '') return '';
  const raw = String(value);
  const key = raw.slice(0, 10);
  if (!DATE_KEY.test(key)) return '';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return '';
  if (raw.length === 10) return key;
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) return '';
  const local = new Date(timestamp);
  return [local.getFullYear(), String(local.getMonth() + 1).padStart(2, '0'), String(local.getDate()).padStart(2, '0')].join('-');
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function monthStart(dateKey, offset = 0) {
  const [year, month] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
}

function weekStart(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addDays(dateKey, -((weekday + 6) % 7));
}

function monthEnd(start) {
  return addDays(monthStart(start, 1), -1);
}

function makePeriods(mode, today) {
  if (mode === 'week') {
    const currentStart = weekStart(today);
    return Array.from({ length: 8 }, (_, index) => {
      const start = addDays(currentStart, (index - 7) * 7);
      return { key: start, start, end: addDays(start, 6), label: start.slice(5).replace('-', '/') };
    });
  }
  const currentStart = monthStart(today);
  return Array.from({ length: 6 }, (_, index) => {
    const start = monthStart(currentStart, index - 5);
    return { key: start, start, end: monthEnd(start), label: start.slice(0, 7) };
  });
}

function countByPeriod(records, periods, dateOf, today) {
  const counts = Object.fromEntries(periods.map(period => [period.key, 0]));
  for (const record of Array.isArray(records) ? records : []) {
    const date = normalizeDate(dateOf(record));
    if (!date || date > today) continue;
    const period = periods.find(item => date >= item.start && date <= item.end);
    if (period) counts[period.key] += 1;
  }
  return counts;
}

function safeRecords(value) {
  return Array.isArray(value) ? value : [];
}

function delta(current, previous) {
  return current - previous;
}

export function getBusinessTrendReport(data = {}, mode = 'month', today = '') {
  if (!DATE_KEY.test(String(today)) || normalizeDate(today) !== today) throw new TypeError('A valid local date key is required.');
  const periodMode = mode === 'week' ? 'week' : 'month';
  const periods = makePeriods(periodMode, today);
  const projects = safeRecords(data.projects);
  const tasks = safeRecords(data.tasks);
  const followups = safeRecords(data.followups);
  const projectCreated = countByPeriod(projects, periods, record => record?.created_at, today);
  const projectCompleted = countByPeriod(projects.filter(record => record?.status === 'completed'), periods, record => record?.updated_at, today);
  const taskCreated = countByPeriod(tasks, periods, record => record?.created_at, today);
  const taskCompleted = countByPeriod(tasks.filter(record => record?.status === 'completed'), periods, record => record?.updated_at, today);
  const followupRecorded = countByPeriod(followups, periods, record => normalizeDate(record?.record_date) ? record.record_date : record?.created_at, today);
  const series = periods.map(period => ({
    ...period,
    projectsCreated: projectCreated[period.key],
    projectsCompleted: projectCompleted[period.key],
    tasksCreated: taskCreated[period.key],
    tasksCompleted: taskCompleted[period.key],
    followups: followupRecorded[period.key]
  }));
  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  const metrics = [
    { key: 'projectsCreated', current: current.projectsCreated, previous: previous.projectsCreated },
    { key: 'projectsCompleted', current: current.projectsCompleted, previous: previous.projectsCompleted },
    { key: 'tasksCreated', current: current.tasksCreated, previous: previous.tasksCreated },
    { key: 'tasksCompleted', current: current.tasksCompleted, previous: previous.tasksCompleted },
    { key: 'followups', current: current.followups, previous: previous.followups }
  ].map(item => ({ ...item, change: delta(item.current, item.previous) }));
  return {
    mode: periodMode,
    periods: series,
    metrics,
    currentPeriod: { start: current.start, end: today },
    previousPeriod: { start: previous.start, end: previous.end },
    totals: {
      projects: projects.length,
      tasks: tasks.length,
      followups: followups.length
    }
  };
}
