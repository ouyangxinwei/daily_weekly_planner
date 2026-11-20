const PROJECT_STATUSES = ['planned', 'active', 'on_hold', 'completed', 'cancelled'];

function timestamp(record) {
  const value = Date.parse(record?.updated_at || record?.created_at || record?.record_date || '');
  return Number.isFinite(value) ? value : 0;
}

function progressOf(project) {
  const value = Number(project?.data?.progress_percent ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;
}

export function getProjectCustomerOverview(data = {}, today = '') {
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const customers = Array.isArray(data.customers) ? data.customers : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const followups = Array.isArray(data.followups) ? data.followups : [];
  const customerById = new Map(customers.map(item => [item.id, item]));
  const projectById = new Map(projects.map(item => [item.id, item]));
  const statusCounts = Object.fromEntries(PROJECT_STATUSES.map(status => [status, 0]));
  projects.forEach(project => {
    if (Object.hasOwn(statusCounts, project.status)) statusCounts[project.status] += 1;
  });

  const taskCounts = new Map();
  tasks.forEach(task => {
    const id = task.parent_record_id;
    if (!id) return;
    const counts = taskCounts.get(id) || { total: 0, completed: 0, open: 0 };
    counts.total += 1;
    if (task.status === 'completed') counts.completed += 1;
    else counts.open += 1;
    taskCounts.set(id, counts);
  });

  const customerSummaries = new Map(customers.map(customer => [customer.id, {
    customer, projectCount: 0, activeProjectCount: 0, followupCount: 0, recentAt: 0
  }]));
  projects.forEach(project => {
    const summary = customerSummaries.get(project.parent_record_id);
    if (summary) {
      summary.projectCount += 1;
      if (project.status === 'active') summary.activeProjectCount += 1;
      summary.recentAt = Math.max(summary.recentAt, timestamp(project));
    }
  });
  followups.forEach(record => {
    const value = record?.data && typeof record.data === 'object' ? record.data : {};
    const projectId = value.project_id || (projectById.has(record.parent_record_id) ? record.parent_record_id : '');
    const customerId = value.customer_id
      || (record.related_record_ids || []).find(id => customerById.has(id))
      || (customerById.has(record.parent_record_id) ? record.parent_record_id : '')
      || (projectId ? projectById.get(projectId)?.parent_record_id : '');
    const summary = customerSummaries.get(customerId);
    if (summary) {
      summary.followupCount += 1;
      summary.recentAt = Math.max(summary.recentAt, timestamp(record));
    }
  });

  const projectRows = projects.map(project => {
    const tasksForProject = taskCounts.get(project.id) || { total: 0, completed: 0, open: 0 };
    return {
      project,
      progress: progressOf(project),
      taskTotal: tasksForProject.total,
      taskCompleted: tasksForProject.completed,
      taskOpen: tasksForProject.open,
      customer: customerById.get(project.parent_record_id) || null
    };
  });
  const progressRows = projectRows.filter(row => row.project.status !== 'cancelled');
  const averageProgress = progressRows.length
    ? Math.round(progressRows.reduce((sum, row) => sum + row.progress, 0) / progressRows.length)
    : 0;
  const overdueProjects = today
    ? projects.filter(project => project.status !== 'completed' && project.status !== 'cancelled'
      && /^\d{4}-\d{2}-\d{2}$/.test(String(project.due_date || '').slice(0, 10))
      && String(project.due_date).slice(0, 10) < today)
    : [];

  const recentActivity = [
    ...projects.map(record => ({ type: 'project', record, at: timestamp(record) })),
    ...tasks.map(record => ({ type: 'task', record, at: timestamp(record) })),
    ...followups.map(record => ({ type: 'followup', record, at: timestamp(record) }))
  ].sort((a, b) => b.at - a.at).slice(0, 8);

  const topCustomers = [...customerSummaries.values()]
    .sort((a, b) => b.projectCount - a.projectCount || b.recentAt - a.recentAt)
    .slice(0, 8);
  const topProjects = [...projectRows]
    .sort((a, b) => b.project.updated_at?.localeCompare?.(a.project.updated_at || '') || b.progress - a.progress)
    .slice(0, 8);

  return {
    totalProjects: projects.length,
    statusCounts,
    averageProgress,
    progressProjectCount: progressRows.length,
    completedProjects: statusCounts.completed,
    overdueProjects: overdueProjects.length,
    totalCustomers: customers.length,
    customersWithProjects: [...customerSummaries.values()].filter(item => item.projectCount > 0).length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(task => task.status === 'completed').length,
    projectRows: topProjects,
    customerRows: topCustomers,
    recentActivity
  };
}
