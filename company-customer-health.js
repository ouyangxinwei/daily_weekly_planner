const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  const key = String(value ?? '').slice(0, 10);
  if (!DATE_KEY.test(key)) return '';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? key : '';
}

function shiftDate(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function followupCustomerId(record, customerIds) {
  const data = record?.data && typeof record.data === 'object' ? record.data : {};
  if (data.customer_id && customerIds.has(data.customer_id)) return data.customer_id;
  const related = Array.isArray(record?.related_record_ids) ? record.related_record_ids : [];
  const linked = related.find(id => customerIds.has(id));
  if (linked) return linked;
  return customerIds.has(record?.parent_record_id) ? record.parent_record_id : '';
}

export function getCustomerRelationshipHealth(data = {}, today, staleDays = 30) {
  const date = validDate(today);
  if (!date || date !== today) throw new TypeError('A valid local date key is required.');
  if (!Number.isInteger(staleDays) || staleDays < 1 || staleDays > 365) throw new RangeError('Stale days must be between 1 and 365.');
  const customers = Array.isArray(data.customers) ? data.customers : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const followups = Array.isArray(data.followups) ? data.followups : [];
  const customerIds = new Set(customers.map(item => item.id));
  const activeProjects = projects.filter(item => item.status === 'active');
  const projectsByCustomer = new Map();
  activeProjects.forEach(project => {
    const list = projectsByCustomer.get(project.parent_record_id) || [];
    list.push(project);
    projectsByCustomer.set(project.parent_record_id, list);
  });
  const followupsByCustomer = new Map();
  followups.forEach(record => {
    const id = followupCustomerId(record, customerIds);
    if (!id) return;
    const list = followupsByCustomer.get(id) || [];
    list.push(record);
    followupsByCustomer.set(id, list);
  });
  const staleBefore = shiftDate(date, -staleDays);
  const rows = customers.map(customer => {
    const customerProjects = projectsByCustomer.get(customer.id) || [];
    const customerFollowups = followupsByCustomer.get(customer.id) || [];
    const pending = customerFollowups.filter(item => item.status === 'pending');
    const overdue = pending.filter(item => {
      const next = validDate(item.data?.next_follow_up_date);
      return next && next < date;
    });
    const withoutNextDate = pending.filter(item => !validDate(item.data?.next_follow_up_date));
    const lastContact = customerFollowups.map(item => validDate(item.record_date) || validDate(item.created_at)).filter(Boolean).sort().at(-1) || '';
    const nextDates = pending.map(item => validDate(item.data?.next_follow_up_date)).filter(key => key && key >= date).sort();
    const created = validDate(customer.created_at);
    const noHistory = customerFollowups.length === 0;
    const stale = lastContact ? lastContact < staleBefore : (!created || created < staleBefore);
    const reasons = [];
    let priority = 'none';
    if (overdue.length) { priority = 'urgent'; reasons.push({ key: 'overdue', count: overdue.length }); }
    if (withoutNextDate.length) { if (priority === 'none') priority = 'high'; reasons.push({ key: 'withoutNextDate', count: withoutNextDate.length }); }
    if (customerProjects.length && stale) {
      if (priority === 'none') priority = 'high';
      reasons.push({ key: noHistory ? 'noHistoryWithProjects' : 'staleWithProjects', count: customerProjects.length });
    } else if (!customerProjects.length && stale && !pending.length) {
      if (priority === 'none') priority = 'normal';
      reasons.push({ key: noHistory ? 'noHistory' : 'staleNoProject', count: 1 });
    }
    return {
      id: customer.id,
      title: customer.title || '—',
      priority,
      reasons,
      activeProjectCount: customerProjects.length,
      activeProjects: customerProjects.slice(0, 5).map(item => ({ id: item.id, title: item.title })),
      followupCount: customerFollowups.length,
      pendingFollowups: pending.length,
      overdueFollowups: overdue.length,
      pendingWithoutNextDate: withoutNextDate.length,
      lastContact,
      nextFollowup: nextDates[0] || '',
      noHistory,
      stale
    };
  });
  const order = { urgent: 0, high: 1, normal: 2, none: 3 };
  rows.sort((a, b) => order[a.priority] - order[b.priority] || (a.lastContact || '0000-00-00').localeCompare(b.lastContact || '0000-00-00') || a.title.localeCompare(b.title));
  return {
    generatedAt: date,
    staleDays,
    metrics: {
      customers: customers.length,
      customersWithActiveProjects: rows.filter(item => item.activeProjectCount > 0).length,
      customersWithoutActiveProjects: rows.filter(item => item.activeProjectCount === 0).length,
      customersWithOverdueFollowups: rows.filter(item => item.overdueFollowups > 0).length,
      customersWithPendingNoDate: rows.filter(item => item.pendingWithoutNextDate > 0).length,
      staleCustomersWithProjects: rows.filter(item => item.activeProjectCount > 0 && item.stale).length,
      customersWithoutHistory: rows.filter(item => item.noHistory).length
    },
    rows
  };
}
