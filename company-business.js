import { getLocalDateKey, matchesTaskDueDate } from './company-task-date-filter.js';
import { getBusinessOverviewMetrics, getRecentBusinessRecords } from './company-overview-metrics.js';
import { getTodoCenterSections, getTodoFollowupDateState } from './company-todo-center.js';
import { getProjectCustomerOverview, isOverdueProject } from './company-project-customer-overview.js';
import { getBusinessTrendReport } from './company-business-trends.js';
import { getBusinessDecisionReport } from './company-decision-center.js';
import { getBusinessContributionReport } from './company-contribution-analysis.js';
import { getCustomerRelationshipHealth } from './company-customer-health.js';
import { getProjectDeliveryAnalysis } from './company-project-delivery-analysis.js';
import { formatAmountMicros } from './company-records-rules.js';
import { createRecordCache } from './company-record-loader.js';

(() => {
  'use strict';
  const API = 'company-api';
  const PROJECT_URL = 'https://kopvznygsqsheibsjjvv.supabase.co';
  const PAGE_SIZE = 20;
  // V10.58: complete reads are shared through a short-lived cache to stay within
  // the company-api limit of 30 requests per IP per minute.
  // ENTRY: opening a tab may reuse data read in the last 15 s.
  // LOOKUP: filters, pagination, selectors and relation previews reuse data up to 60 s old.
  // Refresh buttons read again (max age 0); every write invalidates the cache.
  const ENTRY_MAX_AGE_MS = 15000;
  const LOOKUP_MAX_AGE_MS = 60000;
  const RECORD_LABELS = { customer:'customers', project:'projects', task:'tasks', follow_up:'followups' };
  const state = { tab: 'customers', verified: '', customers: [], projects: [], followups: [], tasks: [], projectOffset: 0, followupOffset: 0, taskOffset: 0, projectQuery: '', followupQuery: '', taskQuery: '', taskDueFilter: '', projectStatus: '', projectDueFilter: '', followupStatus: '', taskStatus: '', taskProjectFilter: '', projectCustomerFilter: '', followupCustomerFilter: '', editing: null, busy: false, reloadPending: false, followupProjectFilter: '', followupDueFilter: '', overviewBusy: false, overviewData: null, todoBusy: false, projectCustomerBusy: false, trendBusy: false, trendPeriod: 'month', trendData: null, decisionBusy: false, decisionData: null, contributionBusy: false, contributionData: null, contributionCurrency: 'JPY', customerHealthBusy: false, customerHealthData: null, deliveryBusy: false, deliveryData: null, relationshipRecords: null };
  const $ = id => document.getElementById(id);
  const root = () => $('company-workspace-root');
  const locale = () => (document.documentElement.lang || 'zh-CN').toLowerCase().startsWith('ja') ? 'ja' : ((document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'zh');
  const words = {
    zh: {customerHealth:'客户关系健康',customerHealthTitle:'客户关系健康度与跟进机会',customerHealthSubtitle:'识别逾期待跟进、未安排下次日期及长期缺少联系的客户',customerHealthLoading:'正在分析客户关系与跟进…',customerHealthError:'客户关系分析暂时无法读取',customerHealthCustomers:'客户总数',customerHealthActiveProjects:'有进行中项目的客户',customerHealthOverdue:'存在逾期待跟进',customerHealthNoNextDate:'待跟进但没有下次日期',customerHealthStale:'超过 30 天未联系且有进行中项目',customerHealthNoHistory:'暂无跟进历史',customerHealthRefresh:'刷新',customerHealthLastContact:'最近跟进',customerHealthNextContact:'下次跟进',customerHealthProjects:'进行中项目',customerHealthPending:'待跟进',customerHealthPriorityUrgent:'紧急',customerHealthPriorityHigh:'需要关注',customerHealthPriorityNormal:'机会提示',customerHealthPriorityNone:'暂无明显风险',customerHealthReasonOverdue:'存在逾期待跟进',customerHealthReasonWithoutNextDate:'待跟进记录未设置下次日期',customerHealthReasonNoHistoryWithProjects:'有进行中项目，但暂无跟进历史',customerHealthReasonStaleWithProjects:'有进行中项目，超过 30 天未跟进',customerHealthReasonNoHistory:'暂无跟进历史',customerHealthReasonStaleNoProject:'超过 30 天未跟进且没有进行中项目',customerHealthNoCustomers:'暂无客户记录。',deliveryAnalysis:'项目交付分析',deliveryTitle:'项目计划与实际进度分析',deliverySubtitle:'按项目起止日期估算计划进度，并与当前实际进度比较',deliveryLoading:'正在分析项目交付进度…',deliveryError:'项目交付分析暂时无法读取',deliveryTotal:'项目总数',deliveryOnTrack:'符合计划',deliveryBehind:'进度落后',deliveryOverdue:'已超期',deliveryIncomplete:'日期待补充',deliveryPlanProgress:'计划进度',deliveryActualProgress:'实际进度',deliveryVariance:'进度偏差',deliveryRisk:'进度判断',deliveryRiskOnTrack:'符合计划 / 超前',deliveryRiskSlight:'轻度偏差',deliveryRiskAttention:'需要关注',deliveryRiskHigh:'高风险',deliveryOverdueLabel:'已超出预计完成日期',deliveryIncompleteLabel:'计划日期不完整',deliveryDateIssueMissing:'缺少开始日期或预计完成日期',deliveryDateIssueInvalid:'开始日期或预计完成日期无效',deliveryDateIssueOrder:'开始日期晚于预计完成日期',deliveryCompletedLabel:'已完成',deliveryNoProjects:'暂无可分析的项目。',deliveryStartDate:'开始日期',deliveryDueDate:'预计完成',deliveryNote:'计划进度按日历时间线性估算，不代表实际工作量。偏差以百分点表示；风险阈值是可调整的初始产品规则，并非行业标准。已取消项目不参与分析，已完成项目不计入延期风险。',customerHealthNote:'提示基于明确的跟进日期和项目状态规则，不是 AI 客户评分，也不代表客户价值或流失预测。',contributionAnalysis:'客户/项目收支贡献',contributionTitle:'客户与项目收支贡献分析',contributionSubtitle:'按关联客户和项目查看最近 12 个月的已完成及预计收支',contributionLoading:'正在分析客户与项目收支…',contributionError:'客户/项目收支分析暂时无法读取',contributionIncome:'已完成收入',contributionExpense:'已完成支出',contributionNet:'收支净额',contributionPlanned:'预计收入 / 支出',contributionCustomers:'客户收支排名',contributionProjects:'项目收支排名',contributionShare:'收入占比',contributionTransactions:'交易笔数',contributionUnassigned:'未关联客户/项目的交易',contributionNoGroups:'该币种最近 12 个月没有已关联交易。',contributionNoUnassigned:'没有未关联的交易。',contributionNote:'客户视图和项目视图是两种独立的归属分析，同一笔同时关联客户与项目的交易会分别出现在两个视图中，不应将两边金额相加。净额仅为现金流差额，不代表利润。',contributionRefresh:'刷新',currency:'币种',decisionCenter:'经营决策台',decisionTitle:'经营状况与行动建议',decisionSubtitle:'整合客户、项目、任务、收支与近期活动',decisionLoading:'正在汇总经营数据…',decisionLoadError:'经营决策数据暂时无法读取',decisionCustomers:'客户',decisionActiveProjects:'进行中项目',decisionOpenTasks:'未完成任务',decisionPendingFollowups:'待处理跟进',decisionTransactions:'交易记录',decisionFinanceTitle:'近 12 个月收支概况',decisionFinanceNote:'各币种独立统计；净额仅表示收入减支出的现金流，不等同于会计利润。预计交易单独列示。',decisionIncome:'已完成收入',decisionExpense:'已完成支出',decisionNet:'收支净额',decisionPlanned:'预计收入 / 支出',decisionActionsTitle:'建议优先处理',decisionActivityTitle:'近期活动历史',decisionRecordsTitle:'近期业务记录',decisionNoActions:'目前没有识别到需要优先处理的事项。',decisionNoActivity:'暂无可显示的活动历史。',decisionNoRecords:'暂无业务记录。',decisionOverdueTasks:'逾期任务',decisionOverdueProjects:'逾期项目',decisionOverdueFollowups:'逾期待跟进',decisionBlockedTasks:'受阻任务',decisionDueTodayTasks:'今日到期任务',decisionDueSoonTasks:'未来 7 天到期任务',decisionDueSoonProjects:'未来 7 天到期项目',decisionUnplannedFollowups:'尚未安排下次日期的待跟进',decisionTasksWithoutProject:'未关联项目的未完成任务',decisionUrgent:'紧急',decisionHigh:'高优先级',decisionNormal:'建议关注',decisionView:'查看',decisionRefresh:'刷新',businessTrends:'业务趋势',trendsTitle:'业务趋势与周期复盘',trendsSubtitle:'按周或月查看项目、任务和客户跟进活动',trendsLoading:'正在汇总业务趋势…',trendsLoadError:'业务趋势暂时无法读取',trendsWeek:'最近 8 周',trendsMonth:'最近 6 个月',trendsProjects:'项目趋势',trendsTasks:'任务趋势',trendsFollowups:'客户跟进趋势',trendsCreated:'新增',trendsCompleted:'完成',trendsRecorded:'跟进记录',trendsVsPrevious:'较上一周期',trendsIncrease:'增加',trendsDecrease:'减少',trendsNoChange:'持平',trendsNote:'项目/任务完成趋势按真实状态变更时间统计；V10.61.0 上线前的历史状态无法可靠还原，不做回填。',statusHistory:'活动历史',statusHistoryTitle:'业务活动时间线',activityHistoryLoading:'正在读取活动记录…',activityHistoryEmpty:'暂无活动记录。V10.62.0 上线后发生的创建、修改、删除和状态变化会在这里显示。',activityHistoryError:'活动记录暂时无法读取。',activityHistoryNote:'只记录操作类型和发生变化的字段名称，不保存字段内容。历史从 V10.62.0 上线后开始积累。',activityCreated:'创建了记录',activityUpdated:'修改了记录',activityDeleted:'删除了记录',activityStatusChanged:'变更了状态',activityFields:'变更字段',statusInitial:'初始状态',statusCleared:'未设置',trendsReview:'周期复盘',trendsCurrent:'本期截至今天',trendsPrevious:'上期',projectCustomerOverview:'项目与客户概况',pcOverviewTitle:'项目与客户业务概况',pcOverviewSubtitle:'查看项目状态、进度、客户项目组合与近期业务活动',pcLoading:'正在汇总项目与客户数据…',pcLoadError:'项目与客户概况暂时无法读取',pcProjects:'项目概况',pcCustomers:'客户项目组合',pcStatusDistribution:'项目状态分布',pcProgressOverview:'项目进度概览',pcAverageProgress:'平均项目进度',pcCompletedProjects:'已完成项目',pcOverdueProjects:'逾期项目',pcCustomerCoverage:'客户项目覆盖',pcCustomersWithProjects:'已有项目的客户',pcTaskCompletion:'任务完成情况',pcRecentActivity:'近期业务活动',pcNoProjects:'暂无项目',pcNoCustomers:'暂无客户',pcNoActivity:'暂无近期活动',pcProjectTaskSummary:'任务完成',pcOpen:'未完成',pcCompleted:'已完成',pcViewCustomer:'查看客户',pcViewProject:'查看项目',pcViewTask:'查看任务',pcViewFollowup:'查看跟进',  overview:'业务总览', todoCenter:'待办中心', todoCenterTitle:'待办事项中心', todoCenterSubtitle:'集中查看需要处理的任务与客户跟进', todoLoading:'正在整理待办事项…', todoLoadError:'待办事项暂时无法读取', todoEmpty:'目前没有需要处理的事项', todoOverdueTasks:'逾期任务', todoTodayTasks:'今日任务', todoUpcomingTasks:'未来 7 天任务', todoUndatedTasks:'未设置截止日期的任务', todoPendingFollowups:'待处理跟进', todoDueDate:'截止日期', todoProject:'所属项目', todoNextFollowup:'下次跟进', todoFollowupOverdue:'已逾期', todoFollowupToday:'今天', todoFollowupScheduled:'已安排', todoNoNextDate:'未设置下次跟进日期', todoOpenRecord:'打开记录', overviewTitle:'业务总览', overviewSubtitle:'快速了解当前业务状况与需要处理的事项', customersTotal:'客户总数', activeProjects:'进行中项目', unfinishedTasks:'未完成任务', pendingFollowups:'待处理跟进', needsAttention:'需要关注', overdueTasksCount:'逾期任务', dueTodayCount:'今日到期', dueNext7Count:'未来 7 天到期', overdueFollowups:'逾期待跟进', recentProjects:'最近更新项目', recentTasks:'最近任务', recentFollowups:'最近客户跟进', noRecent:'暂无记录', overviewLoading:'正在汇总业务数据…', overviewError:'业务总览暂时无法读取', incompleteData:'数据未能完整读取，请刷新重试', openTasks:'未完成', allFollowupDates:'全部跟进日期', overdueOnly:'仅逾期', allProjectDueDates:'全部预计完成日期', relatedFollowupCount:'关联跟进', customers:'客户', projects:'项目管理', tasks:'项目任务', followups:'业务跟进', project:'项目', task:'任务', followup:'跟进记录', newProject:'新增项目', newTask:'新增任务', newFollowup:'新增跟进', searchProject:'搜索项目名称', searchTask:'搜索任务名称', allTaskDueDates:'全部截止日期', overdueTasks:'逾期任务', dueToday:'今日到期', dueNext7Days:'未来 7 天', noDueDate:'无截止日期', noMatchingTasks:'没有符合当前筛选条件的任务', searchFollowup:'搜索跟进内容', allStatus:'全部状态', customer:'所属客户', chooseCustomer:'选择客户', status:'项目状态', planned:'计划中', active:'进行中', on_hold:'暂缓', completed:'已完成', cancelled:'已取消', prospect:'潜在客户', trade:'贸易', software:'软件开发', ecommerce:'电子商务', startDate:'开始日期', dueDate:'预计完成日期', description:'项目说明', save:'保存', cancel:'取消', edit:'编辑', delete:'删除', noProjects:'还没有项目', noTasks:'这个项目还没有任务', noFollowups:'还没有跟进记录', createProjectHint:'为客户建立第一个项目。', createTaskHint:'把项目拆分为可执行的任务。', createFollowupHint:'记录一次电话、邮件或会议跟进。', confirmDeleteProject:'确定删除这个项目吗？此操作无法撤销。', confirmDeleteTask:'确定删除这个任务吗？此操作无法撤销。', confirmDeleteFollowup:'确定删除这条跟进记录吗？此操作无法撤销。', method:'跟进方式', phone:'电话', email:'邮件', meeting:'会议', message:'即时消息', other:'其他', followupDate:'跟进时间', outcome:'跟进结果', nextDate:'下次跟进日期', notes:'备注', linkedProject:'关联项目（可选）', noProject:'不关联项目', pending:'待跟进', done:'已完成', next:'下一页', previous:'上一页', loading:'正在加载…', loaded:'已加载', failed:'操作失败，请稍后重试。', relationError:'该项目仍有关联的任务或跟进记录，请先调整或删除相关记录。', required:'请填写必填项目并选择客户。', customerMissing:'请先创建客户，再创建项目或跟进记录。', refresh:'刷新', allProjects:'全部项目', filterProject:'按项目筛选', projectTitle:'项目名称', followupTitle:'跟进主题', progress:'项目进度', progressPercent:'手动项目进度（0–100%）', progressMode:'进度计算方式', manualProgress:'手动设置', autoProgress:'按任务自动计算', progressAutoHint:'自动模式下，已完成任务数 ÷ 全部任务数 × 100%。', progressManualHint:'手动模式下，任务状态变化不会覆盖此进度。', viewDetails:'查看详情', projectDetails:'项目详情', manageTasks:'管理任务', taskTitle:'任务名称', taskProject:'所属项目', taskStatus:'任务状态', taskDue:'截止日期', todo:'待处理', in_progress:'进行中', blocked:'受阻', requiredTaskProject:'请选择所属项目。', invalidTaskStatus:'请选择有效的任务状态。', invalidProgress:'项目进度必须是 0 到 100 之间的整数。', close:'关闭', viewCustomer:'查看客户', viewProject:'查看项目', viewProjects:'查看项目', viewFollowups:'查看跟进', backToCustomer:'返回客户', backToProject:'返回项目', relatedCustomer:'关联客户', relatedProject:'关联项目', clearRelationFilter:'清除关联筛选', relatedTasks:'关联任务', relatedFollowups:'跟进记录', attachments:'附件', noRelatedRecords:'暂无关联记录', loadingRelations:'正在读取关联信息…', relationLoadFailed:'关联信息暂时无法读取。', rateLimited:'请求过于频繁，请等待约 1 分钟后再刷新。' },
    en: {customerHealth:'Customer relationship health',customerHealthTitle:'Customer relationship health and follow-up opportunities',customerHealthSubtitle:'Find overdue follow-ups, missing next dates and customers without recent contact',customerHealthLoading:'Analyzing customer relationships and follow-ups…',customerHealthError:'Customer relationship analysis is temporarily unavailable',customerHealthCustomers:'Customers',customerHealthActiveProjects:'Customers with active projects',customerHealthOverdue:'Customers with overdue follow-ups',customerHealthNoNextDate:'Pending follow-ups without a next date',customerHealthStale:'No contact for 30+ days with active projects',customerHealthNoHistory:'No follow-up history',customerHealthRefresh:'Refresh',customerHealthLastContact:'Last contact',customerHealthNextContact:'Next follow-up',customerHealthProjects:'Active projects',customerHealthPending:'Pending follow-ups',customerHealthPriorityUrgent:'Urgent',customerHealthPriorityHigh:'Needs attention',customerHealthPriorityNormal:'Opportunity',customerHealthPriorityNone:'No clear risk',customerHealthReasonOverdue:'Overdue follow-ups exist',customerHealthReasonWithoutNextDate:'Pending follow-up has no next date',customerHealthReasonNoHistoryWithProjects:'Active projects but no follow-up history',customerHealthReasonStaleWithProjects:'Active projects with no contact for over 30 days',customerHealthReasonNoHistory:'No follow-up history',customerHealthReasonStaleNoProject:'No contact for over 30 days and no active project',customerHealthNoCustomers:'No customer records yet.',deliveryAnalysis:'Project delivery',deliveryTitle:'Planned vs. actual project progress',deliverySubtitle:'Estimate planned progress from project dates and compare it with current actual progress',deliveryLoading:'Analyzing project delivery progress…',deliveryError:'Project delivery analysis is temporarily unavailable',deliveryTotal:'Total projects',deliveryOnTrack:'On track',deliveryBehind:'Behind schedule',deliveryOverdue:'Overdue',deliveryIncomplete:'Dates incomplete',deliveryPlanProgress:'Planned progress',deliveryActualProgress:'Actual progress',deliveryVariance:'Progress variance',deliveryRisk:'Progress assessment',deliveryRiskOnTrack:'On track / ahead',deliveryRiskSlight:'Minor variance',deliveryRiskAttention:'Needs attention',deliveryRiskHigh:'High risk',deliveryOverdueLabel:'Past planned completion date',deliveryIncompleteLabel:'Plan dates incomplete',deliveryDateIssueMissing:'Start date or due date is missing',deliveryDateIssueInvalid:'Start date or due date is invalid',deliveryDateIssueOrder:'Start date is later than due date',deliveryCompletedLabel:'Completed',deliveryNoProjects:'There are no projects to analyze.',deliveryStartDate:'Start date',deliveryDueDate:'Planned due date',deliveryNote:'Planned progress is a linear calendar-time estimate, not actual effort. Variance is measured in percentage points. Risk thresholds are adjustable initial product rules, not an industry standard. Cancelled projects are excluded; completed projects are not treated as delay risks.',customerHealthNote:'These are deterministic date and project-status rules, not an AI customer score, customer-value estimate or churn prediction.',contributionAnalysis:'Customer/project cashflow',contributionTitle:'Customer and project cashflow contribution',contributionSubtitle:'Completed and planned transactions by linked customer and project over the last 12 months',contributionLoading:'Analyzing customer and project cashflow…',contributionError:'Customer/project cashflow analysis is temporarily unavailable',contributionIncome:'Completed income',contributionExpense:'Completed expense',contributionNet:'Net cashflow',contributionPlanned:'Planned income / expense',contributionCustomers:'Customer cashflow ranking',contributionProjects:'Project cashflow ranking',contributionShare:'Income share',contributionTransactions:'Transactions',contributionUnassigned:'Transactions without a customer or project',contributionNoGroups:'No linked transactions for this currency in the last 12 months.',contributionNoUnassigned:'No unassigned transactions.',contributionNote:'Customer and project views are independent attribution views. A transaction linked to both appears in both views; do not add the two sides together. Net is a cashflow difference, not profit.',contributionRefresh:'Refresh',currency:'Currency',decisionCenter:'Decision center',decisionTitle:'Business health and recommended actions',decisionSubtitle:'Customers, projects, tasks, cashflow and recent activity in one view',decisionLoading:'Summarizing business data…',decisionLoadError:'Business decision data is temporarily unavailable',decisionCustomers:'Customers',decisionActiveProjects:'Active projects',decisionOpenTasks:'Open tasks',decisionPendingFollowups:'Pending follow-ups',decisionTransactions:'Transactions',decisionFinanceTitle:'Cashflow over the last 12 months',decisionFinanceNote:'Currencies are kept separate. Net is income minus expense, not accounting profit. Planned transactions are shown separately.',decisionIncome:'Completed income',decisionExpense:'Completed expense',decisionNet:'Net cashflow',decisionPlanned:'Planned income / expense',decisionActionsTitle:'Recommended next actions',decisionActivityTitle:'Recent activity history',decisionRecordsTitle:'Recent business records',decisionNoActions:'No priority actions were identified.',decisionNoActivity:'No activity history to show yet.',decisionNoRecords:'No business records yet.',decisionOverdueTasks:'Overdue tasks',decisionOverdueProjects:'Overdue projects',decisionOverdueFollowups:'Overdue follow-ups',decisionBlockedTasks:'Blocked tasks',decisionDueTodayTasks:'Tasks due today',decisionDueSoonTasks:'Tasks due in the next 7 days',decisionDueSoonProjects:'Projects due in the next 7 days',decisionUnplannedFollowups:'Pending follow-ups without a next date',decisionTasksWithoutProject:'Open tasks not linked to a project',decisionUrgent:'Urgent',decisionHigh:'High priority',decisionNormal:'Review',decisionView:'View',decisionRefresh:'Refresh',businessTrends:'Business trends',trendsTitle:'Business trends and review',trendsSubtitle:'Review projects, tasks and customer follow-ups by week or month',trendsLoading:'Summarizing business trends…',trendsLoadError:'Business trends are temporarily unavailable',trendsWeek:'Last 8 weeks',trendsMonth:'Last 6 months',trendsProjects:'Project trends',trendsTasks:'Task trends',trendsFollowups:'Customer follow-up trends',trendsCreated:'Created',trendsCompleted:'Completed',trendsRecorded:'Follow-ups',trendsVsPrevious:'vs previous period',trendsIncrease:'Up',trendsDecrease:'Down',trendsNoChange:'No change',trendsNote:'Project/task completion trends use actual status-change timestamps. Earlier history before V10.61.0 cannot be reliably reconstructed and is not backfilled.',statusHistory:'Activity history',statusHistoryTitle:'Business activity timeline',activityHistoryLoading:'Loading activity…',activityHistoryEmpty:'No activity has been recorded yet. Creates, edits, deletes and status changes from V10.62.0 onward will appear here.',activityHistoryError:'Activity history is temporarily unavailable.',activityHistoryNote:'Only action types and changed field names are stored; field values are never copied. History starts with V10.62.0.',activityCreated:'Record created',activityUpdated:'Record updated',activityDeleted:'Record deleted',activityStatusChanged:'Status changed',activityFields:'Changed fields',statusInitial:'Initial status',statusCleared:'Unset',trendsReview:'Period review',trendsCurrent:'Current period to date',trendsPrevious:'Previous',projectCustomerOverview:'Project & customer overview',pcOverviewTitle:'Project and customer overview',pcOverviewSubtitle:'Explore project status, progress, customer portfolios and recent activity',pcLoading:'Summarizing project and customer data…',pcLoadError:'Project and customer overview is temporarily unavailable',pcProjects:'Project overview',pcCustomers:'Customer portfolios',pcStatusDistribution:'Project status distribution',pcProgressOverview:'Project progress',pcAverageProgress:'Average project progress',pcCompletedProjects:'Completed projects',pcOverdueProjects:'Overdue projects',pcCustomerCoverage:'Customer coverage',pcCustomersWithProjects:'Customers with projects',pcTaskCompletion:'Task completion',pcRecentActivity:'Recent business activity',pcNoProjects:'No projects yet',pcNoCustomers:'No customers yet',pcNoActivity:'No recent activity',pcProjectTaskSummary:'Tasks completed',pcOpen:'Open',pcCompleted:'Completed',pcViewCustomer:'View customer',pcViewProject:'View project',pcViewTask:'View task',pcViewFollowup:'View follow-up',  overview:'Business overview', todoCenter:'To-do center', todoCenterTitle:'To-do center', todoCenterSubtitle:'One place for tasks and customer follow-ups that need attention', todoLoading:'Loading to-do items…', todoLoadError:'To-do items are temporarily unavailable', todoEmpty:'Nothing needs your attention right now', todoOverdueTasks:'Overdue tasks', todoTodayTasks:'Tasks due today', todoUpcomingTasks:'Tasks due in the next 7 days', todoUndatedTasks:'Tasks without a due date', todoPendingFollowups:'Pending follow-ups', todoDueDate:'Due', todoProject:'Project', todoNextFollowup:'Next follow-up', todoFollowupOverdue:'Overdue', todoFollowupToday:'Today', todoFollowupScheduled:'Scheduled', todoNoNextDate:'No next date set', todoOpenRecord:'Open record', overviewTitle:'Business overview', overviewSubtitle:'A quick view of current business and items needing attention', customersTotal:'Customers', activeProjects:'Active projects', unfinishedTasks:'Open tasks', pendingFollowups:'Pending follow-ups', needsAttention:'Needs attention', overdueTasksCount:'Overdue tasks', dueTodayCount:'Due today', dueNext7Count:'Due in next 7 days', overdueFollowups:'Overdue follow-ups', recentProjects:'Recently updated projects', recentTasks:'Recent tasks', recentFollowups:'Recent customer follow-ups', noRecent:'No records yet', overviewLoading:'Loading business overview…', overviewError:'Business overview is temporarily unavailable', incompleteData:'Could not read all records. Please refresh.', openTasks:'Open', allFollowupDates:'All follow-up dates', overdueOnly:'Overdue only', allProjectDueDates:'All target dates', relatedFollowupCount:'Follow-ups', customers:'Customers', projects:'Projects', tasks:'Project tasks', followups:'Business follow-ups', project:'Project', task:'Task', followup:'Follow-up', newProject:'New project', newTask:'New task', newFollowup:'New follow-up', searchProject:'Search project name', searchTask:'Search task name', allTaskDueDates:'All due dates', overdueTasks:'Overdue', dueToday:'Due today', dueNext7Days:'Next 7 days', noDueDate:'No due date', noMatchingTasks:'No tasks match the current filters', searchFollowup:'Search follow-up', allStatus:'All statuses', customer:'Customer', chooseCustomer:'Select customer', status:'Project status', planned:'Planned', active:'In progress', on_hold:'On hold', completed:'Completed', cancelled:'Cancelled', prospect:'Prospect', trade:'Trade', software:'Software', ecommerce:'E-commerce', startDate:'Start date', dueDate:'Target date', description:'Description', save:'Save', cancel:'Cancel', edit:'Edit', delete:'Delete', noProjects:'No projects yet', noTasks:'No tasks for this project yet', noFollowups:'No follow-ups yet', createProjectHint:'Create the first project for a customer.', createTaskHint:'Break this project into actionable tasks.', createFollowupHint:'Record a call, email or meeting.', confirmDeleteProject:'Delete this project? This cannot be undone.', confirmDeleteTask:'Delete this task? This cannot be undone.', confirmDeleteFollowup:'Delete this follow-up? This cannot be undone.', method:'Method', phone:'Phone', email:'Email', meeting:'Meeting', message:'Message', other:'Other', followupDate:'Follow-up time', outcome:'Outcome', nextDate:'Next follow-up date', notes:'Notes', linkedProject:'Related project (optional)', noProject:'No project', pending:'Pending', done:'Completed', next:'Next', previous:'Previous', loading:'Loading…', loaded:'Loaded', failed:'Operation failed. Please try again.', relationError:'This project still has linked tasks or follow-ups. Reassign or delete them first.', required:'Complete required fields and select a customer.', customerMissing:'Create a customer before adding projects or follow-ups.', refresh:'Refresh', allProjects:'All projects', filterProject:'Filter by project', projectTitle:'Project name', followupTitle:'Follow-up subject', progress:'Project progress', progressPercent:'Manual project progress (0–100%)', progressMode:'Progress calculation', manualProgress:'Manual', autoProgress:'Automatic from tasks', progressAutoHint:'Completed tasks ÷ all project tasks × 100%.', progressManualHint:'Task status changes will not overwrite this value in manual mode.', viewDetails:'View details', projectDetails:'Project details', manageTasks:'Manage tasks', taskTitle:'Task name', taskProject:'Project', taskStatus:'Task status', taskDue:'Due date', todo:'To do', in_progress:'In progress', blocked:'Blocked', requiredTaskProject:'Select a project for this task.', invalidTaskStatus:'Select a valid task status.', invalidProgress:'Progress must be a whole number from 0 to 100.', close:'Close', viewCustomer:'View customer', viewProject:'View project', viewProjects:'View projects', viewFollowups:'View follow-ups', backToCustomer:'Back to customer', backToProject:'Back to project', relatedCustomer:'Related customer', relatedProject:'Related project', clearRelationFilter:'Clear relation filter', relatedTasks:'Related tasks', relatedFollowups:'Follow-ups', attachments:'Attachments', noRelatedRecords:'No related records', loadingRelations:'Loading related information…', relationLoadFailed:'Related information is temporarily unavailable.', rateLimited:'Too many requests. Please wait about a minute and refresh.' },
    ja: {customerHealth:'顧客関係の健全性',customerHealthTitle:'顧客関係の健全性とフォロー機会',customerHealthSubtitle:'期限超過、次回日付未設定、長期間連絡のない顧客を確認',customerHealthLoading:'顧客関係とフォローを分析中…',customerHealthError:'顧客関係分析を一時的に読み込めません',customerHealthCustomers:'顧客数',customerHealthActiveProjects:'進行中プロジェクトがある顧客',customerHealthOverdue:'期限超過フォローがある顧客',customerHealthNoNextDate:'次回日付未設定の未対応フォロー',customerHealthStale:'進行中案件があり30日以上連絡なし',customerHealthNoHistory:'フォロー履歴なし',customerHealthRefresh:'更新',customerHealthLastContact:'最終連絡',customerHealthNextContact:'次回フォロー',customerHealthProjects:'進行中プロジェクト',customerHealthPending:'未対応フォロー',customerHealthPriorityUrgent:'緊急',customerHealthPriorityHigh:'要対応',customerHealthPriorityNormal:'機会',customerHealthPriorityNone:'明確なリスクなし',customerHealthReasonOverdue:'期限超過フォローがあります',customerHealthReasonWithoutNextDate:'未対応フォローに次回日付がありません',customerHealthReasonNoHistoryWithProjects:'進行中案件がありますがフォロー履歴がありません',customerHealthReasonStaleWithProjects:'進行中案件があり30日以上連絡がありません',customerHealthReasonNoHistory:'フォロー履歴がありません',customerHealthReasonStaleNoProject:'30日以上連絡がなく進行中案件もありません',customerHealthNoCustomers:'顧客レコードはありません。',deliveryAnalysis:'プロジェクト納期分析',deliveryTitle:'計画進捗と実績進捗の比較',deliverySubtitle:'開始日と完了予定日から計画進捗を推定し、現在の実績と比較します',deliveryLoading:'プロジェクトの納期進捗を分析中…',deliveryError:'プロジェクト納期分析を一時的に読み込めません',deliveryTotal:'プロジェクト総数',deliveryOnTrack:'計画どおり',deliveryBehind:'進捗遅延',deliveryOverdue:'期限超過',deliveryIncomplete:'日付未設定',deliveryPlanProgress:'計画進捗',deliveryActualProgress:'実績進捗',deliveryVariance:'進捗差',deliveryRisk:'進捗判定',deliveryRiskOnTrack:'計画どおり／先行',deliveryRiskSlight:'軽微な差',deliveryRiskAttention:'要確認',deliveryRiskHigh:'高リスク',deliveryOverdueLabel:'完了予定日を超過',deliveryIncompleteLabel:'計画日付が不完全',deliveryDateIssueMissing:'開始日または完了予定日が未設定です',deliveryDateIssueInvalid:'開始日または完了予定日が無効です',deliveryDateIssueOrder:'開始日が完了予定日より後です',deliveryCompletedLabel:'完了',deliveryNoProjects:'分析対象のプロジェクトはありません。',deliveryStartDate:'開始日',deliveryDueDate:'完了予定日',deliveryNote:'計画進捗はカレンダー日数による線形推定であり、実作業量を示すものではありません。差はパーセントポイントで表示します。リスク基準は調整可能な初期ルールで、業界標準ではありません。キャンセル済み案件は除外し、完了済み案件は遅延リスクに含めません。',customerHealthNote:'日付とプロジェクト状態に基づく明示的なルールです。AI による顧客評価、顧客価値、解約予測ではありません。',contributionAnalysis:'顧客・プロジェクト収支',contributionTitle:'顧客・プロジェクト別の収支貢献分析',contributionSubtitle:'直近12か月の完了済み・予定取引を関連顧客とプロジェクト別に表示',contributionLoading:'顧客・プロジェクトの収支を分析中…',contributionError:'顧客・プロジェクト収支を一時的に読み込めません',contributionIncome:'完了収入',contributionExpense:'完了支出',contributionNet:'収支純額',contributionPlanned:'予定収入 / 支出',contributionCustomers:'顧客別収支ランキング',contributionProjects:'プロジェクト別収支ランキング',contributionShare:'収入比率',contributionTransactions:'取引件数',contributionUnassigned:'顧客・プロジェクト未紐付けの取引',contributionNoGroups:'この通貨の直近12か月に関連取引はありません。',contributionNoUnassigned:'未紐付け取引はありません。',contributionNote:'顧客別とプロジェクト別は独立した帰属分析です。両方に紐付く取引は両方の表示に含まれるため、金額を合算しないでください。純額はキャッシュフロー差額であり、利益ではありません。',contributionRefresh:'更新',currency:'通貨',decisionCenter:'経営判断センター',decisionTitle:'事業状況と推奨アクション',decisionSubtitle:'顧客、プロジェクト、タスク、収支、最近の活動を統合',decisionLoading:'事業データを集計中…',decisionLoadError:'経営判断データを一時的に読み込めません',decisionCustomers:'顧客',decisionActiveProjects:'進行中プロジェクト',decisionOpenTasks:'未完了タスク',decisionPendingFollowups:'未対応フォロー',decisionTransactions:'取引',decisionFinanceTitle:'直近12か月の収支',decisionFinanceNote:'通貨ごとに集計します。純額は収入と支出の差であり、会計上の利益ではありません。予定取引は別表示です。',decisionIncome:'完了収入',decisionExpense:'完了支出',decisionNet:'収支純額',decisionPlanned:'予定収入 / 支出',decisionActionsTitle:'優先アクション',decisionActivityTitle:'最近の活動履歴',decisionRecordsTitle:'最近の業務レコード',decisionNoActions:'優先して対応する項目はありません。',decisionNoActivity:'表示できる活動履歴はありません。',decisionNoRecords:'業務レコードはありません。',decisionOverdueTasks:'期限超過タスク',decisionOverdueProjects:'期限超過プロジェクト',decisionOverdueFollowups:'期限超過フォロー',decisionBlockedTasks:'停止中タスク',decisionDueTodayTasks:'本日期限のタスク',decisionDueSoonTasks:'7日以内に期限を迎えるタスク',decisionDueSoonProjects:'7日以内に期限を迎えるプロジェクト',decisionUnplannedFollowups:'次回日程未設定のフォロー',decisionTasksWithoutProject:'プロジェクト未紐付けの未完了タスク',decisionUrgent:'緊急',decisionHigh:'優先度高',decisionNormal:'要確認',decisionView:'表示',decisionRefresh:'更新',businessTrends:'業務トレンド',trendsTitle:'業務トレンドと期間レビュー',trendsSubtitle:'週次・月次でプロジェクト、タスク、顧客フォローを確認',trendsLoading:'業務トレンドを集計中…',trendsLoadError:'業務トレンドを一時的に読み込めません',trendsWeek:'直近8週間',trendsMonth:'直近6か月',trendsProjects:'プロジェクトの推移',trendsTasks:'タスクの推移',trendsFollowups:'顧客フォローの推移',trendsCreated:'新規',trendsCompleted:'完了',trendsRecorded:'フォロー記録',trendsVsPrevious:'前期間比',trendsIncrease:'増加',trendsDecrease:'減少',trendsNoChange:'変化なし',trendsNote:'プロジェクト/タスクの完了推移は実際の状態変更日時で集計します。V10.61.0 公開前の履歴は正確に復元できないため、補完しません。',statusHistory:'活動履歴',statusHistoryTitle:'業務活動タイムライン',activityHistoryLoading:'活動履歴を読み込み中…',activityHistoryEmpty:'活動履歴はまだありません。V10.62.0 公開後の作成・編集・削除・状態変更がここに表示されます。',activityHistoryError:'活動履歴を一時的に読み込めません。',activityHistoryNote:'操作種別と変更された項目名のみを保存し、項目の値は複製しません。履歴は V10.62.0 から記録します。',activityCreated:'レコードを作成',activityUpdated:'レコードを更新',activityDeleted:'レコードを削除',activityStatusChanged:'状態を変更',activityFields:'変更項目',statusInitial:'初期状態',statusCleared:'未設定',trendsReview:'期間レビュー',trendsCurrent:'今期（本日まで）',trendsPrevious:'前期',projectCustomerOverview:'プロジェクト・顧客概要',pcOverviewTitle:'プロジェクトと顧客の業務概要',pcOverviewSubtitle:'プロジェクトの状態・進捗、顧客別の案件構成、最近の活動を確認',pcLoading:'プロジェクトと顧客のデータを集計中…',pcLoadError:'プロジェクト・顧客概要を一時的に読み込めません',pcProjects:'プロジェクト概要',pcCustomers:'顧客別プロジェクト',pcStatusDistribution:'プロジェクト状態の分布',pcProgressOverview:'プロジェクト進捗',pcAverageProgress:'平均プロジェクト進捗',pcCompletedProjects:'完了プロジェクト',pcOverdueProjects:'期限超過プロジェクト',pcCustomerCoverage:'顧客カバレッジ',pcCustomersWithProjects:'プロジェクトを持つ顧客',pcTaskCompletion:'タスク完了状況',pcRecentActivity:'最近の業務活動',pcNoProjects:'プロジェクトはありません',pcNoCustomers:'顧客はありません',pcNoActivity:'最近の活動はありません',pcProjectTaskSummary:'タスク完了',pcOpen:'未完了',pcCompleted:'完了',pcViewCustomer:'顧客を見る',pcViewProject:'プロジェクトを見る',pcViewTask:'タスクを見る',pcViewFollowup:'フォローを見る',  overview:'業務概要', todoCenter:'To-doセンター', todoCenterTitle:'To-doセンター', todoCenterSubtitle:'対応が必要なタスクと顧客フォローを一か所で確認', todoLoading:'To-do項目を読み込み中…', todoLoadError:'To-do項目を一時的に読み込めません', todoEmpty:'現在、対応が必要な項目はありません', todoOverdueTasks:'期限超過タスク', todoTodayTasks:'今日が期限のタスク', todoUpcomingTasks:'今後7日間のタスク', todoUndatedTasks:'期限未設定のタスク', todoPendingFollowups:'未対応フォロー', todoDueDate:'期限', todoProject:'プロジェクト', todoNextFollowup:'次回フォロー', todoFollowupOverdue:'期限超過', todoFollowupToday:'今日', todoFollowupScheduled:'予定あり', todoNoNextDate:'次回日付未設定', todoOpenRecord:'記録を開く', overviewTitle:'業務概要', overviewSubtitle:'現在の業務状況と対応が必要な項目を確認', customersTotal:'顧客総数', activeProjects:'進行中プロジェクト', unfinishedTasks:'未完了タスク', pendingFollowups:'未対応フォロー', needsAttention:'要対応', overdueTasksCount:'期限超過タスク', dueTodayCount:'今日が期限', dueNext7Count:'今後7日間が期限', overdueFollowups:'期限超過フォロー', recentProjects:'最近更新したプロジェクト', recentTasks:'最近のタスク', recentFollowups:'最近の顧客フォロー', noRecent:'記録はありません', overviewLoading:'業務データを集計中…', overviewError:'業務概要を読み込めません', incompleteData:'全データを取得できませんでした。再読み込みしてください。', openTasks:'未完了', allFollowupDates:'すべてのフォロー日', overdueOnly:'期限超過のみ', allProjectDueDates:'すべての完了予定日', relatedFollowupCount:'関連フォロー', customers:'顧客', projects:'プロジェクト管理', tasks:'プロジェクトタスク', followups:'業務フォロー', project:'プロジェクト', task:'タスク', followup:'フォロー記録', newProject:'プロジェクト追加', newTask:'タスク追加', newFollowup:'フォロー追加', searchProject:'プロジェクト名を検索', searchTask:'タスク名を検索', allTaskDueDates:'すべての期限', overdueTasks:'期限超過', dueToday:'今日が期限', dueNext7Days:'今後7日間', noDueDate:'期限なし', noMatchingTasks:'条件に一致するタスクはありません', searchFollowup:'フォロー内容を検索', allStatus:'すべての状態', customer:'顧客', chooseCustomer:'顧客を選択', status:'プロジェクト状態', planned:'予定', active:'進行中', on_hold:'保留', completed:'完了', cancelled:'中止', prospect:'見込み顧客', trade:'貿易', software:'ソフトウェア開発', ecommerce:'EC', startDate:'開始日', dueDate:'完了予定日', description:'説明', save:'保存', cancel:'キャンセル', edit:'編集', delete:'削除', noProjects:'プロジェクトはまだありません', noTasks:'このプロジェクトにはタスクがありません', noFollowups:'フォロー記録はまだありません', createProjectHint:'顧客の最初のプロジェクトを作成します。', createTaskHint:'プロジェクトを実行可能なタスクに分割します。', createFollowupHint:'電話、メール、会議の内容を記録します。', confirmDeleteProject:'このプロジェクトを削除しますか？元に戻せません。', confirmDeleteTask:'このタスクを削除しますか？元に戻せません。', confirmDeleteFollowup:'この記録を削除しますか？元に戻せません。', method:'方法', phone:'電話', email:'メール', meeting:'会議', message:'メッセージ', other:'その他', followupDate:'フォロー日時', outcome:'結果', nextDate:'次回フォロー日', notes:'メモ', linkedProject:'関連プロジェクト（任意）', noProject:'プロジェクトなし', pending:'未対応', done:'完了', next:'次へ', previous:'前へ', loading:'読み込み中…', loaded:'読み込み完了', failed:'処理に失敗しました。もう一度お試しください。', relationError:'タスクまたはフォロー記録が関連付けられています。先に関連を変更または削除してください。', required:'必須項目を入力し、顧客を選択してください。', customerMissing:'先に顧客を登録してください。', refresh:'更新', allProjects:'すべてのプロジェクト', filterProject:'プロジェクトで絞り込み', projectTitle:'プロジェクト名', followupTitle:'フォロー件名', progress:'進捗', progressPercent:'手動プロジェクト進捗（0～100%）', progressMode:'進捗の計算方法', manualProgress:'手動設定', autoProgress:'タスクから自動計算', progressAutoHint:'完了タスク数 ÷ 全タスク数 × 100%。', progressManualHint:'手動モードではタスク状態の変更で進捗は上書きされません。', viewDetails:'詳細を見る', projectDetails:'プロジェクト詳細', manageTasks:'タスク管理', taskTitle:'タスク名', taskProject:'所属プロジェクト', taskStatus:'タスク状態', taskDue:'期限', todo:'未着手', in_progress:'進行中', blocked:'ブロック中', requiredTaskProject:'所属プロジェクトを選択してください。', invalidTaskStatus:'有効なタスク状態を選択してください。', invalidProgress:'進捗は0～100の整数で入力してください。', close:'閉じる', viewCustomer:'顧客を見る', viewProject:'プロジェクトを見る', viewProjects:'プロジェクト一覧', viewFollowups:'フォローを見る', backToCustomer:'顧客に戻る', backToProject:'プロジェクトに戻る', relatedCustomer:'関連顧客', relatedProject:'関連プロジェクト', clearRelationFilter:'関連フィルターを解除', relatedTasks:'関連タスク', relatedFollowups:'フォロー記録', attachments:'添付ファイル', noRelatedRecords:'関連記録はありません', loadingRelations:'関連情報を読み込み中…', relationLoadFailed:'関連情報を一時的に読み込めません。', rateLimited:'リクエストが多すぎます。1分ほど待ってから更新してください。' }
  };
  const t = key => words[locale()][key] || words.zh[key] || key;
  function auth(){ return window.PlannerCompanyContext?.getAuth?.() || null; }
  function token(user, pass){ const bytes = new TextEncoder().encode(user + ':' + pass); let binary = ''; bytes.forEach(b => binary += String.fromCharCode(b)); return btoa(binary); }
  async function api(path, method, body) {
    const a = auth();
    if (!a) throw new Error('请先在计划工作区登录现有账号。');
    if (a.url.replace(/\/+$/, '') !== PROJECT_URL) throw new Error('公司网站只能连接慢慢计划的 Supabase 项目。');
    const headers = { apikey: a.key, Authorization: 'Basic ' + token(a.username, a.password) };
    const options = { method: method || 'GET', headers, cache: 'no-store' };
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
    const response = await fetch(a.url.replace(/\/+$/, '') + '/functions/v1/' + API + path, options);
    let payload = {}; try { payload = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(payload.error === 'RECORD_IN_USE_OR_INVALID_RELATION' ? t('relationError') : (payload.error === 'AUTHENTICATION_FAILED' ? '账号验证失败，请重新登录。' : (response.status === 429 || payload.error === 'RATE_LIMITED' ? t('rateLimited') : (payload.error === 'LIST_INCOMPLETE' ? t('incompleteData') : t('failed')))));
      error.code = payload.error; throw error;
    }
    return payload.data;
  }
  async function loadAllStatusHistory(filters = {}) {
    const all = [];
    const pageSize = 100;
    let offset = 0, expectedTotal = null;
    while (true) {
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
      if (filters.recordId) params.set('record_id', filters.recordId);
      if (filters.recordType) params.set('record_type', filters.recordType);
      const page = await api('/status-history?' + params.toString());
      const items = Array.isArray(page?.items) ? page.items : null;
      const total = Number(page?.total);
      if (!items || !Number.isInteger(total) || total < 0) throw new Error(t('incompleteData'));
      if (expectedTotal === null) expectedTotal = total;
      else if (total !== expectedTotal) throw new Error(t('incompleteData'));
      if (!items.length && offset < expectedTotal) throw new Error(t('incompleteData'));
      all.push(...items);
      offset += items.length;
      if (offset >= expectedTotal) break;
      if (items.length < pageSize) throw new Error(t('incompleteData'));
    }
    if (all.length !== expectedTotal) throw new Error(t('incompleteData'));
    return all;
  }
  async function loadAllActivityHistory(recordId) {
    const all = [];
    const pageSize = 100;
    let offset = 0, expectedTotal = null;
    while (true) {
      const params = new URLSearchParams({ record_id: recordId, limit: String(pageSize), offset: String(offset) });
      const page = await api('/activity-history?' + params.toString());
      const items = Array.isArray(page?.items) ? page.items : null;
      const total = Number(page?.total);
      if (!items || !Number.isInteger(total) || total < 0) throw new Error(t('incompleteData'));
      if (expectedTotal === null) expectedTotal = total;
      else if (total !== expectedTotal) throw new Error(t('incompleteData'));
      if (!items.length && offset < expectedTotal) throw new Error(t('incompleteData'));
      all.push(...items);
      offset += items.length;
      if (offset >= expectedTotal) break;
      if (items.length < pageSize) throw new Error(t('incompleteData'));
    }
    if (all.length !== expectedTotal) throw new Error(t('incompleteData'));
    return all;
  }
    function node(tag, cls, value) { const el = document.createElement(tag); if (cls) el.className = cls; if (value !== undefined) el.textContent = value; return el; }
  function button(label, cls, fn) { const b = node('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function selectOptions(items, selected) { return items.map(item => '<option value="' + item[0] + '"' + (item[0] === selected ? ' selected' : '') + '>' + item[1] + '</option>').join(''); }
  function dateText(value) { if (!value) return ''; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value).slice(0, 10) : d.toLocaleDateString(locale() === 'ja' ? 'ja-JP' : locale() === 'en' ? 'en-US' : 'zh-CN'); }
  function escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function install() {
    const host = root(); if (!host || $('cw-business-nav')) return;
    const shell = host.querySelector('.cw-shell');
    const nav = node('nav', 'cw-business-nav'); nav.id = 'cw-business-nav'; nav.setAttribute('aria-label', 'Company sections');
    [['overview',t('overview')],['todos',t('todoCenter')],['projectCustomerOverview',t('projectCustomerOverview')],['businessTrends',t('businessTrends')],['decisionCenter',t('decisionCenter')],['contributionAnalysis',t('contributionAnalysis')],['customerHealth',t('customerHealth')],['deliveryAnalysis',t('deliveryAnalysis')],['customers',t('customers')],['projects',t('projects')],['tasks',t('tasks')],['followups',t('followups')]].forEach(([key,label]) => {
      const b = button(label, 'cw-business-tab', () => { switchTab(key); if (key === 'customers') window.CompanyWebsite?.refresh?.(); }); b.dataset.tab = key; nav.append(b);
    });
    const customerPanel = host.querySelector('.cw-panel'); customerPanel.id = 'cw-customer-panel';
    const overview = node('section', 'cw-panel cw-overview-panel'); overview.id = 'cw-business-overview';
    overview.innerHTML = '<header class="cw-overview-heading"><div><h3 id="cw-overview-title"></h3><p id="cw-overview-subtitle"></p></div><button class="secondary" id="cw-overview-refresh" type="button"></button></header><div id="cw-overview-feedback" class="cw-feedback" role="status" aria-live="polite"></div><section class="cw-overview-kpis" id="cw-overview-kpis"></section><h3 class="cw-overview-section-title" id="cw-overview-attention-title"></h3><section class="cw-overview-attention" id="cw-overview-attention"></section><h3 class="cw-overview-section-title" id="cw-overview-recent-title"></h3><section class="cw-overview-recent" id="cw-overview-recent"></section>';
    const todos = node('section', 'cw-panel cw-todo-panel'); todos.id = 'cw-business-todos';
    todos.innerHTML = '<header class="cw-todo-heading"><div><h3 id="cw-todo-title"></h3><p id="cw-todo-subtitle"></p></div><button class="secondary" id="cw-todo-refresh" type="button"></button></header><div id="cw-todo-feedback" class="cw-feedback" role="status" aria-live="polite"></div><div id="cw-todo-sections" class="cw-todo-sections"></div>';
    const projectCustomer = node('section', 'cw-panel cw-project-customer-panel'); projectCustomer.id = 'cw-business-project-customer';
    projectCustomer.innerHTML = '<header class="cw-pc-heading"><div><h3 id="cw-pc-title"></h3><p id="cw-pc-subtitle"></p></div><button class="secondary" id="cw-pc-refresh" type="button"></button></header><div id="cw-pc-feedback" class="cw-feedback" role="status" aria-live="polite"></div><section class="cw-pc-kpis" id="cw-pc-kpis"></section><section class="cw-pc-section"><h4 id="cw-pc-status-title"></h4><div class="cw-pc-status-grid" id="cw-pc-status"></div></section><section class="cw-pc-section"><h4 id="cw-pc-progress-title"></h4><div class="cw-pc-progress-list" id="cw-pc-projects"></div></section><section class="cw-pc-section"><h4 id="cw-pc-customers-title"></h4><div class="cw-pc-customer-list" id="cw-pc-customers"></div></section><section class="cw-pc-section"><h4 id="cw-pc-activity-title"></h4><div class="cw-pc-activity-list" id="cw-pc-activity"></div></section>';
    const trends = node('section', 'cw-panel cw-business-trends-panel'); trends.id = 'cw-business-trends';
    const decision = node('section', 'cw-panel cw-decision-panel'); decision.id = 'cw-business-decision';
    const contribution = node('section', 'cw-panel cw-contribution-panel'); contribution.id = 'cw-business-contribution';
    const customerHealth = node('section', 'cw-panel cw-customer-health-panel'); customerHealth.id = 'cw-business-customer-health';
    customerHealth.innerHTML = '<header class="cw-customer-health-heading"><div><h3 id="cw-customer-health-title"></h3><p id="cw-customer-health-subtitle"></p></div><button class="secondary" id="cw-customer-health-refresh" type="button"></button></header><div id="cw-customer-health-feedback" class="cw-feedback" role="status" aria-live="polite"></div><section id="cw-customer-health-kpis" class="cw-customer-health-kpis"></section><div id="cw-customer-health-list" class="cw-customer-health-list"></div><p id="cw-customer-health-note" class="cw-decision-note"></p>';
    const delivery = node('section', 'cw-panel cw-delivery-panel'); delivery.id = 'cw-business-delivery-analysis';
    delivery.innerHTML = '<header class="cw-delivery-heading"><div><h3 id="cw-delivery-title"></h3><p id="cw-delivery-subtitle"></p></div><button class="secondary" id="cw-delivery-refresh" type="button"></button></header><div id="cw-delivery-feedback" class="cw-feedback" role="status" aria-live="polite"></div><section id="cw-delivery-kpis" class="cw-delivery-kpis"></section><div id="cw-delivery-list" class="cw-delivery-list"></div><p id="cw-delivery-note" class="cw-decision-note"></p>';
    contribution.innerHTML = '<header class="cw-contribution-heading"><div><h3 id="cw-contribution-title"></h3><p id="cw-contribution-subtitle"></p></div><button class="secondary" id="cw-contribution-refresh" type="button"></button></header><div id="cw-contribution-feedback" class="cw-feedback" role="status" aria-live="polite"></div><div class="cw-contribution-controls"><label for="cw-contribution-currency" id="cw-contribution-currency-label"></label><select id="cw-contribution-currency"><option value="JPY">JPY</option><option value="CNY">CNY</option><option value="USD">USD</option></select></div><section id="cw-contribution-summary" class="cw-contribution-summary"></section><div class="cw-contribution-columns"><section class="cw-contribution-section"><h4 id="cw-contribution-customers-title"></h4><div id="cw-contribution-customers" class="cw-contribution-list"></div></section><section class="cw-contribution-section"><h4 id="cw-contribution-projects-title"></h4><div id="cw-contribution-projects" class="cw-contribution-list"></div></section></div><section class="cw-contribution-section"><h4 id="cw-contribution-unassigned-title"></h4><div id="cw-contribution-unassigned" class="cw-contribution-unassigned"></div></section><p id="cw-contribution-note" class="cw-decision-note"></p>';
    decision.innerHTML = '<header class="cw-decision-heading"><div><h3 id="cw-decision-title"></h3><p id="cw-decision-subtitle"></p></div><button class="secondary" id="cw-decision-refresh" type="button"></button></header><div id="cw-decision-feedback" class="cw-feedback" role="status" aria-live="polite"></div><section id="cw-decision-kpis" class="cw-decision-kpis"></section><section class="cw-decision-section"><h4 id="cw-decision-finance-title"></h4><div id="cw-decision-finance" class="cw-decision-finance"></div><p id="cw-decision-finance-note" class="cw-decision-note"></p></section><section class="cw-decision-section"><h4 id="cw-decision-actions-title"></h4><div id="cw-decision-actions" class="cw-decision-actions"></div></section><section class="cw-decision-section"><h4 id="cw-decision-activity-title"></h4><div id="cw-decision-activity" class="cw-decision-activity"></div></section><section class="cw-decision-section"><h4 id="cw-decision-records-title"></h4><div id="cw-decision-records" class="cw-decision-records"></div></section>';
    trends.innerHTML = '<header class="cw-trends-heading"><div><h3 id="cw-trends-title"></h3><p id="cw-trends-subtitle"></p></div><button class="secondary" id="cw-trends-refresh" type="button"></button></header><div id="cw-trends-feedback" class="cw-feedback" role="status" aria-live="polite"></div><div class="cw-trends-controls"><div class="cw-trends-period" role="group" aria-label="Trend period"><button type="button" id="cw-trends-week" class="secondary"></button><button type="button" id="cw-trends-month" class="secondary"></button></div><p id="cw-trends-range" class="cw-trends-range"></p></div><section id="cw-trends-kpis" class="cw-trends-kpis"></section><section class="cw-trends-section"><h4 id="cw-trends-review-title"></h4><div id="cw-trends-review" class="cw-trends-review"></div></section><section class="cw-trends-section"><h4 id="cw-trends-projects-title"></h4><div id="cw-trends-projects" class="cw-trends-chart"></div></section><section class="cw-trends-section"><h4 id="cw-trends-tasks-title"></h4><div id="cw-trends-tasks" class="cw-trends-chart"></div></section><section class="cw-trends-section"><h4 id="cw-trends-followups-title"></h4><div id="cw-trends-followups" class="cw-trends-chart"></div></section><p id="cw-trends-note" class="cw-trends-note"></p>';
    const business = node('section', 'cw-panel cw-business-panel'); business.id = 'cw-business-panel';
    business.innerHTML = '<div class="cw-business-toolbar"><form id="cw-business-search" class="cw-search"><label class="sr-only" for="cw-business-query"></label><input id="cw-business-query" type="search" maxlength="100"><button class="secondary" type="submit">搜索</button></form><select id="cw-business-status" aria-label="' + escape(t('allStatus')) + '"></select><select id="cw-business-project-filter" aria-label="' + escape(t('taskProject')) + '" hidden></select><select id="cw-business-due-filter" aria-label="' + escape(t('taskDue')) + '" hidden></select><select id="cw-business-followup-due-filter" aria-label="' + escape(t('nextDate')) + '" hidden></select><button class="primary" id="cw-business-new" type="button"></button><button class="secondary" id="cw-business-refresh" type="button">' + escape(t('refresh')) + '</button></div><div id="cw-business-relation-context" class="cw-relation-context" hidden></div><div class="cw-feedback" id="cw-business-feedback" role="status" aria-live="polite"></div><div class="cw-business-list" id="cw-business-list"></div><nav class="cw-pagination" id="cw-business-pagination"></nav>';
    shell.insertBefore(nav, customerPanel); shell.insertBefore(overview, customerPanel); shell.insertBefore(todos, customerPanel); shell.insertBefore(projectCustomer, customerPanel); shell.insertBefore(trends, customerPanel); shell.insertBefore(decision, customerPanel); shell.insertBefore(contribution, customerPanel); shell.insertBefore(customerHealth, customerPanel); shell.insertBefore(delivery, customerPanel); customerPanel.insertAdjacentElement('afterend', business);
    $('cw-overview-title').textContent = t('overviewTitle'); $('cw-overview-subtitle').textContent = t('overviewSubtitle'); $('cw-overview-refresh').textContent = t('refresh'); $('cw-overview-attention-title').textContent = t('needsAttention'); $('cw-overview-recent-title').textContent = t('recentProjects') + ' · ' + t('recentTasks') + ' · ' + t('recentFollowups');
    $('cw-overview-refresh').addEventListener('click', () => loadOverview(0));
    $('cw-todo-title').textContent=t('todoCenterTitle'); $('cw-todo-subtitle').textContent=t('todoCenterSubtitle'); $('cw-todo-refresh').textContent=t('refresh'); $('cw-todo-refresh').addEventListener('click',()=>loadTodoCenter(0));
    updateProjectCustomerLabels(); $('cw-pc-refresh').addEventListener('click', () => loadProjectCustomerOverview(0));
    updateBusinessTrendLabels(); $('cw-trends-refresh').addEventListener('click', () => loadBusinessTrends(0));
    updateDecisionLabels(); $('cw-decision-refresh').addEventListener('click', () => loadBusinessDecisionCenter(0));
    updateContributionLabels(); $('cw-contribution-refresh').addEventListener('click', () => loadBusinessContributionAnalysis(0));
    updateCustomerHealthLabels(); $('cw-customer-health-refresh').addEventListener('click', () => loadCustomerRelationshipHealth(0));
    updateProjectDeliveryLabels(); $('cw-delivery-refresh').addEventListener('click', () => loadProjectDeliveryAnalysis(0));
    $('cw-contribution-currency').value = state.contributionCurrency;
    $('cw-contribution-currency').addEventListener('change', event => { state.contributionCurrency = event.target.value; if (state.contributionData) renderBusinessContributionAnalysis(state.contributionData); });
    $('cw-trends-week').addEventListener('click', () => setBusinessTrendPeriod('week'));
    $('cw-trends-month').addEventListener('click', () => setBusinessTrendPeriod('month'));
    const dialog = document.createElement('dialog'); dialog.className = 'cw-dialog'; dialog.id = 'cw-business-editor';
    dialog.innerHTML = '<form id="cw-business-form" class="cw-editor-form"><div class="cw-dialog-head"><div><p class="cw-eyebrow">BUSINESS RECORD</p><h2 id="cw-business-editor-title"></h2></div><button class="close-btn" id="cw-business-close" type="button" aria-label="Close">×</button></div><div id="cw-business-fields" class="cw-form-grid"></div><p class="cw-form-error" id="cw-business-error" role="alert"></p><div class="cw-dialog-actions"><button class="secondary" id="cw-business-cancel" type="button">' + escape(t('cancel')) + '</button><button class="primary" type="submit">' + escape(t('save')) + '</button></div></form>';
    host.append(dialog);
    const details = document.createElement('dialog'); details.className = 'cw-dialog cw-project-details-dialog'; details.id = 'cw-project-details';
    details.innerHTML = '<div class="cw-editor-form"><div class="cw-dialog-head"><div><p class="cw-eyebrow">PROJECT DETAILS</p><h2 id="cw-project-details-title"></h2></div><button class="close-btn" id="cw-project-details-close" type="button" aria-label="Close">×</button></div><div class="cw-project-detail-progress"><div class="cw-project-progress-label"><span id="cw-project-details-progress-label"></span><strong id="cw-project-details-progress-value"></strong></div><div class="cw-project-progress-track"><div class="cw-project-progress-fill" id="cw-project-details-progress-fill"></div></div></div><dl class="cw-project-detail-grid"><div><dt id="cw-project-details-customer-label"></dt><dd id="cw-project-details-customer"></dd></div><div><dt id="cw-project-details-status-label"></dt><dd id="cw-project-details-status"></dd></div><div><dt id="cw-project-details-start-label"></dt><dd id="cw-project-details-start"></dd></div><div><dt id="cw-project-details-due-label"></dt><dd id="cw-project-details-due"></dd></div><div class="cw-project-detail-description"><dt id="cw-project-details-description-label"></dt><dd id="cw-project-details-description"></dd></div></dl><div class="cw-project-related-grid"><section class="cw-project-related"><h3 id="cw-project-related-tasks-title"></h3><div id="cw-project-related-tasks" class="cw-related-list"></div></section><section class="cw-project-related"><h3 id="cw-project-related-followups-title"></h3><div id="cw-project-related-followups" class="cw-related-list"></div></section></div><div class="cw-dialog-actions"><button class="secondary" id="cw-project-details-customer-action" type="button"></button><button class="secondary" id="cw-project-details-tasks" type="button"></button><button class="secondary" id="cw-project-details-followups" type="button"></button><button class="secondary" id="cw-project-details-edit" type="button"></button><button class="primary" id="cw-project-details-close-action" type="button"></button></div></div>';
    host.append(details);
    const historyDialog = document.createElement('dialog'); historyDialog.className = 'cw-dialog cw-status-history-dialog'; historyDialog.id = 'cw-status-history-dialog';
    historyDialog.innerHTML = '<div class="cw-editor-form"><div class="cw-dialog-head"><div><p class="cw-eyebrow">BUSINESS HISTORY</p><h2 id="cw-status-history-title"></h2></div><button class="close-btn" id="cw-status-history-close" type="button" aria-label="Close">×</button></div><p id="cw-status-history-feedback" class="cw-feedback" role="status" aria-live="polite"></p><ol id="cw-status-history-list" class="cw-status-history-list"></ol><p id="cw-status-history-note" class="cw-form-hint"></p><div class="cw-dialog-actions"><button class="primary" id="cw-status-history-done" type="button"></button></div></div>';
    host.append(historyDialog);
    $('cw-status-history-close').addEventListener('click', () => historyDialog.close());
    $('cw-status-history-done').textContent = t('close');
    $('cw-status-history-done').addEventListener('click', () => historyDialog.close());
    $('cw-status-history-note').textContent = t('activityHistoryNote');

    $('cw-project-details-close').addEventListener('click', () => details.close());
    $('cw-project-related-tasks-title').textContent = t('relatedTasks');
    $('cw-project-related-followups-title').textContent = t('relatedFollowups');
    $('cw-project-details-close-action').addEventListener('click', () => details.close());
    $('cw-project-details-customer-action').addEventListener('click', () => { const record = state.projects.find(p => p.id === details.dataset.projectId); const customerId = record?.parent_record_id; details.close(); if (customerId) openCustomer(customerId); });
    $('cw-project-details-followups').addEventListener('click', () => { const projectId = details.dataset.projectId; details.close(); state.followupProjectFilter = projectId || ''; state.followupCustomerFilter = ''; switchTab('followups'); });
    $('cw-project-details-tasks').addEventListener('click', () => { const projectId = details.dataset.projectId; details.close(); state.taskProjectFilter = projectId || ''; switchTab('tasks'); });
    $('cw-project-details-edit').addEventListener('click', () => { const record = state.projects.find(p => p.id === details.dataset.projectId); details.close(); if (record) openEditor(record); });
    details.addEventListener('click', e => { if (e.target === details) details.close(); });
    $('cw-business-search').addEventListener('submit', e => { e.preventDefault(); const q = $('cw-business-query').value.trim(); if (state.tab === 'projects') state.projectQuery = q; else if (state.tab === 'tasks') state.taskQuery = q; else state.followupQuery = q; setOffset(0); loadActive(); });
    $('cw-business-status').addEventListener('change', () => { if (state.tab === 'projects') state.projectStatus = $('cw-business-status').value; else if (state.tab === 'tasks') state.taskStatus = $('cw-business-status').value; else state.followupStatus = $('cw-business-status').value; setOffset(0); loadActive(); });
    $('cw-business-project-filter').addEventListener('change', () => { if (state.tab === 'tasks') { state.taskProjectFilter = $('cw-business-project-filter').value; state.taskOffset = 0; } else { state.followupProjectFilter = $('cw-business-project-filter').value; state.followupCustomerFilter = ''; state.followupOffset = 0; } renderRelationContext(); loadActive(); });
    $('cw-business-due-filter').addEventListener('change', () => { state.taskDueFilter = $('cw-business-due-filter').value; state.taskOffset = 0; loadActive(); });
    // V10.58: the same date select serves follow-ups (overdue next follow-up) and projects (overdue target date).
    $('cw-business-followup-due-filter').addEventListener('change', () => { const value = $('cw-business-followup-due-filter').value; if (state.tab === 'projects') { state.projectDueFilter = value; state.projectOffset = 0; } else { state.followupDueFilter = value; state.followupOffset = 0; } loadActive(); });
    $('cw-business-new').addEventListener('click', () => openEditor());
    $('cw-business-refresh').addEventListener('click', () => loadActive({ force:true }));
    $('cw-business-form').addEventListener('submit', saveEditor);
    $('cw-business-close').addEventListener('click', closeEditor); $('cw-business-cancel').addEventListener('click', closeEditor);
    dialog.addEventListener('click', e => { if (e.target === dialog) closeEditor(); });
    window.addEventListener('planner-language-change', () => { $('cw-business-nav').querySelectorAll('button:not([data-company-extension])').forEach(b => { const labels={overview:'overview',todos:'todoCenter',projectCustomerOverview:'projectCustomerOverview',businessTrends:'businessTrends',decisionCenter:'decisionCenter',contributionAnalysis:'contributionAnalysis',customerHealth:'customerHealth',deliveryAnalysis:'deliveryAnalysis',customers:'customers',projects:'projects',tasks:'tasks',followups:'followups'}; b.textContent=t(labels[b.dataset.tab]||b.dataset.tab); }); if (state.tab === 'projectCustomerOverview') { updateProjectCustomerLabels(); loadProjectCustomerOverview(LOOKUP_MAX_AGE_MS); } else if (state.tab === 'businessTrends') { updateBusinessTrendLabels(); if(state.trendData) renderBusinessTrends(state.trendData); } else if (state.tab === 'decisionCenter') { updateDecisionLabels(); if(state.decisionData)renderBusinessDecisionCenter(state.decisionData); loadBusinessDecisionCenter(LOOKUP_MAX_AGE_MS); } else if (state.tab === 'contributionAnalysis') { updateContributionLabels(); if(state.contributionData)renderBusinessContributionAnalysis(state.contributionData); loadBusinessContributionAnalysis(LOOKUP_MAX_AGE_MS); } else if (state.tab === 'customerHealth') { updateCustomerHealthLabels(); if(state.customerHealthData)renderCustomerRelationshipHealth(state.customerHealthData); loadCustomerRelationshipHealth(LOOKUP_MAX_AGE_MS); } else if (state.tab === 'deliveryAnalysis') { updateProjectDeliveryLabels(); if(state.deliveryData)renderProjectDeliveryAnalysis(state.deliveryData); loadProjectDeliveryAnalysis(LOOKUP_MAX_AGE_MS); } else if (state.tab === 'overview') { $('cw-overview-title').textContent=t('overviewTitle'); $('cw-overview-subtitle').textContent=t('overviewSubtitle'); $('cw-overview-refresh').textContent=t('refresh'); $('cw-overview-attention-title').textContent=t('needsAttention'); $('cw-overview-recent-title').textContent=t('recentProjects')+' · '+t('recentTasks')+' · '+t('recentFollowups'); loadOverview(LOOKUP_MAX_AGE_MS); } else if (state.tab !== 'customers') { updateToolbar(); loadActive(); } });
  }
  function switchTab(tab) {
    state.tab = tab;
    $('cw-customer-panel').hidden = tab !== 'customers';
    $('cw-business-panel').hidden = !['projects','tasks','followups'].includes(tab);
    $('cw-business-overview').hidden = tab !== 'overview';
    $('cw-business-todos').hidden = tab !== 'todos';
    $('cw-business-project-customer').hidden = tab !== 'projectCustomerOverview';
    $('cw-business-trends').hidden = tab !== 'businessTrends';
    $('cw-business-decision').hidden = tab !== 'decisionCenter';
    $('cw-business-contribution').hidden = tab !== 'contributionAnalysis';
    $('cw-business-customer-health').hidden = tab !== 'customerHealth';
    $('cw-business-delivery-analysis').hidden = tab !== 'deliveryAnalysis';
    $('cw-business-nav').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
    // V10.56: extension panels (transactions / documents) own their own loading.
    window.dispatchEvent(new CustomEvent('company-business-tab-change', { detail: { tab } }));
    if (document.querySelector('[data-company-extension][data-tab="' + tab + '"]')) return;
    if (tab === 'overview') loadOverview();
    else if (tab === 'todos') loadTodoCenter();
    else if (tab === 'projectCustomerOverview') loadProjectCustomerOverview();
    else if (tab === 'businessTrends') loadBusinessTrends();
    else if (tab === 'decisionCenter') loadBusinessDecisionCenter();
    else if (tab === 'contributionAnalysis') loadBusinessContributionAnalysis();
    else if (tab === 'customerHealth') loadCustomerRelationshipHealth();
    else if (tab === 'deliveryAnalysis') loadProjectDeliveryAnalysis();
    else if (tab !== 'customers') { updateToolbar(); loadActive({ entry:true }); }
  }
  function setOffset(value) { if (state.tab === 'projects') state.projectOffset = value; else if (state.tab === 'tasks') state.taskOffset = value; else state.followupOffset = value; }
  function updateToolbar() {
    const project = state.tab === 'projects', task = state.tab === 'tasks', followup = state.tab === 'followups';
    $('cw-business-query').placeholder = t(project ? 'searchProject' : task ? 'searchTask' : 'searchFollowup');
    $('cw-business-query').value = project ? state.projectQuery : task ? state.taskQuery : state.followupQuery;
    $('cw-business-search').querySelector('button').textContent = locale() === 'en' ? 'Search' : locale() === 'ja' ? '検索' : '搜索';
    $('cw-business-new').textContent = '＋ ' + t(project ? 'newProject' : task ? 'newTask' : 'newFollowup');
    const status = $('cw-business-status'), current = project ? state.projectStatus : task ? state.taskStatus : state.followupStatus;
    const choices = project ? [['',t('allStatus')],['planned',t('planned')],['active',t('active')],['on_hold',t('on_hold')],['completed',t('completed')],['cancelled',t('cancelled')]] : task ? [['',t('allStatus')],['__open__',t('openTasks')],['todo',t('todo')],['in_progress',t('in_progress')],['blocked',t('blocked')],['completed',t('done')]] : [['',t('allStatus')],['pending',t('pending')],['completed',t('done')]];
    status.innerHTML = selectOptions(choices, current);
    const projectFilter = $('cw-business-project-filter'); projectFilter.hidden = !(task || followup);
    if (task || followup) projectFilter.innerHTML = selectOptions([['',t('allProjects')],...state.projects.map(p=>[p.id,p.title])],task ? state.taskProjectFilter : state.followupProjectFilter);
    const dueFilter = $('cw-business-due-filter'); dueFilter.hidden = !task;
    if (task) dueFilter.innerHTML = selectOptions([['',t('allTaskDueDates')],['overdue',t('overdueTasks')],['today',t('dueToday')],['next7',t('dueNext7Days')],['none',t('noDueDate')]],state.taskDueFilter);
    const followupDueFilter = $('cw-business-followup-due-filter'); followupDueFilter.hidden = !(followup || project);
    if (followup) { followupDueFilter.innerHTML = selectOptions([['',t('allFollowupDates')],['overdue',t('overdueOnly')]],state.followupDueFilter); followupDueFilter.setAttribute('aria-label', t('nextDate')); }
    else if (project) { followupDueFilter.innerHTML = selectOptions([['',t('allProjectDueDates')],['overdue',t('overdueOnly')]],state.projectDueFilter); followupDueFilter.setAttribute('aria-label', t('dueDate')); }
    renderRelationContext();
  }
  function renderRelationContext() {
    const host = $('cw-business-relation-context');
    if (!host) return;
    host.replaceChildren();
    let label = '';
    if (state.tab === 'projects' && state.projectCustomerFilter) {
      label = t('relatedCustomer') + ': ' + customerName(state.projectCustomerFilter);
    } else if (state.tab === 'tasks' && state.taskProjectFilter) {
      label = t('relatedProject') + ': ' + projectName(state.taskProjectFilter);
    } else if (state.tab === 'followups' && state.followupCustomerFilter) {
      label = t('relatedCustomer') + ': ' + customerName(state.followupCustomerFilter);
    } else if (state.tab === 'followups' && state.followupProjectFilter) {
      label = t('relatedProject') + ': ' + projectName(state.followupProjectFilter);
    }
    if (!label) { host.hidden = true; return; }
    host.hidden = false;
    host.append(node('span', 'cw-relation-context-label', label));
    host.append(button(t('clearRelationFilter'), 'secondary cw-clear-relation-filter', () => {
      if (state.tab === 'projects') state.projectCustomerFilter = '';
      else if (state.tab === 'tasks') state.taskProjectFilter = '';
      else { state.followupCustomerFilter = ''; state.followupProjectFilter = ''; }
      setOffset(0);
      updateToolbar();
      renderRelationContext();
      loadActive();
    }));
  }

  const recordCache = createRecordCache({ request: path => api(path) });
  // Complete, verified list of one record type (optionally narrowed by the API's q/status).
  // Never returns partial data: incomplete pagination raises an error instead.
  async function loadRecords(type, maxAgeMs = LOOKUP_MAX_AGE_MS, filters = {}) {
    const params = new URLSearchParams({ record_type:type });
    if (filters.q) params.set('q', filters.q);
    if (filters.status) params.set('status', filters.status);
    const label = RECORD_LABELS[type] || type;
    try {
      return await recordCache.load('/records?' + params.toString(), { label, maxAgeMs: typeof maxAgeMs === 'number' ? maxAgeMs : ENTRY_MAX_AGE_MS });
    } catch (error) {
      if (error?.code !== 'INCOMPLETE_DATA') throw error;
      const wrapped = new Error(t('incompleteData') + ' (' + label + ')'); wrapped.code = error.code; throw wrapped;
    }
  }
  async function loadCustomerList(maxAgeMs = LOOKUP_MAX_AGE_MS) {
    try {
      return await recordCache.load('/customers', { label:'customers', maxAgeMs: typeof maxAgeMs === 'number' ? maxAgeMs : ENTRY_MAX_AGE_MS });
    } catch (error) {
      if (error?.code !== 'INCOMPLETE_DATA') throw error;
      const wrapped = new Error(t('incompleteData') + ' (customers)'); wrapped.code = error.code; throw wrapped;
    }
  }
  function loadBusinessRecords(types, maxAgeMs) { return Promise.all(types.map(type => loadRecords(type, maxAgeMs))); }
  function rememberRelationshipRecords(projects, tasks, followups) { state.relationshipRecords = { projects, tasks, followups }; }
  function recordTimestamp(record) {
    const timestamp = Date.parse(record?.updated_at || record?.created_at || record?.record_date || '');
    return Number.isFinite(timestamp) ? timestamp : 0;
  }
  function renderOverviewList(host, records, tab, emptyLabel) {
    host.replaceChildren();
    if (!records.length) { host.append(node('p','cw-overview-empty',emptyLabel)); return; }
    records.slice(0,3).forEach(record => {
      const item = button('', 'cw-overview-record', () => {
        if (tab === 'projects') openProjectById(record.id);
        else openRelatedRecord(tab, record);
      });
      item.append(node('strong','',record.title || '—'));
      const meta = tab === 'projects'
        ? ((t(record.status) || record.status || '—') + (record.data?.progress_percent !== undefined ? ' · ' + record.data.progress_percent + '%' : ''))
        : tab === 'tasks'
          ? ((t(record.status) || record.status || '—') + (record.due_date ? ' · ' + dateText(record.due_date) : ''))
          : ((record.record_date ? dateText(record.record_date) + ' · ' : '') + (t(record.status) || record.status || '—'));
      item.append(node('span','cw-overview-record-meta',meta)); host.append(item);
    });
  }
  function renderOverview(data) {
    const kpis=$('cw-overview-kpis'),attention=$('cw-overview-attention'),recent=$('cw-overview-recent');
    kpis.replaceChildren();attention.replaceChildren();recent.replaceChildren();
    const today=getLocalDateKey(),metrics=getBusinessOverviewMetrics(data,today);
    const cards=[
      ['customersTotal',metrics.customers,()=>{switchTab('customers');window.CompanyWebsite?.showAllCustomers?.();}],
      ['activeProjects',metrics.activeProjects,()=>{state.projectQuery='';state.projectDueFilter='';state.projectCustomerFilter='';state.projectStatus='active';state.projectOffset=0;switchTab('projects');}],
      ['unfinishedTasks',metrics.unfinishedTasks,()=>{state.taskQuery='';state.taskProjectFilter='';state.taskStatus='__open__';state.taskDueFilter='';state.taskOffset=0;switchTab('tasks');}],
      ['pendingFollowups',metrics.pendingFollowups,()=>{state.followupQuery='';state.followupCustomerFilter='';state.followupProjectFilter='';state.followupStatus='pending';state.followupDueFilter='';state.followupOffset=0;switchTab('followups');}]
    ];
    cards.forEach(([key,value,action])=>{const card=button('', 'cw-overview-kpi',action);card.append(node('span','',t(key)),node('strong','',String(value)));kpis.append(card);});
    const alerts=[
      ['overdueTasksCount',metrics.overdueTasks,()=>{state.taskQuery='';state.taskProjectFilter='';state.taskStatus='';state.taskDueFilter='overdue';state.taskOffset=0;switchTab('tasks');}],
      ['dueTodayCount',metrics.dueTodayTasks,()=>{state.taskQuery='';state.taskProjectFilter='';state.taskStatus='__open__';state.taskDueFilter='today';state.taskOffset=0;switchTab('tasks');}],
      ['dueNext7Count',metrics.next7Tasks,()=>{state.taskQuery='';state.taskProjectFilter='';state.taskStatus='__open__';state.taskDueFilter='next7';state.taskOffset=0;switchTab('tasks');}],
      ['overdueFollowups',metrics.overdueFollowups,()=>{state.followupQuery='';state.followupCustomerFilter='';state.followupProjectFilter='';state.followupStatus='pending';state.followupDueFilter='overdue';state.followupOffset=0;switchTab('followups');}]
    ];
    alerts.forEach(([key,value,action])=>{const card=button('', 'cw-overview-alert',action);card.append(node('span','',t(key)),node('strong','',String(value)));attention.append(card);});
    [['projects',t('recentProjects'),data.projects],['tasks',t('recentTasks'),data.tasks],['followups',t('recentFollowups'),data.followups]].forEach(([tab,label,records])=>{
      const section=node('section','cw-overview-recent-group');section.append(node('h4','',label));
      renderOverviewList(section,getRecentBusinessRecords(records,3),tab,t('noRecent'));recent.append(section);
    });
  }
  function renderTodoCenter(tasks, followups) {
    const host=$('cw-todo-sections');host.replaceChildren();
    const today=getLocalDateKey(),sections=getTodoCenterSections(tasks,followups,today);
    if(!sections.some(section=>section.records.length)){host.append(node('p','cw-todo-empty',t('todoEmpty')));return;}
    sections.forEach(section=>{
      const group=node('section','cw-todo-group'),heading=node('header','cw-todo-group-heading');
      heading.append(node('h4','',t(section.key)),node('span','cw-todo-count',String(section.records.length)));
      group.append(heading);
      if(!section.records.length){group.append(node('p','cw-todo-group-empty',t('noRecent')));host.append(group);return;}
      const list=node('div','cw-todo-list');
      section.records.forEach(record=>{
        const isTask=section.type==='tasks',data=record.data&&typeof record.data==='object'?record.data:{};
        const item=button('','cw-todo-item',()=>openRelatedRecord(section.type,record));
        const main=node('span','cw-todo-item-main');
        main.append(node('strong','',record.title||'—'));
        const meta=node('span','cw-todo-item-meta');
        if(isTask){
          meta.textContent=t('todoProject')+': '+projectName(record.parent_record_id)+' · '+t('taskStatus')+': '+(t(record.status)||record.status||'—');
          if(record.due_date)meta.textContent+=' · '+t('todoDueDate')+': '+dateText(record.due_date);
        }else{
          const customerId=data.customer_id||(record.related_record_ids||[]).find(id=>state.customers.some(c=>c.id===id))||(state.customers.some(c=>c.id===record.parent_record_id)?record.parent_record_id:'');
          const projectLabel=data.project_title||(data.project_id?projectName(data.project_id):'');
          const nextDate=data.next_follow_up_date;
          meta.textContent=(customerId?customerName(customerId)+' · ':'')+(projectLabel?projectLabel+' · ':'')+t('todoNextFollowup')+': '+(nextDate?dateText(nextDate):t('todoNoNextDate'));
          item.append(node('span','cw-todo-status',t(getTodoFollowupDateState(record,today))));
        }
        main.append(meta);item.append(main,node('span','cw-todo-open',t('todoOpenRecord')));list.append(item);
      });
      group.append(list);host.append(group);
    });
  }
  async function loadTodoCenter(maxAgeMs=ENTRY_MAX_AGE_MS){
    if(state.todoBusy)return;
    state.todoBusy=true;const feedback=$('cw-todo-feedback');feedback.classList.remove('error');feedback.textContent=t('todoLoading');
    try{
      const [tasks,followups,projects,customers]=await loadBusinessRecords(['task','follow_up','project','customer'],maxAgeMs);
      state.tasks=tasks;state.followups=followups;state.projects=projects;state.customers=customers;
      rememberRelationshipRecords(projects,tasks,followups);
      renderTodoCenter(tasks,followups);feedback.textContent='';
    }catch(error){
      $('cw-todo-sections').replaceChildren();feedback.classList.add('error');feedback.textContent=error.message||t('todoLoadError');
    }finally{state.todoBusy=false;}
  }
  async function refreshCurrentTab(){
    if(state.tab==='overview')return loadOverview();
    if(state.tab==='todos')return loadTodoCenter();
    if(state.tab==='projectCustomerOverview')return loadProjectCustomerOverview();
    if(state.tab==='businessTrends')return loadBusinessTrends();
    if(state.tab==='decisionCenter')return loadBusinessDecisionCenter();
    if(state.tab==='contributionAnalysis')return loadBusinessContributionAnalysis();
    if(state.tab==='customerHealth')return loadCustomerRelationshipHealth();
    if(state.tab==='deliveryAnalysis')return loadProjectDeliveryAnalysis();
    if(document.querySelector('[data-company-extension][data-tab="'+state.tab+'"]'))return window.CompanyRecords?.reload?.();
    if(state.tab!=='customers')return loadActive();
  }

  function updateBusinessTrendLabels() {
    $('cw-trends-title').textContent=t('trendsTitle');
    $('cw-trends-subtitle').textContent=t('trendsSubtitle');
    $('cw-trends-refresh').textContent=t('refresh');
    $('cw-trends-week').textContent=t('trendsWeek');
    $('cw-trends-month').textContent=t('trendsMonth');
    $('cw-trends-week').setAttribute('aria-pressed',String(state.trendPeriod==='week'));
    $('cw-trends-month').setAttribute('aria-pressed',String(state.trendPeriod==='month'));
    $('cw-trends-review-title').textContent=t('trendsReview');
    $('cw-trends-projects-title').textContent=t('trendsProjects');
    $('cw-trends-tasks-title').textContent=t('trendsTasks');
    $('cw-trends-followups-title').textContent=t('trendsFollowups');
    $('cw-trends-note').textContent=t('trendsNote');
  }
  function setBusinessTrendPeriod(period) {
    state.trendPeriod=period==='week'?'week':'month';
    updateBusinessTrendLabels();
    if(state.trendData)renderBusinessTrends(state.trendData);
  }
  function trendMetricLabel(key) {
    const labels={projectsCreated:t('trendsProjects')+' · '+t('trendsCreated'),projectsCompleted:t('trendsProjects')+' · '+t('trendsCompleted'),tasksCreated:t('trendsTasks')+' · '+t('trendsCreated'),tasksCompleted:t('trendsTasks')+' · '+t('trendsCompleted'),followups:t('trendsRecorded')};
    return labels[key]||key;
  }
  function trendDeltaText(value) {
    if(value===0)return t('trendsNoChange');
    return (value>0?'+':'')+String(value)+' · '+t(value>0?'trendsIncrease':'trendsDecrease');
  }
  function renderTrendChart(host, periods, keys) {
    host.replaceChildren();
    const maxValue=Math.max(1,...periods.flatMap(period=>keys.map(item=>period[item.key]||0)));
    periods.forEach(period=>{
      const row=node('div','cw-trends-row');
      const heading=node('div','cw-trends-row-heading');
      heading.append(node('strong','',period.label));
      const values=keys.map(item=>item.label+' '+(period[item.key]||0)).join(' · ');
      heading.append(node('span','',values));row.append(heading);
      keys.forEach(item=>{
        const line=node('div','cw-trends-bar-line');
        line.append(node('span','cw-trends-bar-label',item.label),node('span','cw-trends-bar-value',String(period[item.key]||0)));
        const track=node('span','cw-trends-bar-track');
        const fill=node('span','cw-trends-bar-fill '+item.className);
        fill.style.width=((period[item.key]||0)/maxValue*100)+'%';
        track.append(fill);line.append(track);row.append(line);
      });
      host.append(row);
    });
  }
  function renderBusinessTrends(data) {
    const report=getBusinessTrendReport(data,state.trendPeriod,getLocalDateKey());
    const labels={projectsCreated:t('trendsCreated'),projectsCompleted:t('trendsCompleted'),tasksCreated:t('trendsCreated'),tasksCompleted:t('trendsCompleted'),followups:t('trendsRecorded')};
    const kpis=$('cw-trends-kpis');kpis.replaceChildren();
    report.metrics.forEach(metric=>{
      const card=node('article','cw-trends-kpi');
      card.append(node('span','',trendMetricLabel(metric.key)),node('strong','',String(metric.current)),node('small','',t('trendsVsPrevious')+': '+trendDeltaText(metric.change)));
      kpis.append(card);
    });
    const current=report.currentPeriod;
    $('cw-trends-range').textContent=t('trendsCurrent')+': '+dateText(current.start)+' – '+dateText(current.end);
    const review=$('cw-trends-review');review.replaceChildren();
    report.metrics.forEach(metric=>{
      const line=node('p','cw-trends-review-line');
      line.append(node('strong','',trendMetricLabel(metric.key)),node('span','',trendDeltaText(metric.change)));
      review.append(line);
    });
    renderTrendChart($('cw-trends-projects'),report.periods,[
      {key:'projectsCreated',label:labels.projectsCreated,className:'created'},
      {key:'projectsCompleted',label:labels.projectsCompleted,className:'completed'}
    ]);
    renderTrendChart($('cw-trends-tasks'),report.periods,[
      {key:'tasksCreated',label:labels.tasksCreated,className:'created'},
      {key:'tasksCompleted',label:labels.tasksCompleted,className:'completed'}
    ]);
    renderTrendChart($('cw-trends-followups'),report.periods,[
      {key:'followups',label:labels.followups,className:'followups'}
    ]);
    updateBusinessTrendLabels();
  }
  async function loadRecentActivityHistory(recordId) {
    const params = new URLSearchParams({ record_id: recordId, limit: '20', offset: '0' });
    try {
      const page = await api('/activity-history?' + params.toString());
      if (!Array.isArray(page?.items)) throw new Error(t('incompleteData'));
      return page.items;
    } catch (error) {
      if (error?.code === 'RECORD_NOT_FOUND') return [];
      throw error;
    }
  }

  function updateDecisionLabels() {
    $('cw-decision-title').textContent = t('decisionTitle');
    $('cw-decision-subtitle').textContent = t('decisionSubtitle');
    $('cw-decision-refresh').textContent = t('decisionRefresh');
    $('cw-decision-finance-title').textContent = t('decisionFinanceTitle');
    $('cw-decision-finance-note').textContent = t('decisionFinanceNote');
    $('cw-decision-actions-title').textContent = t('decisionActionsTitle');
    $('cw-decision-activity-title').textContent = t('decisionActivityTitle');
    $('cw-decision-records-title').textContent = t('decisionRecordsTitle');
  }

  function openDecisionRecord(type, record) {
    if (!record?.id) return;
    if (type === 'customer') openCustomer(record.id);
    else if (type === 'project') openProjectById(record.id);
    else if (type === 'task') openRelatedRecord('tasks', record);
    else if (type === 'follow_up') openRelatedRecord('followups', record);
  }

  function renderBusinessDecisionCenter(report) {
    updateDecisionLabels();
    const metrics = report.metrics;
    const kpis = $('cw-decision-kpis'); kpis.replaceChildren();
    [
      ['decisionCustomers', metrics.customers],
      ['decisionActiveProjects', metrics.activeProjects],
      ['decisionOpenTasks', metrics.openTasks],
      ['decisionPendingFollowups', metrics.pendingFollowups],
      ['decisionTransactions', metrics.transactions]
    ].forEach(([label, value]) => {
      const card = node('article', 'cw-decision-kpi');
      card.append(node('small', '', t(label)), node('strong', '', String(value)));
      kpis.append(card);
    });

    const finance = $('cw-decision-finance'); finance.replaceChildren();
    ['JPY', 'CNY', 'USD'].forEach(currency => {
      const totals = report.finance[currency];
      const card = node('article', 'cw-decision-currency');
      card.append(node('h5', '', currency));
      const rows = [
        [t('decisionIncome'), formatAmountMicros(totals.income, currency), 'income'],
        [t('decisionExpense'), formatAmountMicros(totals.expense, currency), 'expense'],
        [t('decisionNet'), formatAmountMicros(totals.net, currency), totals.net < 0n ? 'expense' : 'income'],
        [t('decisionPlanned'), formatAmountMicros(totals.plannedIncome, currency) + ' / ' + formatAmountMicros(totals.plannedExpense, currency), '']
      ];
      rows.forEach(([label, value, kind]) => {
        const row = node('div', 'cw-decision-finance-row');
        row.append(node('span', '', label), node('strong', kind ? 'cw-amount-' + kind : '', value));
        card.append(row);
      });
      finance.append(card);
    });

    const actions = $('cw-decision-actions'); actions.replaceChildren();
    if (!report.recommendations.length) actions.append(node('p', 'cw-decision-empty', t('decisionNoActions')));
    report.recommendations.forEach(item => {
      const card = node('article', 'cw-decision-action cw-decision-priority-' + item.priority);
      const head = node('div', 'cw-decision-action-head');
      head.append(node('strong', '', t('decision' + item.key[0].toUpperCase() + item.key.slice(1))), node('span', 'cw-decision-priority', t('decision' + item.priority[0].toUpperCase() + item.priority.slice(1))));
      card.append(head, node('p', 'cw-decision-action-count', String(item.count)));
      item.records.slice(0, 3).forEach(record => {
        const row = button(record.title || '—', 'cw-decision-action-record', () => openDecisionRecord(item.type === 'projects' ? 'project' : item.type === 'tasks' ? 'task' : 'follow_up', record));
        if (record.due_date) row.append(node('small', '', t('dueDate') + ': ' + dateText(record.due_date)));
        card.append(row);
      });
      actions.append(card);
    });

    const activity = $('cw-decision-activity'); activity.replaceChildren();
    if (!report.recentActivity.length) activity.append(node('p', 'cw-decision-empty', t('decisionNoActivity')));
    report.recentActivity.forEach(event => {
      const row = node('article', 'cw-decision-activity-item');
      const typeLabel = t(event.record_type === 'customer' ? 'customer' : event.record_type === 'project' ? 'project' : event.record_type === 'task' ? 'task' : 'followup');
      const title = node('strong', '', (event.title || '—') + ' · ' + typeLabel);
      row.append(title);
      const actionKey = event.event_type === 'created' ? 'activityCreated' : event.event_type === 'deleted' ? 'activityDeleted' : event.event_type === 'status_changed' ? 'activityStatusChanged' : 'activityUpdated';
      let detail = t(actionKey);
      if (event.event_type === 'status_changed') detail += ': ' + (t(event.old_status || 'statusCleared') || event.old_status || '—') + ' → ' + (t(event.new_status || 'statusCleared') || event.new_status || '—');
      else if (Array.isArray(event.changed_fields) && event.changed_fields.length) detail += ' · ' + event.changed_fields.join(', ');
      row.append(node('span', '', detail), node('time', '', dateText(event.occurred_at)));
      if (event.event_type !== 'deleted' && event.record_id) row.append(button(t('decisionView'), 'cw-decision-inline-link', () => {
        const record = report.recentRecords.find(item => item.id === event.record_id);
        if (record) openDecisionRecord(record.record_type, record);
      }));
      activity.append(row);
    });

    const records = $('cw-decision-records'); records.replaceChildren();
    if (!report.recentRecords.length) records.append(node('p', 'cw-decision-empty', t('decisionNoRecords')));
    report.recentRecords.forEach(record => {
      const typeLabel = t(record.record_type === 'customer' ? 'customer' : record.record_type === 'project' ? 'project' : record.record_type === 'task' ? 'task' : 'followup');
      const row = button('', 'cw-decision-record', () => openDecisionRecord(record.record_type, record));
      row.append(node('strong', '', record.title || '—'), node('span', '', typeLabel + ' · ' + dateText(record.updated_at || record.created_at)));
      records.append(row);
    });
  }

  function updateContributionLabels() {
    $('cw-contribution-title').textContent = t('contributionTitle');
    $('cw-contribution-subtitle').textContent = t('contributionSubtitle');
    $('cw-contribution-refresh').textContent = t('contributionRefresh');
    $('cw-contribution-currency-label').textContent = t('currency');
    $('cw-contribution-customers-title').textContent = t('contributionCustomers');
    $('cw-contribution-projects-title').textContent = t('contributionProjects');
    $('cw-contribution-unassigned-title').textContent = t('contributionUnassigned');
    $('cw-contribution-note').textContent = t('contributionNote');
    $('cw-contribution-currency').value = state.contributionCurrency;
  }

  function renderContributionGroup(host, rows, type) {
    host.replaceChildren();
    if (!rows.length) { host.append(node('p', 'cw-contribution-empty', t('contributionNoGroups'))); return; }
    rows.forEach(item => {
      const card = node('article', 'cw-contribution-card');
      const title = button(item.title || '—', 'cw-contribution-record-title', () => {
        if (type === 'customer') openCustomer(item.id);
        else openProjectById(item.id);
      });
      card.append(title);
      const share = Number(item.incomeShareBps) / 100;
      card.append(node('small', 'cw-contribution-share', t('contributionShare') + ': ' + share.toFixed(2) + '% · ' + t('contributionTransactions') + ': ' + (item.completedCount + item.plannedCount)));
      const rows = [
        [t('contributionIncome'), formatAmountMicros(item.income, state.contributionCurrency), 'income'],
        [t('contributionExpense'), formatAmountMicros(item.expense, state.contributionCurrency), 'expense'],
        [t('contributionNet'), formatAmountMicros(item.net, state.contributionCurrency), item.net < 0n ? 'expense' : 'income'],
        [t('contributionPlanned'), formatAmountMicros(item.plannedIncome, state.contributionCurrency) + ' / ' + formatAmountMicros(item.plannedExpense, state.contributionCurrency), '']
      ];
      rows.forEach(([label, value, kind]) => {
        const line = node('div', 'cw-contribution-value-row');
        line.append(node('span', '', label), node('strong', kind ? 'cw-amount-' + kind : '', value));
        card.append(line);
      });
      host.append(card);
    });
  }

  function renderBusinessContributionAnalysis(data) {
    updateContributionLabels();
    const report = getBusinessContributionReport(data, state.contributionCurrency, new Date(), 12);
    const summary = $('cw-contribution-summary'); summary.replaceChildren();
    [
      [t('contributionIncome'), report.totals.income, 'income'],
      [t('contributionExpense'), report.totals.expense, 'expense'],
      [t('contributionNet'), report.totals.net, report.totals.net < 0n ? 'expense' : 'income'],
      [t('contributionPlanned'), null, 'planned']
    ].forEach(([label, value, kind]) => {
      const card = node('article', 'cw-contribution-kpi');
      const amount = kind === 'planned'
        ? formatAmountMicros(report.totals.plannedIncome, report.currency) + ' / ' + formatAmountMicros(report.totals.plannedExpense, report.currency)
        : formatAmountMicros(value, report.currency);
      card.append(node('small', '', label), node('strong', kind ? 'cw-amount-' + kind : '', amount));
      summary.append(card);
    });
    renderContributionGroup($('cw-contribution-customers'), report.customers, 'customer');
    renderContributionGroup($('cw-contribution-projects'), report.projects, 'project');
    const unassigned = $('cw-contribution-unassigned'); unassigned.replaceChildren();
    if (!report.unassigned.count) unassigned.append(node('p', 'cw-contribution-empty', t('contributionNoUnassigned')));
    else {
      unassigned.append(node('strong', '', String(report.unassigned.count) + ' · ' + t('contributionTransactions')));
      const line = node('div', 'cw-contribution-value-row');
      line.append(node('span', '', t('contributionIncome')), node('strong', 'cw-amount-income', formatAmountMicros(report.unassigned.income, report.currency)));
      unassigned.append(line);
      const expense = node('div', 'cw-contribution-value-row');
      expense.append(node('span', '', t('contributionExpense')), node('strong', 'cw-amount-expense', formatAmountMicros(report.unassigned.expense, report.currency)));
      unassigned.append(expense);
      const net = node('div', 'cw-contribution-value-row');
      net.append(node('span', '', t('contributionNet')), node('strong', report.unassigned.net < 0n ? 'cw-amount-expense' : 'cw-amount-income', formatAmountMicros(report.unassigned.net, report.currency)));
      unassigned.append(net);
      const planned = node('div', 'cw-contribution-value-row');
      planned.append(node('span', '', t('contributionPlanned')), node('strong', '', formatAmountMicros(report.unassigned.plannedIncome, report.currency) + ' / ' + formatAmountMicros(report.unassigned.plannedExpense, report.currency)));
      unassigned.append(planned);
    }
  }

  function updateCustomerHealthLabels() {
    $('cw-customer-health-title').textContent = t('customerHealthTitle');
    $('cw-customer-health-subtitle').textContent = t('customerHealthSubtitle');
    $('cw-customer-health-refresh').textContent = t('customerHealthRefresh');
    $('cw-customer-health-note').textContent = t('customerHealthNote');
  }

  function renderCustomerRelationshipHealth(data) {
    updateCustomerHealthLabels();
    const report = getCustomerRelationshipHealth(data, getLocalDateKey(), 30);
    const metrics = report.metrics;
    const kpis = $('cw-customer-health-kpis'); kpis.replaceChildren();
    [
      ['customerHealthCustomers', metrics.customers],
      ['customerHealthActiveProjects', metrics.customersWithActiveProjects],
      ['customerHealthOverdue', metrics.customersWithOverdueFollowups],
      ['customerHealthNoNextDate', metrics.customersWithPendingNoDate],
      ['customerHealthStale', metrics.staleCustomersWithProjects],
      ['customerHealthNoHistory', metrics.customersWithoutHistory]
    ].forEach(([label, value]) => {
      const card = node('article', 'cw-customer-health-kpi');
      card.append(node('small', '', t(label)), node('strong', '', String(value)));
      kpis.append(card);
    });
    const host = $('cw-customer-health-list'); host.replaceChildren();
    if (!report.rows.length) { host.append(node('p', 'cw-customer-health-empty', t('customerHealthNoCustomers'))); return; }
    report.rows.forEach(customer => {
      const card = node('article', 'cw-customer-health-card cw-customer-health-' + customer.priority);
      const head = node('div', 'cw-customer-health-card-head');
      head.append(button(customer.title, 'cw-customer-health-customer', () => openCustomer(customer.id)), node('span', 'cw-customer-health-priority', t('customerHealthPriority' + customer.priority[0].toUpperCase() + customer.priority.slice(1))));
      card.append(head);
      if (customer.reasons.length) {
        const reasons = node('ul', 'cw-customer-health-reasons');
        customer.reasons.forEach(reason => {
          reasons.append(node('li', '', t('customerHealthReason' + reason.key[0].toUpperCase() + reason.key.slice(1)) + (reason.key === 'overdue' || reason.key === 'withoutNextDate' ? ' · ' + reason.count : '')));
        });
        card.append(reasons);
      } else card.append(node('p', 'cw-customer-health-empty', t('customerHealthPriorityNone')));
      const meta = node('div', 'cw-customer-health-meta');
      meta.append(node('span', '', t('customerHealthProjects') + ': ' + customer.activeProjectCount));
      meta.append(node('span', '', t('customerHealthPending') + ': ' + customer.pendingFollowups));
      meta.append(node('span', '', t('customerHealthLastContact') + ': ' + (customer.lastContact ? dateText(customer.lastContact) : '—')));
      meta.append(node('span', '', t('customerHealthNextContact') + ': ' + (customer.nextFollowup ? dateText(customer.nextFollowup) : '—')));
      card.append(meta);
      if (customer.activeProjects.length) {
        const projects = node('div', 'cw-customer-health-projects');
        customer.activeProjects.forEach(project => projects.append(button(project.title, 'cw-customer-health-project-link', () => openProjectById(project.id))));
        card.append(projects);
      }
      host.append(card);
    });
  }


  function updateProjectDeliveryLabels() {
    $('cw-delivery-title').textContent = t('deliveryTitle');
    $('cw-delivery-subtitle').textContent = t('deliverySubtitle');
    $('cw-delivery-refresh').textContent = t('refresh');
    $('cw-delivery-note').textContent = t('deliveryNote');
  }

  function renderProjectDeliveryAnalysis(data) {
    updateProjectDeliveryLabels();
    const report = getProjectDeliveryAnalysis(data, getLocalDateKey());
    const kpis = $('cw-delivery-kpis'); kpis.replaceChildren();
    [
      ['deliveryTotal', report.metrics.totalProjects],
      ['deliveryOnTrack', report.metrics.onTrack],
      ['deliveryBehind', report.metrics.behind],
      ['deliveryOverdue', report.metrics.overdue],
      ['deliveryIncomplete', report.metrics.incomplete]
    ].forEach(([label, value]) => {
      const card = node('article', 'cw-delivery-kpi');
      card.append(node('small', '', t(label)), node('strong', '', String(value)));
      kpis.append(card);
    });
    const host = $('cw-delivery-list'); host.replaceChildren();
    if (!report.rows.length) { host.append(node('p', 'cw-delivery-empty', t('deliveryNoProjects'))); return; }
    report.rows.forEach(row => {
      const project = row.project;
      const card = node('article', 'cw-delivery-card' + (row.overdue ? ' is-overdue' : '') + (row.risk === 'high' ? ' is-high-risk' : ''));
      const head = node('div', 'cw-delivery-card-head');
      head.append(button(project.title || '—', 'cw-delivery-project-title', () => openProjectById(project.id)));
      const badgeKey = row.overdue ? 'deliveryOverdueLabel' : row.risk === 'completed' ? 'deliveryCompletedLabel' : row.risk === 'incomplete' ? 'deliveryIncompleteLabel' : 'deliveryRisk' + row.risk[0].toUpperCase() + row.risk.slice(1);
      head.append(node('span', 'cw-delivery-badge cw-delivery-' + (row.overdue ? 'overdue' : row.risk), t(badgeKey)));
      card.append(head);
      const status = t(project.status) || project.status || '—';
      const dates = (project.start_date ? dateText(project.start_date) : '—') + ' – ' + (project.due_date ? dateText(project.due_date) : '—');
      card.append(node('p', 'cw-delivery-meta', status + ' · ' + t('deliveryStartDate') + ': ' + dates));
      if (row.dateIssue) {
        const issueKey = row.dateIssue === 'missing_dates' ? 'deliveryDateIssueMissing' : row.dateIssue === 'invalid_dates' ? 'deliveryDateIssueInvalid' : 'deliveryDateIssueOrder';
        card.append(node('p', 'cw-delivery-issue', t(issueKey)));
      } else {
        const bars = node('div', 'cw-delivery-progress-grid');
        [['deliveryPlanProgress', row.plannedProgress, 'planned'], ['deliveryActualProgress', row.actualProgress, 'actual']].forEach(([label, value, kind]) => {
          const item = node('div', 'cw-delivery-progress-item');
          const line = node('div', 'cw-delivery-progress-label');
          line.append(node('span', '', t(label)), node('strong', '', value + '%'));
          const track = node('span', 'cw-delivery-track');
          const fill = node('span', 'cw-delivery-fill cw-delivery-fill-' + kind);
          fill.style.width = value + '%'; track.append(fill);
          item.append(line, track); bars.append(item);
        });
        card.append(bars);
        const variance = row.variance === null ? '—' : (row.variance > 0 ? '+' : '') + row.variance + ' pp';
        card.append(node('p', 'cw-delivery-variance', t('deliveryVariance') + ': ' + variance + (row.risk !== 'completed' ? ' · ' + t('deliveryRisk') + ': ' + t(row.overdue ? 'deliveryOverdueLabel' : 'deliveryRisk' + row.risk[0].toUpperCase() + row.risk.slice(1)) : '')));
      }
      host.append(card);
    });
  }

  async function loadProjectDeliveryAnalysis(maxAgeMs=ENTRY_MAX_AGE_MS) {
    if (state.deliveryBusy) return;
    state.deliveryBusy = true;
    const feedback = $('cw-delivery-feedback');
    feedback.classList.remove('error'); feedback.textContent = t('deliveryLoading');
    try {
      const projects = await loadRecords('project', maxAgeMs);
      const data = { projects };
      state.deliveryData = data; state.projects = projects;
      renderProjectDeliveryAnalysis(data);
      feedback.textContent = '';
    } catch (error) {
      state.deliveryData = null;
      feedback.classList.add('error'); feedback.textContent = error.message || t('deliveryError');
      $('cw-delivery-kpis').replaceChildren(); $('cw-delivery-list').replaceChildren();
    } finally { state.deliveryBusy = false; }
  }

  async function loadCustomerRelationshipHealth(maxAgeMs=ENTRY_MAX_AGE_MS) {
    if (state.customerHealthBusy) return;
    state.customerHealthBusy = true;
    const feedback = $('cw-customer-health-feedback');
    feedback.classList.remove('error'); feedback.textContent = t('customerHealthLoading');
    try {
      const [customers, projects, followups] = await loadBusinessRecords(['customer', 'project', 'follow_up'], maxAgeMs);
      const data = { customers, projects, followups };
      state.customerHealthData = data;
      state.customers = customers; state.projects = projects; state.followups = followups;
      renderCustomerRelationshipHealth(data);
      feedback.textContent = '';
    } catch (error) {
      state.customerHealthData = null;
      feedback.classList.add('error'); feedback.textContent = error.message || t('customerHealthError');
      $('cw-customer-health-kpis').replaceChildren();
      $('cw-customer-health-list').replaceChildren();
    } finally { state.customerHealthBusy = false; }
  }

  async function loadBusinessContributionAnalysis(maxAgeMs=ENTRY_MAX_AGE_MS) {
    if (state.contributionBusy) return;
    state.contributionBusy = true;
    const feedback = $('cw-contribution-feedback');
    feedback.classList.remove('error'); feedback.textContent = t('contributionLoading');
    try {
      const [customers, projects, transactions] = await loadBusinessRecords(['customer', 'project', 'transaction'], maxAgeMs);
      const data = { customers, projects, transactions };
      state.contributionData = data;
      state.customers = customers; state.projects = projects;
      renderBusinessContributionAnalysis(data);
      feedback.textContent = '';
    } catch (error) {
      state.contributionData = null;
      feedback.classList.add('error'); feedback.textContent = error.message || t('contributionError');
      ['cw-contribution-summary', 'cw-contribution-customers', 'cw-contribution-projects', 'cw-contribution-unassigned'].forEach(id => $(id).replaceChildren());
    } finally { state.contributionBusy = false; }
  }

  async function loadBusinessDecisionCenter(maxAgeMs=ENTRY_MAX_AGE_MS) {
    if (state.decisionBusy) return;
    state.decisionBusy = true;
    const feedback = $('cw-decision-feedback');
    feedback.classList.remove('error'); feedback.textContent = t('decisionLoading');
    try {
      const [customers, projects, tasks, followups, transactions] = await loadBusinessRecords(['customer', 'project', 'task', 'follow_up', 'transaction'], maxAgeMs);
      const latestRecords = [...customers, ...projects, ...tasks, ...followups]
        .sort((a, b) => recordTimestamp(b) - recordTimestamp(a)).slice(0, 6);
      const activityPages = await Promise.all(latestRecords.map(record => loadRecentActivityHistory(record.id)));
      const activity = activityPages.flat().sort((a, b) => (Date.parse(b.occurred_at || '') || 0) - (Date.parse(a.occurred_at || '') || 0)).slice(0, 20);
      const report = getBusinessDecisionReport({ customers, projects, tasks, followups, transactions, activity }, getLocalDateKey());
      state.decisionData = report;
      state.customers = customers; state.projects = projects; state.tasks = tasks; state.followups = followups;
      rememberRelationshipRecords(projects, tasks, followups);
      renderBusinessDecisionCenter(report);
      feedback.textContent = '';
    } catch (error) {
      state.decisionData = null;
      feedback.classList.add('error'); feedback.textContent = error.message || t('decisionLoadError');
      ['cw-decision-kpis', 'cw-decision-finance', 'cw-decision-actions', 'cw-decision-activity', 'cw-decision-records'].forEach(id => $(id).replaceChildren());
    } finally { state.decisionBusy = false; }
  }

  async function loadBusinessTrends(maxAgeMs=ENTRY_MAX_AGE_MS) {
    if(state.trendBusy)return;
    state.trendBusy=true;
    const feedback=$('cw-trends-feedback');feedback.classList.remove('error');feedback.textContent=t('trendsLoading');
    try {
      const [projects,tasks,followups]=await loadBusinessRecords(['project','task','follow_up'],maxAgeMs);
      const [projectStatusHistory,taskStatusHistory]=await Promise.all([loadAllStatusHistory({recordType:'project'}),loadAllStatusHistory({recordType:'task'})]);
      state.trendData={projects,tasks,followups,projectStatusHistory,taskStatusHistory};
      state.projects=projects;state.tasks=tasks;state.followups=followups;
      rememberRelationshipRecords(projects,tasks,followups);
      renderBusinessTrends(state.trendData);feedback.textContent='';
    } catch(error) {
      state.trendData=null;
      feedback.classList.add('error');feedback.textContent=error.message||t('trendsLoadError');
      ['cw-trends-kpis','cw-trends-review','cw-trends-projects','cw-trends-tasks','cw-trends-followups'].forEach(id=>$(id).replaceChildren());
      $('cw-trends-range').textContent='';
    } finally {state.trendBusy=false;}
  }

  function updateProjectCustomerLabels() {
    $('cw-pc-title').textContent=t('pcOverviewTitle');
    $('cw-pc-subtitle').textContent=t('pcOverviewSubtitle');
    $('cw-pc-refresh').textContent=t('refresh');
    $('cw-pc-status-title').textContent=t('pcStatusDistribution');
    $('cw-pc-progress-title').textContent=t('pcProgressOverview');
    $('cw-pc-customers-title').textContent=t('pcCustomers');
    $('cw-pc-activity-title').textContent=t('pcRecentActivity');
  }
  function renderProjectCustomerOverview(data) {
    const metrics=getProjectCustomerOverview(data,getLocalDateKey());
    const kpis=$('cw-pc-kpis'); kpis.replaceChildren();
    [
      ['projects',metrics.totalProjects,()=>{state.projectStatus='';state.projectDueFilter='';state.projectCustomerFilter='';state.projectQuery='';state.projectOffset=0;switchTab('projects');}],
      ['pcAverageProgress',metrics.averageProgress+'%',()=>{state.projectStatus='';state.projectDueFilter='';state.projectCustomerFilter='';state.projectQuery='';state.projectOffset=0;switchTab('projects');}],
      ['pcCompletedProjects',metrics.completedProjects,()=>{state.projectStatus='completed';state.projectDueFilter='';state.projectCustomerFilter='';state.projectQuery='';state.projectOffset=0;switchTab('projects');}],
      ['pcOverdueProjects',metrics.overdueProjects,()=>{state.projectStatus='';state.projectDueFilter='overdue';state.projectCustomerFilter='';state.projectQuery='';state.projectOffset=0;switchTab('projects');}],
      ['pcCustomersWithProjects',metrics.customersWithProjects+'/'+metrics.totalCustomers,()=>{switchTab('customers');window.CompanyWebsite?.refresh?.();}],
      ['pcTaskCompletion',metrics.completedTasks+'/'+metrics.totalTasks,()=>{state.taskQuery='';state.taskStatus='completed';state.taskProjectFilter='';state.taskDueFilter='';state.taskOffset=0;switchTab('tasks');}]
    ].forEach(([label,value,action])=>{const card=button('', 'cw-pc-kpi',action);card.append(node('span','',t(label)),node('strong','',String(value)));kpis.append(card);});
    const status=$('cw-pc-status');status.replaceChildren();
    [['planned','planned'],['active','active'],['on_hold','on_hold'],['completed','completed'],['cancelled','cancelled']].forEach(([key,label])=>{
      const item=button('', 'cw-pc-status-card',()=>{state.projectStatus=key;state.projectDueFilter='';state.projectCustomerFilter='';state.projectQuery='';state.projectOffset=0;switchTab('projects');});
      item.append(node('span','',t(label)),node('strong','',String(metrics.statusCounts[key]||0)));status.append(item);
    });
    const projectHost=$('cw-pc-projects');projectHost.replaceChildren();
    if(!metrics.projectRows.length)projectHost.append(node('p','cw-pc-empty',t('pcNoProjects')));
    metrics.projectRows.forEach(row=>{
      const item=button('', 'cw-pc-project',()=>openProjectById(row.project.id));
      const top=node('div','cw-pc-project-top');
      top.append(node('strong','',row.project.title||'—'),node('span','',row.progress+'%'));
      const meta=node('p','cw-pc-meta',(row.customer?.title||'—')+' · '+(t(row.project.status)||row.project.status||'—')+' · '+t('pcProjectTaskSummary')+': '+row.taskCompleted+'/'+row.taskTotal);
      const track=node('span','cw-pc-track'),fill=node('span','cw-pc-fill');fill.style.width=row.progress+'%';track.append(fill);
      item.append(top,track,meta);projectHost.append(item);
    });
    const customerHost=$('cw-pc-customers');customerHost.replaceChildren();
    if(!metrics.customerRows.length)customerHost.append(node('p','cw-pc-empty',t('pcNoCustomers')));
    metrics.customerRows.forEach(row=>{
      const item=button('', 'cw-pc-customer',()=>openCustomer(row.customer.id));
      item.append(node('strong','',row.customer.title||'—'),node('span','',t('pcCustomersWithProjects')+': '+row.projectCount+' · '+t('activeProjects')+': '+row.activeProjectCount+' · '+t('relatedFollowupCount')+': '+row.followupCount));
      customerHost.append(item);
    });
    const activityHost=$('cw-pc-activity');activityHost.replaceChildren();
    if(!metrics.recentActivity.length)activityHost.append(node('p','cw-pc-empty',t('pcNoActivity')));
    metrics.recentActivity.forEach(item=>{
      const tab=item.type==='project'?'projects':item.type==='task'?'tasks':'followups';
      const label=item.type==='project'?t('project'):item.type==='task'?t('task'):t('followup');
      const action=()=>item.type==='project'?openProjectById(item.record.id):openRelatedRecord(tab,item.record);
      const row=button('', 'cw-pc-activity-item',action);
      row.append(node('strong','',item.record.title||'—'),node('span','',label+' · '+dateText(item.record.updated_at||item.record.created_at||item.record.record_date)));
      activityHost.append(row);
    });
  }
  async function loadProjectCustomerOverview(maxAgeMs=ENTRY_MAX_AGE_MS) {
    if(state.projectCustomerBusy)return;
    state.projectCustomerBusy=true;
    const feedback=$('cw-pc-feedback');feedback.classList.remove('error');feedback.textContent=t('pcLoading');
    try {
      const [customers,projects,tasks,followups]=await loadBusinessRecords(['customer','project','task','follow_up'],maxAgeMs);
      const data={customers,projects,tasks,followups};
      state.customers=customers;state.projects=projects;state.tasks=tasks;state.followups=followups;
      rememberRelationshipRecords(projects,tasks,followups);
      renderProjectCustomerOverview(data);feedback.textContent='';
    } catch(error) {
      feedback.classList.add('error');feedback.textContent=error.message||t('pcLoadError');
      ['cw-pc-kpis','cw-pc-status','cw-pc-projects','cw-pc-customers','cw-pc-activity'].forEach(id=>$(id).replaceChildren());
    } finally {state.projectCustomerBusy=false;}
  }

  async function loadOverview(maxAgeMs=ENTRY_MAX_AGE_MS) {
    if(state.overviewBusy)return;
    state.overviewBusy=true;const feedback=$('cw-overview-feedback');feedback.classList.remove('error');feedback.textContent=t('overviewLoading');
    try {
      const [customers,projects,tasks,followups]=await loadBusinessRecords(['customer','project','task','follow_up'],maxAgeMs);
      const data={customers,projects,tasks,followups};state.overviewData=data;state.customers=customers;state.projects=projects;rememberRelationshipRecords(projects,tasks,followups);renderOverview(data);feedback.textContent='';
    } catch(error) {
      feedback.classList.add('error');feedback.textContent=error.message||t('overviewError');
      $('cw-overview-kpis').replaceChildren();$('cw-overview-attention').replaceChildren();$('cw-overview-recent').replaceChildren();
    } finally {state.overviewBusy=false;}
  }

  // V10.58: complete project/task/follow-up sets. The old reader was called through Array.map,
  // which passed the array index as its record limit, so only the first 100 of each type were read.
  async function getRelationshipRecords(maxAgeMs = LOOKUP_MAX_AGE_MS) {
    const [projects,tasks,followups]=await loadBusinessRecords(['project','task','follow_up'],maxAgeMs);
    rememberRelationshipRecords(projects,tasks,followups);
    state.projects=projects;
    return state.relationshipRecords;
  }
  async function loadCustomerRelations(customers) {
    const summaries={}; (customers||[]).forEach(customer=>summaries[customer.id]={projects:[],tasks:[],followups:[],failed:false});
    try {
      const records=await getRelationshipRecords();
      const customerIds=new Set((customers||[]).map(item=>item.id));
      const projectById=new Map(records.projects.map(item=>[item.id,item]));
      records.projects.forEach(project=>{if(summaries[project.parent_record_id])summaries[project.parent_record_id].projects.push(project);});
      records.tasks.forEach(task=>{const project=projectById.get(task.parent_record_id);if(project&&summaries[project.parent_record_id])summaries[project.parent_record_id].tasks.push(task);});
      records.followups.forEach(record=>{
        const data=record.data&&typeof record.data==='object'?record.data:{};
        const projectId=data.project_id||(projectById.has(record.parent_record_id)?record.parent_record_id:'');
        const customerId=data.customer_id||(record.related_record_ids||[]).find(id=>customerIds.has(id))||(customerIds.has(record.parent_record_id)?record.parent_record_id:'')||(projectId?projectById.get(projectId)?.parent_record_id:'');
        if(summaries[customerId])summaries[customerId].followups.push(record);
      });
    } catch(error) {
      // Show "unavailable" instead of counting the failure as 0 related records.
      console.warn('Unable to load company relationship summaries',error);
      Object.values(summaries).forEach(summary=>{summary.projects=[];summary.tasks=[];summary.followups=[];summary.failed=true;summary.error=error?.message||t('relationLoadFailed');});
    }
    Object.values(summaries).forEach(summary=>{
      summary.projects.sort((a,b)=>new Date(b.record_date||0)-new Date(a.record_date||0));
      summary.tasks.sort((a,b)=>new Date(a.due_date||'9999-12-31')-new Date(b.due_date||'9999-12-31'));
      summary.followups.sort((a,b)=>new Date(b.record_date||0)-new Date(a.record_date||0));
    });
    return summaries;
  }
  async function loadProjectRelations(projectId) {
    const records=await getRelationshipRecords();
    const tasks=records.tasks.filter(item=>item.parent_record_id===projectId);
    const followups=records.followups.filter(item=>{const data=item.data&&typeof item.data==='object'?item.data:{};return data.project_id===projectId||item.parent_record_id===projectId;}).sort((a,b)=>new Date(b.record_date||0)-new Date(a.record_date||0));
    return {tasks,followups};
  }
  function invalidateRelations(){state.relationshipRecords=null;recordCache.invalidate();}
  function renderProjectRelations(projectId) {
    const tasksHost=$('cw-project-related-tasks'),followupsHost=$('cw-project-related-followups');
    tasksHost.replaceChildren(node('p','cw-related-empty',t('loadingRelations')));
    followupsHost.replaceChildren(node('p','cw-related-empty',t('loadingRelations')));
    loadProjectRelations(projectId).then(({tasks,followups})=>{
      if($('cw-project-details').dataset.projectId!==projectId)return;
      tasksHost.replaceChildren(); if(!tasks.length)tasksHost.append(node('p','cw-related-empty',t('noRelatedRecords')));
      tasks.slice(0,6).forEach(task=>{const data=task.data&&typeof task.data==='object'?task.data:{};const row=button('', 'cw-related-row cw-related-row-action',()=>openRelatedRecord('tasks',task));row.dataset.relatedRecordId=String(task.id);row.dataset.relatedRecordType='tasks';row.setAttribute('aria-label',t('edit')+': '+(task.title||t('task')));row.append(node('strong','',task.title||t('task')),node('span','cw-related-meta',(t(task.status)||task.status||'—')+(task.due_date?' · '+t('taskDue')+': '+dateText(task.due_date):'')));if(data.description)row.append(node('span','cw-related-note',data.description));tasksHost.append(row);});
      if(tasks.length>6)tasksHost.append(node('p','cw-related-more','+'+(tasks.length-6)));
      followupsHost.replaceChildren(); if(!followups.length)followupsHost.append(node('p','cw-related-empty',t('noRelatedRecords')));
      followups.slice(0,6).forEach(record=>{const data=record.data&&typeof record.data==='object'?record.data:{};const row=button('', 'cw-related-row cw-related-row-action',()=>openRelatedRecord('followups',record));row.dataset.relatedRecordId=String(record.id);row.dataset.relatedRecordType='followups';row.setAttribute('aria-label',t('edit')+': '+(record.title||t('followup')));row.append(node('strong','',record.title||t('followup')),node('span','cw-related-meta',dateText(record.record_date)+' · '+(t(record.status)||record.status||'—')));if(data.outcome)row.append(node('span','cw-related-note',data.outcome));followupsHost.append(row);});
      if(followups.length>6)followupsHost.append(node('p','cw-related-more','+'+(followups.length-6)));
    }).catch(()=>{tasksHost.replaceChildren(node('p','cw-related-empty',t('relationLoadFailed')));followupsHost.replaceChildren(node('p','cw-related-empty',t('relationLoadFailed')));});
  }
  // V10.58: complete customer and project lists for selectors, names and filters
  // (previously only the first 100 of each were read).
  async function loadCustomers(maxAgeMs = LOOKUP_MAX_AGE_MS) {
    // Customers keep coming from GET /customers (as before V10.58), now read page by page in full.
    const [customers, projects] = await Promise.all([loadCustomerList(maxAgeMs), loadRecords('project', maxAgeMs)]);
    state.customers = customers;
    state.projects = projects;
  }
  // options.entry: tab was just opened; options.force: user pressed refresh.
  // Filter, search and pagination changes reuse the cached complete sets.
  async function loadActive(options = {}) {
    if (!['projects','tasks','followups'].includes(state.tab)) return;
    const opts = options && typeof options === 'object' && !('type' in options) ? options : {};
    if (state.busy) { state.reloadPending = { ...(state.reloadPending || {}), ...opts }; return; }
    const maxAgeMs = opts.force ? 0 : opts.entry ? ENTRY_MAX_AGE_MS : LOOKUP_MAX_AGE_MS;
    state.busy = true; $('cw-business-feedback').textContent = t('loading'); $('cw-business-feedback').classList.remove('error');
    try {
      await loadCustomers(maxAgeMs);
      updateToolbar();
      renderRelationContext();
      const project = state.tab === 'projects', task = state.tab === 'tasks', type = project ? 'project' : task ? 'task' : 'follow_up';
      if (task || state.tab === 'followups') updateToolbar();
      const offset = project ? state.projectOffset : task ? state.taskOffset : state.followupOffset;
      const query = project ? state.projectQuery : task ? state.taskQuery : state.followupQuery;
      const status = project ? state.projectStatus : task ? state.taskStatus : state.followupStatus;
      const relationFiltered = (project && (state.projectCustomerFilter || state.projectDueFilter)) || (state.tab === 'followups' && (state.followupCustomerFilter || state.followupProjectFilter || state.followupDueFilter));
      let records = [], total = 0;
      if (task) {
        // Date filtering must run against the complete task set before pagination.
        const allTasks = await loadRecords('task', maxAgeMs);
        const normalizedQuery = query.toLowerCase();
        const filteredTasks = allTasks.filter(record => {
          if (normalizedQuery && !String(record.title || '').toLowerCase().includes(normalizedQuery)) return false;
          if (status === '__open__' && record.status === 'completed') return false;
          if (status && status !== '__open__' && record.status !== status) return false;
          if (state.taskProjectFilter && record.parent_record_id !== state.taskProjectFilter) return false;
          return matchesTaskDueDate(record, state.taskDueFilter, getLocalDateKey());
        });
        total = filteredTasks.length;
        const lastPageOffset = total ? Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE : 0;
        const pageOffset = Math.min(offset, lastPageOffset);
        if (pageOffset !== offset) setOffset(pageOffset);
        state.tasks = filteredTasks;
        records = filteredTasks.slice(pageOffset, pageOffset + PAGE_SIZE);
        $('cw-business-feedback').textContent = total ? t('loaded') + ' · ' + total : '';
        renderList(false, true, records, total, pageOffset);
        return;
      }
      if (relationFiltered) {
        // Relation filters are applied in the browser, so read the complete (API q/status filtered) set.
        const all = await loadRecords(type, maxAgeMs, { q:query, status });
        records = all.filter(record => {
          const data = record.data && typeof record.data === 'object' ? record.data : {};
          if (project) {
            if (state.projectCustomerFilter && record.parent_record_id !== state.projectCustomerFilter) return false;
            if (state.projectDueFilter === 'overdue') return isOverdueProject(record, getLocalDateKey());
            return true;
          }
          if (state.followupCustomerFilter && (data.customer_id || (record.related_record_ids || [])[0] || (state.customers.some(c=>c.id===record.parent_record_id) ? record.parent_record_id : '')) !== state.followupCustomerFilter) return false;
          if (state.followupProjectFilter && (data.project_id || (state.projects.some(p=>p.id===record.parent_record_id) ? record.parent_record_id : '')) !== state.followupProjectFilter) return false;
          if (state.followupDueFilter === 'overdue') return record.status === 'pending' && Boolean(data.next_follow_up_date) && String(data.next_follow_up_date).slice(0,10) < getLocalDateKey();
          return true;
        });
        total = records.length;
        const lastPageOffset = total ? Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE : 0;
        const pageOffset = Math.min(offset, lastPageOffset);
        if (pageOffset !== offset) setOffset(pageOffset);
        const pageRecords = records.slice(pageOffset, pageOffset + PAGE_SIZE);
        if (project) state.projects = [...new Map([...state.projects, ...all.filter(item => item.record_type === 'project')].map(item => [item.id, item])).values()];
        else state.followups = records;
        $('cw-business-feedback').textContent = total ? t('loaded') + ' · ' + total : '';
        renderList(project, task, pageRecords, total, pageOffset);
      } else {
        const params = new URLSearchParams({ record_type:type, limit:String(PAGE_SIZE), offset:String(offset) });
        if (query) params.set('q', query); if (status) params.set('status', status);
        const endpoint = task && state.taskProjectFilter ? '/projects/' + encodeURIComponent(state.taskProjectFilter) + '/tasks?' + params.toString().replace(/(?:^|&)record_type=task&?/, '$1') : '/records?' + params.toString();
        const result = await api(endpoint);
        records = Array.isArray(result?.items) ? result.items : [];
        total = Number(result?.total || 0);
        if (project) state.projects = [...new Map([...state.projects, ...records].map(item => [item.id, item])).values()]; else if (task) state.tasks = records; else state.followups = records;
        $('cw-business-feedback').textContent = total ? t('loaded') + ' · ' + total : '';
        renderList(project, task, records, total, offset);
      }
    } catch (error) { $('cw-business-feedback').textContent = error.message || t('failed'); $('cw-business-feedback').classList.add('error'); }
    finally {
      state.busy = false;
      if (state.reloadPending) { const pending = state.reloadPending; state.reloadPending = false; loadActive(pending); }
    }
  }
  function customerName(id) { return state.customers.find(c => c.id === id)?.title || '—'; }
  function openCustomer(id) { const customer = state.customers.find(c => c.id === id); switchTab('customers'); if (customer && window.CompanyWebsite?.focusCustomer) window.CompanyWebsite.focusCustomer(id); else if (window.CompanyWebsite?.focusCustomer) window.CompanyWebsite.focusCustomer(id); }
  function showCustomerProjects(id) { state.projectCustomerFilter = id || ''; state.projectDueFilter = ''; state.projectOffset = 0; switchTab('projects'); }
  function showCustomerFollowups(id) { state.followupCustomerFilter = id || ''; state.followupProjectFilter = ''; state.followupOffset = 0; switchTab('followups'); }
  function showProjectFollowups(id) { state.followupProjectFilter = id || ''; state.followupCustomerFilter = ''; state.followupOffset = 0; switchTab('followups'); }
  function showProjectTasks(id) { state.taskProjectFilter = id || ''; state.taskOffset = 0; switchTab('tasks'); }
  function projectName(id) { return state.projects.find(p => p.id === id)?.title || '—'; }
  async function openRelatedRecord(tab, record) {
    if (!record?.id || !['projects','tasks','followups'].includes(tab)) return;
    const detailsDialog = $('cw-project-details');
    if (detailsDialog?.open) detailsDialog.close();
    if (state.relationshipRecords?.projects) {
      state.projects = [...new Map([...state.projects,...state.relationshipRecords.projects].map(item=>[item.id,item])).values()];
    }
    switchTab(tab);
    await openEditor(record);
  }
  function renderList(project, task, records, total, offset) {
    const host = $('cw-business-list'); host.replaceChildren();
    if (!records.length) {
      const hasTaskFilters = task && Boolean(state.taskQuery || state.taskStatus || state.taskProjectFilter || state.taskDueFilter);
      const empty = node('div','cw-empty'); node('div','cw-empty-icon','◇'); empty.append(node('div','cw-empty-icon','◇'),node('h3','',hasTaskFilters ? t('noMatchingTasks') : t(project?'noProjects':task?'noTasks':'noFollowups')),node('p','',t(project?'createProjectHint':task?'createTaskHint':'createFollowupHint')),button('＋ '+t(project?'newProject':'newTask'),'primary',()=>openEditor())); host.append(empty);
    } else records.forEach(record => {
      const card = node('article','cw-business-card'), main = node('div','cw-business-main');
      card.dataset.recordId = record.id;
      main.append(node('h3','cw-customer-title',record.title));
      const data = record.data && typeof record.data === 'object' ? record.data : {};
      const meta = node('div','cw-customer-meta');
      if (project) { const customerLink = button(customerName(record.parent_record_id),'cw-tag cw-relation-link',()=>openCustomer(record.parent_record_id)); meta.append(customerLink,node('span','cw-status',t(record.status)||record.status)); }
      else if (task) { const projectLink = button(projectName(record.parent_record_id),'cw-tag cw-relation-link',()=>openProjectById(record.parent_record_id)); meta.append(projectLink,node('span','cw-status',t(record.status)||record.status)); }
      else {
        const cid = data.customer_id || (record.related_record_ids || []).find(id => state.customers.some(c => c.id === id)) || (state.customers.some(c => c.id === record.parent_record_id) ? record.parent_record_id : '');
        if (cid) meta.append(button(customerName(cid),'cw-tag cw-relation-link',()=>openCustomer(cid)));
        meta.append(node('span','cw-status',t(record.status)||record.status),node('span','cw-tag',t(data.method || 'other')));
      }
      main.append(meta);
      const details = node('div','cw-business-details');
      if (project) {
        if (data.description) details.append(node('p','',data.description));
        if (record.record_date) details.append(node('span','',t('startDate')+': '+dateText(record.record_date)));
        if (record.due_date) details.append(node('span','',t('dueDate')+': '+dateText(record.due_date)));
        const rawProgress = Number(data.progress_percent ?? 0);
        const progress = Number.isInteger(rawProgress) && rawProgress >= 0 && rawProgress <= 100 ? rawProgress : 0;
        const progressWrap = node('div','cw-project-progress');
        const progressLabel = node('div','cw-project-progress-label');
        const autoProgress = data.progress_mode === 'auto';
        const completedTasks = Number(data.progress_task_completed ?? 0), totalTasks = Number(data.progress_task_total ?? 0);
        const progressDescription = autoProgress ? t('autoProgress') + ' · ' + completedTasks + '/' + totalTasks : t('manualProgress');
        progressLabel.append(node('span','',t('progress')+' · '+progressDescription),node('strong','',progress+'%'));
        const track = node('div','cw-project-progress-track'), fill = node('div','cw-project-progress-fill');
        fill.style.width = progress + '%'; track.append(fill); progressWrap.append(progressLabel,track); details.append(progressWrap);
      }
      else if (task) { if (data.description) details.append(node('p','',data.description)); details.append(node('span','',t('taskDue')+': '+(dateText(record.due_date)||'—'))); }
      else { if (data.outcome) details.append(node('p','',data.outcome)); if (data.next_follow_up_date) details.append(node('span','',t('nextDate')+': '+dateText(data.next_follow_up_date))); if (data.project_id) details.append(node('span','',t('project')+': '+(projectName(data.project_id) === '—' ? data.project_title || '—' : projectName(data.project_id)))); }
      card.append(main,details);
      const actions = node('div','cw-card-actions');
      if (project) actions.append(button(t('viewDetails'),'secondary',()=>openProjectDetails(record)));
      if (task) actions.append(button(t('viewProject'),'secondary',()=>openProjectById(record.parent_record_id)));
      if (!project && !task) { const cid = data.customer_id || (record.related_record_ids || []).find(id => state.customers.some(c => c.id === id)) || (state.customers.some(c=>c.id===record.parent_record_id) ? record.parent_record_id : ''); const pid = data.project_id || (state.projects.some(p=>p.id===record.parent_record_id) ? record.parent_record_id : ''); if (cid) actions.append(button(t('viewCustomer'),'secondary',()=>openCustomer(cid))); if (pid) actions.append(button(t('viewProject'),'secondary',()=>openProjectById(pid))); }
      actions.append(button(t('statusHistory'),'secondary',()=>openStatusHistory(record)),button(t('attachments'),'secondary',()=>window.CompanyRecords?.openAttachments(record)),button(t('edit'),'secondary',()=>openEditor(record)),button(t('delete'),'cw-delete',()=>removeRecord(record,project,task)));
      card.append(actions); host.append(card);
    });
    const pager = $('cw-business-pagination'); pager.replaceChildren();
    const pages = Math.max(1,Math.ceil(total/PAGE_SIZE)), current = Math.floor(offset/PAGE_SIZE)+1;
    if (pages > 1) pager.append(button(t('previous'),'secondary',()=>{setOffset(Math.max(0,offset-PAGE_SIZE));loadActive();}),node('span','',current+' / '+pages),button(t('next'),'secondary',()=>{setOffset(offset+PAGE_SIZE);loadActive();}));
  }
  async function openStatusHistory(record) {
    const dialog = $('cw-status-history-dialog');
    const feedback = $('cw-status-history-feedback');
    const list = $('cw-status-history-list');
    $('cw-status-history-title').textContent = t('statusHistoryTitle') + ' · ' + (record?.title || '');
    $('cw-status-history-note').textContent = t('activityHistoryNote');
    $('cw-status-history-done').textContent = t('close');
    feedback.classList.remove('error');
    feedback.textContent = t('activityHistoryLoading');
    list.replaceChildren();
    dialog.showModal();
    try {
      const events = await loadAllActivityHistory(record.id);
      if (!dialog.open) return;
      if (!events.length) {
        feedback.textContent = t('activityHistoryEmpty');
        return;
      }
      feedback.textContent = '';
      const fieldNames = {
        title: locale() === 'ja' ? 'タイトル' : locale() === 'en' ? 'Title' : '标题',
        business_type: locale() === 'ja' ? '業種' : locale() === 'en' ? 'Business type' : '业务类型',
        parent_record_id: locale() === 'ja' ? '親レコード' : locale() === 'en' ? 'Parent record' : '上级关联',
        related_record_ids: locale() === 'ja' ? '関連レコード' : locale() === 'en' ? 'Related records' : '关联记录',
        record_date: locale() === 'ja' ? '記録日時' : locale() === 'en' ? 'Record date' : '记录日期',
        due_date: locale() === 'ja' ? '期限' : locale() === 'en' ? 'Due date' : '截止日期',
        amount: locale() === 'ja' ? '金額' : locale() === 'en' ? 'Amount' : '金额',
        currency: locale() === 'ja' ? '通貨' : locale() === 'en' ? 'Currency' : '币种',
        'data.description': locale() === 'ja' ? '説明' : locale() === 'en' ? 'Description' : '说明',
        'data.progress_mode': locale() === 'ja' ? '進捗計算方式' : locale() === 'en' ? 'Progress mode' : '进度模式',
        'data.progress_percent': locale() === 'ja' ? '進捗率' : locale() === 'en' ? 'Progress' : '项目进度',
        'data.method': locale() === 'ja' ? 'フォロー方法' : locale() === 'en' ? 'Follow-up method' : '跟进方式',
        'data.outcome': locale() === 'ja' ? '結果' : locale() === 'en' ? 'Outcome' : '跟进结果',
        'data.next_follow_up_date': locale() === 'ja' ? '次回フォロー日' : locale() === 'en' ? 'Next follow-up' : '下次跟进日期',
        'data.notes': locale() === 'ja' ? 'メモ' : locale() === 'en' ? 'Notes' : '备注',
        'data.customer_id': locale() === 'ja' ? '顧客との関連' : locale() === 'en' ? 'Customer link' : '客户关联',
        'data.project_id': locale() === 'ja' ? 'プロジェクトとの関連' : locale() === 'en' ? 'Project link' : '项目关联'
      };
      events.forEach(event => {
        const item = node('li', 'cw-status-history-item');
        const actionKey = event.event_type === 'created' ? 'activityCreated'
          : event.event_type === 'deleted' ? 'activityDeleted'
          : event.event_type === 'status_changed' ? 'activityStatusChanged' : 'activityUpdated';
        item.append(node('p', 'cw-status-history-change', t(actionKey)));
        if (event.event_type === 'status_changed') {
          const oldStatus = event.old_status ? (t(event.old_status) || event.old_status) : t('statusInitial');
          const newStatus = event.new_status ? (t(event.new_status) || event.new_status) : t('statusCleared');
          item.append(node('p', 'cw-status-history-change', oldStatus + ' → ' + newStatus));
        } else if (Array.isArray(event.changed_fields) && event.changed_fields.length) {
          const labels = event.changed_fields.map(field => fieldNames[field] || field.replace(/^data\./, '')).join(' · ');
          item.append(node('p', 'cw-status-history-fields', t('activityFields') + ': ' + labels));
        }
        const occurred = new Date(event.occurred_at);
        item.append(node('time', 'cw-status-history-time', Number.isNaN(occurred.getTime()) ? String(event.occurred_at || '') : occurred.toLocaleString(locale() === 'ja' ? 'ja-JP' : locale() === 'en' ? 'en-US' : 'zh-CN')));
        list.append(item);
      });
    } catch (error) {
      feedback.classList.add('error');
      feedback.textContent = error.message || t('activityHistoryError');
    }
  }
    function openProjectById(id) { const record = state.projects.find(p => p.id === id); if (record) openProjectDetails(record); else { state.projectCustomerFilter = ''; switchTab('projects'); $('cw-business-feedback').textContent = t('project') + ' · ' + id; } }
  function openProjectDetails(record) {
    const data = record?.data && typeof record.data === 'object' ? record.data : {};
    const rawProgress = Number(data.progress_percent ?? 0);
    const progress = Number.isInteger(rawProgress) && rawProgress >= 0 && rawProgress <= 100 ? rawProgress : 0;
    const dialog = $('cw-project-details');
    dialog.dataset.projectId = record.id;
    $('cw-project-details-title').textContent = record.title || t('projectDetails');
    const autoProgress = data.progress_mode === 'auto';
    const completedTasks = Number(data.progress_task_completed ?? 0), totalTasks = Number(data.progress_task_total ?? 0);
    $('cw-project-details-progress-label').textContent = t('progress') + ' · ' + (autoProgress ? t('autoProgress') + ' (' + completedTasks + '/' + totalTasks + ')' : t('manualProgress'));
    $('cw-project-details-progress-value').textContent = progress + '%';
    $('cw-project-details-progress-fill').style.width = progress + '%';
    $('cw-project-details-customer-label').textContent = t('customer');
    $('cw-project-details-customer').textContent = customerName(record.parent_record_id);
    $('cw-project-details-status-label').textContent = t('status');
    $('cw-project-details-status').textContent = t(record.status) || record.status || '—';
    $('cw-project-details-start-label').textContent = t('startDate');
    $('cw-project-details-start').textContent = dateText(record.record_date) || '—';
    $('cw-project-details-due-label').textContent = t('dueDate');
    $('cw-project-details-due').textContent = dateText(record.due_date) || '—';
    $('cw-project-details-description-label').textContent = t('description');
    $('cw-project-details-description').textContent = data.description || '—';
    $('cw-project-details-edit').textContent = t('edit');
    $('cw-project-details-close-action').textContent = t('close');
    $('cw-project-details-tasks').textContent = t('manageTasks');
    $('cw-project-details-customer-action').textContent = t('viewCustomer');
    $('cw-project-details-followups').textContent = t('viewFollowups');
    dialog.showModal();
    renderProjectRelations(record.id);
  }
  function field(label,id,type,value,wide,extra) {
    const wrap = node('div','field'+(wide?' cw-field-wide':''));
    wrap.append(node('label','',label));
    let input;
    if (type === 'select') { input = document.createElement('select'); input.innerHTML = extra; }
    else if (type === 'textarea') input = document.createElement('textarea');
    else { input = document.createElement('input'); input.type = type; }
    input.id = id; if (value !== undefined && value !== null) input.value = value;
    if (type === 'text' || type === 'textarea') input.maxLength = 5000;
    wrap.append(input); return wrap;
  }
  async function openEditor(record) {
    state.editing = record || null;
    try { await loadCustomers(); } catch (e) { $('cw-business-feedback').textContent = e.message; return; }
    if (state.tab !== 'tasks' && !state.customers.length) { $('cw-business-feedback').textContent = t('customerMissing'); return; }
    const data = record?.data && typeof record.data === 'object' ? record.data : {};
    const fields = $('cw-business-fields'); fields.replaceChildren();
    $('cw-business-editor-title').textContent = t(record ? 'edit' : (state.tab === 'projects' ? 'newProject' : state.tab === 'tasks' ? 'newTask' : 'newFollowup'));
    const customerChoices = [['',t('chooseCustomer')],...state.customers.map(c=>[c.id,c.title])];
    if (state.tab === 'projects') {
      const selectedCustomer = record?.parent_record_id || '';
      fields.append(field(t('projectTitle')+' *','cw-biz-title','text',record?.title || '',true));
      fields.append(field(t('customer')+' *','cw-biz-customer','select',selectedCustomer,false,selectOptions(customerChoices,selectedCustomer)));
      fields.append(field(t('status'),'cw-biz-status','select',record?.status || 'planned',false,selectOptions([['planned',t('planned')],['active',t('active')],['on_hold',t('on_hold')],['completed',t('completed')],['cancelled',t('cancelled')]],record?.status || 'planned')));
      fields.append(field(t('startDate'),'cw-biz-start','date',record?.record_date?.slice(0,10) || ''));
      fields.append(field(t('dueDate'),'cw-biz-due','date',record?.due_date?.slice(0,10) || ''));
      const progressMode = data.progress_mode === 'auto' ? 'auto' : 'manual';
      fields.append(field(t('progressMode'),'cw-biz-progress-mode','select',progressMode,false,selectOptions([['manual',t('manualProgress')],['auto',t('autoProgress')]],progressMode)));
      const manualProgress = data.manual_progress_percent ?? data.progress_percent ?? 0;
      const progressField = field(t('progressPercent'),'cw-biz-progress','number',String(manualProgress));
      const progressInput = progressField.querySelector('input');
      progressInput.min = '0'; progressInput.max = '100'; progressInput.step = '1'; progressInput.required = true;
      progressInput.disabled = progressMode === 'auto';
      fields.append(progressField);
      const progressHint = node('p','cw-form-hint',progressMode === 'auto' ? t('progressAutoHint') : t('progressManualHint'));
      progressHint.id = 'cw-biz-progress-hint'; fields.append(progressHint);
      $('cw-biz-progress-mode').addEventListener('change', () => {
        const automatic = $('cw-biz-progress-mode').value === 'auto';
        progressInput.disabled = automatic;
        progressHint.textContent = automatic ? t('progressAutoHint') : t('progressManualHint');
      });
      fields.append(field(t('description'),'cw-biz-description','textarea',data.description || '',true));
    } else if (state.tab === 'tasks') {
      const selectedProject = record?.parent_record_id || state.taskProjectFilter || '';
      fields.append(field(t('taskTitle')+' *','cw-biz-title','text',record?.title || '',true));
      fields.append(field(t('taskProject')+' *','cw-biz-project','select',selectedProject,false,selectOptions([['',t('chooseCustomer')],...state.projects.map(p=>[p.id,p.title])],selectedProject)));
      fields.append(field(t('taskStatus'),'cw-biz-status','select',record?.status || 'todo',false,selectOptions([['todo',t('todo')],['in_progress',t('in_progress')],['blocked',t('blocked')],['completed',t('done')]],record?.status || 'todo')));
      fields.append(field(t('taskDue'),'cw-biz-due','date',record?.due_date?.slice(0,10) || ''));
      fields.append(field(t('description'),'cw-biz-description','textarea',data.description || '',true));
    } else {
      const customerId = data.customer_id || (record?.related_record_ids || [])[0] || record?.parent_record_id || '';
      const projectId = data.project_id || (record?.record_type === 'follow_up' && state.projects.some(p=>p.id===record.parent_record_id) ? record.parent_record_id : '');
      const projectChoices = [['',t('noProject')],...state.projects.filter(p=>p.parent_record_id===customerId).map(p=>[p.id,p.title])];
      fields.append(field(t('followupTitle')+' *','cw-biz-title','text',record?.title || '',true));
      fields.append(field(t('customer')+' *','cw-biz-customer','select',customerId,false,selectOptions(customerChoices,customerId)));
      fields.append(field(t('linkedProject'),'cw-biz-project','select',projectId,false,selectOptions(projectChoices,projectId)));
      fields.append(field(t('method'),'cw-biz-method','select',data.method || 'phone',false,selectOptions([['phone',t('phone')],['email',t('email')],['meeting',t('meeting')],['message',t('message')],['other',t('other')]],data.method || 'phone')));
      fields.append(field(t('status'),'cw-biz-status','select',record?.status || 'pending',false,selectOptions([['pending',t('pending')],['completed',t('done')]],record?.status || 'pending')));
      fields.append(field(t('followupDate'),'cw-biz-date','datetime-local',record?.record_date ? new Date(record.record_date).toISOString().slice(0,16) : new Date().toISOString().slice(0,16)));
      fields.append(field(t('outcome'),'cw-biz-outcome','textarea',data.outcome || '',true));
      fields.append(field(t('nextDate'),'cw-biz-next','date',data.next_follow_up_date || ''));
      fields.append(field(t('notes'),'cw-biz-notes','textarea',data.notes || '',true));
      $('cw-biz-customer').addEventListener('change', updateProjectChoices);
    }
    $('cw-business-error').textContent = ''; $('cw-business-editor').showModal(); $('cw-biz-title').focus();
  }
  function updateProjectChoices() {
    const customerId = $('cw-biz-customer').value, select = $('cw-biz-project'), current = select.value;
    select.innerHTML = selectOptions([['',t('noProject')],...state.projects.filter(p=>p.parent_record_id===customerId).map(p=>[p.id,p.title])],current);
  }
  async function saveEditor(event) {
    event.preventDefault(); const title = $('cw-biz-title').value.trim(), project = state.tab === 'projects', task = state.tab === 'tasks';
    const customerId = task ? '' : $('cw-biz-customer').value;
    if (!title || (!task && !customerId)) { $('cw-business-error').textContent = t('required'); return; }
    let payload;
    if (project) {
      const progressMode = $('cw-biz-progress-mode').value;
      const progress = Number($('cw-biz-progress').value);
      if (!Number.isInteger(progress) || progress < 0 || progress > 100) { $('cw-business-error').textContent = t('invalidProgress'); return; }
      const previousData = state.editing?.data && typeof state.editing.data === 'object' ? state.editing.data : {};
      const manualProgress = progressMode === 'manual' ? progress : Number(previousData.manual_progress_percent ?? previousData.progress_percent ?? progress);
      payload = { record_type:'project', title, business_type:state.customers.find(c=>c.id===customerId)?.business_type || null, status:$('cw-biz-status').value, parent_record_id:customerId, record_date:$('cw-biz-start').value || null, due_date:$('cw-biz-due').value || null, data:{ ...previousData, description:$('cw-biz-description').value.trim(), progress_mode:progressMode, progress_percent:progressMode === 'manual' ? progress : Number(previousData.progress_percent ?? 0), manual_progress_percent:manualProgress } };
    } else if (task) {
      const projectId = $('cw-biz-project').value, parentProject = state.projects.find(p=>p.id===projectId);
      if (!projectId || !parentProject) { $('cw-business-error').textContent = t('requiredTaskProject'); return; }
      const taskStatus = $('cw-biz-status').value;
      if (!['todo','in_progress','blocked','completed'].includes(taskStatus)) { $('cw-business-error').textContent = t('invalidTaskStatus'); return; }
      const parentCustomer = state.customers.find(c=>c.id===parentProject.parent_record_id);
      payload = { record_type:'task', title, business_type:parentCustomer?.business_type || parentProject.business_type || null, status:taskStatus, parent_record_id:projectId, due_date:$('cw-biz-due').value || null, data:{ ...(state.editing?.data && typeof state.editing.data === 'object' ? state.editing.data : {}), description:$('cw-biz-description').value.trim() } };
    } else {
      const projectId = $('cw-biz-project').value || null, when = $('cw-biz-date').value;
      payload = { record_type:'follow_up', title, business_type:state.customers.find(c=>c.id===customerId)?.business_type || null, status:$('cw-biz-status').value, parent_record_id:projectId || customerId, related_record_ids:projectId ? [customerId] : [], record_date:when ? new Date(when).toISOString() : new Date().toISOString(), data:{ customer_id:customerId, project_id:projectId, project_title:projectId ? state.projects.find(p=>p.id===projectId)?.title || '' : '', method:$('cw-biz-method').value, outcome:$('cw-biz-outcome').value.trim(), next_follow_up_date:$('cw-biz-next').value || null, notes:$('cw-biz-notes').value.trim() } };
    }
    const id = state.editing?.id;
    try { if (id) { const patch = { ...payload }; delete patch.record_type; await api('/records/'+encodeURIComponent(id),'PATCH',patch); } else await api('/records','POST',payload); $('cw-business-editor').close(); state.editing=null; invalidateRelations(); await refreshCurrentTab(); }
    catch (error) { $('cw-business-error').textContent = error.message || t('failed'); }
  }
  async function removeRecord(record, project, task) {
    if (!window.confirm(t(project?'confirmDeleteProject':task?'confirmDeleteTask':'confirmDeleteFollowup')+'\n'+record.title)) return;
    try { await api('/records/'+encodeURIComponent(record.id),'DELETE'); invalidateRelations(); await refreshCurrentTab(); }
    catch (error) { $('cw-business-feedback').textContent = error.message || t('failed'); $('cw-business-feedback').classList.add('error'); }
  }
  function closeEditor() { $('cw-business-editor').close(); state.editing=null; }
  function init() {
    if (!root()) return;
    install();
    window.addEventListener('planner-workspace-change', () => { if (document.documentElement.dataset.workspace === 'company') refreshCurrentTab(); });
    window.addEventListener('planner-auth-change', () => { state.verified=''; invalidateRelations(); if (document.documentElement.dataset.workspace === 'company') refreshCurrentTab(); });
    switchTab('customers');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
  window.CompanyBusiness = Object.freeze({ refresh:loadActive, switchTab, showCustomerProjects, showCustomerFollowups, showProjectFollowups, showProjectTasks, openCustomer, openProject:openProjectById, openRelatedRecord, loadCustomerRelations, invalidateRelations, loadRecords:(type, maxAgeMs) => loadRecords(type, maxAgeMs), openActivityHistory:openStatusHistory });
})();