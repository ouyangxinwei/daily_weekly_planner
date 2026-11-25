const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  const key = String(value ?? '').slice(0, 10);
  if (!DATE_KEY.test(key)) return '';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? key : '';
}

function dayNumber(key) {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function actualProgress(project) {
  const value = Number(project?.data?.progress_percent ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
}

function riskFor(variance) {
  if (variance >= 0) return 'onTrack';
  if (variance >= -10) return 'slight';
  if (variance >= -25) return 'attention';
  return 'high';
}

/**
 * Compares saved actual progress with a linear calendar-time plan.
 * Same-day plans are 100% on their planned date; cancelled projects are omitted.
 */
export function getProjectDeliveryAnalysis(data = {}, today) {
  const date = validDate(today);
  if (!date || date !== today) throw new TypeError('A valid local date key is required.');
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const rows = projects.filter(project => project?.status !== 'cancelled').map(project => {
    const actual = actualProgress(project);
    if (project.status === 'completed') {
      return { project, actualProgress: actual, plannedProgress: 100, variance: null, risk: 'completed', overdue: false, dateIssue: '' };
    }
    const start = validDate(project?.start_date);
    const due = validDate(project?.due_date);
    if (!project?.start_date || !project?.due_date) {
      return { project, actualProgress: actual, plannedProgress: null, variance: null, risk: 'incomplete', overdue: false, dateIssue: 'missing_dates' };
    }
    if (!start || !due) {
      return { project, actualProgress: actual, plannedProgress: null, variance: null, risk: 'incomplete', overdue: false, dateIssue: 'invalid_dates' };
    }
    if (start > due) {
      return { project, actualProgress: actual, plannedProgress: null, variance: null, risk: 'incomplete', overdue: false, dateIssue: 'date_order' };
    }
    const todayNumber = dayNumber(date);
    const startNumber = dayNumber(start);
    const dueNumber = dayNumber(due);
    const plannedProgress = startNumber === dueNumber
      ? (todayNumber < startNumber ? 0 : 100)
      : Math.max(0, Math.min(100, Math.round((todayNumber - startNumber) / (dueNumber - startNumber) * 100)));
    const variance = actual - plannedProgress;
    const overdue = due < date;
    return { project, actualProgress: actual, plannedProgress, variance, risk: riskFor(variance), overdue, dateIssue: '' };
  });
  const riskOrder = { high: 0, attention: 1, slight: 2, onTrack: 3, incomplete: 4, completed: 5 };
  rows.sort((a, b) => Number(b.overdue) - Number(a.overdue)
    || riskOrder[a.risk] - riskOrder[b.risk]
    || String(a.project?.due_date || '9999-99-99').localeCompare(String(b.project?.due_date || '9999-99-99'))
    || String(a.project?.title || '').localeCompare(String(b.project?.title || '')));
  return {
    generatedAt: date,
    metrics: {
      totalProjects: rows.length,
      onTrack: rows.filter(row => !row.overdue && row.risk === 'onTrack').length,
      behind: rows.filter(row => row.variance !== null && row.variance < 0).length,
      overdue: rows.filter(row => row.overdue).length,
      incomplete: rows.filter(row => row.risk === 'incomplete').length,
      completed: rows.filter(row => row.risk === 'completed').length
    },
    rows
  };
}
