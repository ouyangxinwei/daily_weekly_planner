import { getLocalDateKey, matchesTaskDueDate } from './company-task-date-filter.js';
import { getBusinessOverviewMetrics, getRecentBusinessRecords } from './company-overview-metrics.js';
import { getTodoCenterSections, getTodoFollowupDateState } from './company-todo-center.js';
import { getProjectCustomerOverview } from './company-project-customer-overview.js';
import { getBusinessTrendReport } from './company-business-trends.js';
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
  const state = { tab: 'customers', verified: '', customers: [], projects: [], followups: [], tasks: [], projectOffset: 0, followupOffset: 0, taskOffset: 0, projectQuery: '', followupQuery: '', taskQuery: '', taskDueFilter: '', projectStatus: '', followupStatus: '', taskStatus: '', taskProjectFilter: '', projectCustomerFilter: '', followupCustomerFilter: '', editing: null, busy: false, reloadPending: false, followupProjectFilter: '', followupDueFilter: '', overviewBusy: false, overviewData: null, todoBusy: false, projectCustomerBusy: false, trendBusy: false, trendPeriod: 'month', trendData: null, relationshipRecords: null };
  const $ = id => document.getElementById(id);
  const root = () => $('company-workspace-root');
  const locale = () => (document.documentElement.lang || 'zh-CN').toLowerCase().startsWith('ja') ? 'ja' : ((document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'zh');
  const words = {
    zh: {businessTrends:'业务趋势',trendsTitle:'业务趋势与周期复盘',trendsSubtitle:'按周或月查看项目、任务和客户跟进活动',trendsLoading:'正在汇总业务趋势…',trendsLoadError:'业务趋势暂时无法读取',trendsWeek:'最近 8 周',trendsMonth:'最近 6 个月',trendsProjects:'项目趋势',trendsTasks:'任务趋势',trendsFollowups:'客户跟进趋势',trendsCreated:'新增',trendsCompleted:'完成',trendsRecorded:'跟进记录',trendsVsPrevious:'较上一周期',trendsIncrease:'增加',trendsDecrease:'减少',trendsNoChange:'持平',trendsNote:'完成项目/任务按当前已完成状态记录的最近更新时间估算，不代表精确完成日期；系统尚未保存状态变更历史。',trendsReview:'周期复盘',trendsCurrent:'本期截至今天',trendsPrevious:'上期',projectCustomerOverview:'项目与客户概况',pcOverviewTitle:'项目与客户业务概况',pcOverviewSubtitle:'查看项目状态、进度、客户项目组合与近期业务活动',pcLoading:'正在汇总项目与客户数据…',pcLoadError:'项目与客户概况暂时无法读取',pcProjects:'项目概况',pcCustomers:'客户项目组合',pcStatusDistribution:'项目状态分布',pcProgressOverview:'项目进度概览',pcAverageProgress:'平均项目进度',pcCompletedProjects:'已完成项目',pcOverdueProjects:'逾期项目',pcCustomerCoverage:'客户项目覆盖',pcCustomersWithProjects:'已有项目的客户',pcTaskCompletion:'任务完成情况',pcRecentActivity:'近期业务活动',pcNoProjects:'暂无项目',pcNoCustomers:'暂无客户',pcNoActivity:'暂无近期活动',pcProjectTaskSummary:'任务完成',pcOpen:'未完成',pcCompleted:'已完成',pcViewCustomer:'查看客户',pcViewProject:'查看项目',pcViewTask:'查看任务',pcViewFollowup:'查看跟进',  overview:'业务总览', todoCenter:'待办中心', todoCenterTitle:'待办事项中心', todoCenterSubtitle:'集中查看需要处理的任务与客户跟进', todoLoading:'正在整理待办事项…', todoLoadError:'待办事项暂时无法读取', todoEmpty:'目前没有需要处理的事项', todoOverdueTasks:'逾期任务', todoTodayTasks:'今日任务', todoUpcomingTasks:'未来 7 天任务', todoUndatedTasks:'未设置截止日期的任务', todoPendingFollowups:'待处理跟进', todoDueDate:'截止日期', todoProject:'所属项目', todoNextFollowup:'下次跟进', todoFollowupOverdue:'已逾期', todoFollowupToday:'今天', todoFollowupScheduled:'已安排', todoNoNextDate:'未设置下次跟进日期', todoOpenRecord:'打开记录', overviewTitle:'业务总览', overviewSubtitle:'快速了解当前业务状况与需要处理的事项', customersTotal:'客户总数', activeProjects:'进行中项目', unfinishedTasks:'未完成任务', pendingFollowups:'待处理跟进', needsAttention:'需要关注', overdueTasksCount:'逾期任务', dueTodayCount:'今日到期', dueNext7Count:'未来 7 天到期', overdueFollowups:'逾期待跟进', recentProjects:'最近更新项目', recentTasks:'最近任务', recentFollowups:'最近客户跟进', noRecent:'暂无记录', overviewLoading:'正在汇总业务数据…', overviewError:'业务总览暂时无法读取', incompleteData:'数据未能完整读取，请刷新重试', openTasks:'未完成', allFollowupDates:'全部跟进日期', overdueOnly:'仅逾期', customers:'客户', projects:'项目管理', tasks:'项目任务', followups:'业务跟进', project:'项目', task:'任务', followup:'跟进记录', newProject:'新增项目', newTask:'新增任务', newFollowup:'新增跟进', searchProject:'搜索项目名称', searchTask:'搜索任务名称', allTaskDueDates:'全部截止日期', overdueTasks:'逾期任务', dueToday:'今日到期', dueNext7Days:'未来 7 天', noDueDate:'无截止日期', noMatchingTasks:'没有符合当前筛选条件的任务', searchFollowup:'搜索跟进内容', allStatus:'全部状态', customer:'所属客户', chooseCustomer:'选择客户', status:'项目状态', planned:'计划中', active:'进行中', on_hold:'暂缓', completed:'已完成', cancelled:'已取消', prospect:'潜在客户', trade:'贸易', software:'软件开发', ecommerce:'电子商务', startDate:'开始日期', dueDate:'预计完成日期', description:'项目说明', save:'保存', cancel:'取消', edit:'编辑', delete:'删除', noProjects:'还没有项目', noTasks:'这个项目还没有任务', noFollowups:'还没有跟进记录', createProjectHint:'为客户建立第一个项目。', createTaskHint:'把项目拆分为可执行的任务。', createFollowupHint:'记录一次电话、邮件或会议跟进。', confirmDeleteProject:'确定删除这个项目吗？此操作无法撤销。', confirmDeleteTask:'确定删除这个任务吗？此操作无法撤销。', confirmDeleteFollowup:'确定删除这条跟进记录吗？此操作无法撤销。', method:'跟进方式', phone:'电话', email:'邮件', meeting:'会议', message:'即时消息', other:'其他', followupDate:'跟进时间', outcome:'跟进结果', nextDate:'下次跟进日期', notes:'备注', linkedProject:'关联项目（可选）', noProject:'不关联项目', pending:'待跟进', done:'已完成', next:'下一页', previous:'上一页', loading:'正在加载…', loaded:'已加载', failed:'操作失败，请稍后重试。', relationError:'该项目仍有关联的任务或跟进记录，请先调整或删除相关记录。', required:'请填写必填项目并选择客户。', customerMissing:'请先创建客户，再创建项目或跟进记录。', refresh:'刷新', allProjects:'全部项目', filterProject:'按项目筛选', projectTitle:'项目名称', followupTitle:'跟进主题', progress:'项目进度', progressPercent:'手动项目进度（0–100%）', progressMode:'进度计算方式', manualProgress:'手动设置', autoProgress:'按任务自动计算', progressAutoHint:'自动模式下，已完成任务数 ÷ 全部任务数 × 100%。', progressManualHint:'手动模式下，任务状态变化不会覆盖此进度。', viewDetails:'查看详情', projectDetails:'项目详情', manageTasks:'管理任务', taskTitle:'任务名称', taskProject:'所属项目', taskStatus:'任务状态', taskDue:'截止日期', todo:'待处理', in_progress:'进行中', blocked:'受阻', requiredTaskProject:'请选择所属项目。', invalidTaskStatus:'请选择有效的任务状态。', invalidProgress:'项目进度必须是 0 到 100 之间的整数。', close:'关闭', viewCustomer:'查看客户', viewProject:'查看项目', viewProjects:'查看项目', viewFollowups:'查看跟进', backToCustomer:'返回客户', backToProject:'返回项目', relatedCustomer:'关联客户', relatedProject:'关联项目', clearRelationFilter:'清除关联筛选', relatedTasks:'关联任务', relatedFollowups:'跟进记录', noRelatedRecords:'暂无关联记录', loadingRelations:'正在读取关联信息…', relationLoadFailed:'关联信息暂时无法读取。', rateLimited:'请求过于频繁，请等待约 1 分钟后再刷新。' },
    en: {businessTrends:'Business trends',trendsTitle:'Business trends and review',trendsSubtitle:'Review projects, tasks and customer follow-ups by week or month',trendsLoading:'Summarizing business trends…',trendsLoadError:'Business trends are temporarily unavailable',trendsWeek:'Last 8 weeks',trendsMonth:'Last 6 months',trendsProjects:'Project trends',trendsTasks:'Task trends',trendsFollowups:'Customer follow-up trends',trendsCreated:'Created',trendsCompleted:'Completed',trendsRecorded:'Follow-ups',trendsVsPrevious:'vs previous period',trendsIncrease:'Up',trendsDecrease:'Down',trendsNoChange:'No change',trendsNote:'Project/task completion is estimated from the latest updated_at of records currently marked completed. It is not an exact completion date; status-change history is not stored.',trendsReview:'Period review',trendsCurrent:'Current period to date',trendsPrevious:'Previous',projectCustomerOverview:'Project & customer overview',pcOverviewTitle:'Project and customer overview',pcOverviewSubtitle:'Explore project status, progress, customer portfolios and recent activity',pcLoading:'Summarizing project and customer data…',pcLoadError:'Project and customer overview is temporarily unavailable',pcProjects:'Project overview',pcCustomers:'Customer portfolios',pcStatusDistribution:'Project status distribution',pcProgressOverview:'Project progress',pcAverageProgress:'Average project progress',pcCompletedProjects:'Completed projects',pcOverdueProjects:'Overdue projects',pcCustomerCoverage:'Customer coverage',pcCustomersWithProjects:'Customers with projects',pcTaskCompletion:'Task completion',pcRecentActivity:'Recent business activity',pcNoProjects:'No projects yet',pcNoCustomers:'No customers yet',pcNoActivity:'No recent activity',pcProjectTaskSummary:'Tasks completed',pcOpen:'Open',pcCompleted:'Completed',pcViewCustomer:'View customer',pcViewProject:'View project',pcViewTask:'View task',pcViewFollowup:'View follow-up',  overview:'Business overview', todoCenter:'To-do center', todoCenterTitle:'To-do center', todoCenterSubtitle:'One place for tasks and customer follow-ups that need attention', todoLoading:'Loading to-do items…', todoLoadError:'To-do items are temporarily unavailable', todoEmpty:'Nothing needs your attention right now', todoOverdueTasks:'Overdue tasks', todoTodayTasks:'Tasks due today', todoUpcomingTasks:'Tasks due in the next 7 days', todoUndatedTasks:'Tasks without a due date', todoPendingFollowups:'Pending follow-ups', todoDueDate:'Due', todoProject:'Project', todoNextFollowup:'Next follow-up', todoFollowupOverdue:'Overdue', todoFollowupToday:'Today', todoFollowupScheduled:'Scheduled', todoNoNextDate:'No next date set', todoOpenRecord:'Open record', overviewTitle:'Business overview', overviewSubtitle:'A quick view of current business and items needing attention', customersTotal:'Customers', activeProjects:'Active projects', unfinishedTasks:'Open tasks', pendingFollowups:'Pending follow-ups', needsAttention:'Needs attention', overdueTasksCount:'Overdue tasks', dueTodayCount:'Due today', dueNext7Count:'Due in next 7 days', overdueFollowups:'Overdue follow-ups', recentProjects:'Recently updated projects', recentTasks:'Recent tasks', recentFollowups:'Recent customer follow-ups', noRecent:'No records yet', overviewLoading:'Loading business overview…', overviewError:'Business overview is temporarily unavailable', incompleteData:'Could not read all records. Please refresh.', openTasks:'Open', allFollowupDates:'All follow-up dates', overdueOnly:'Overdue only', customers:'Customers', projects:'Projects', tasks:'Project tasks', followups:'Business follow-ups', project:'Project', task:'Task', followup:'Follow-up', newProject:'New project', newTask:'New task', newFollowup:'New follow-up', searchProject:'Search project name', searchTask:'Search task name', allTaskDueDates:'All due dates', overdueTasks:'Overdue', dueToday:'Due today', dueNext7Days:'Next 7 days', noDueDate:'No due date', noMatchingTasks:'No tasks match the current filters', searchFollowup:'Search follow-up', allStatus:'All statuses', customer:'Customer', chooseCustomer:'Select customer', status:'Project status', planned:'Planned', active:'In progress', on_hold:'On hold', completed:'Completed', cancelled:'Cancelled', prospect:'Prospect', trade:'Trade', software:'Software', ecommerce:'E-commerce', startDate:'Start date', dueDate:'Target date', description:'Description', save:'Save', cancel:'Cancel', edit:'Edit', delete:'Delete', noProjects:'No projects yet', noTasks:'No tasks for this project yet', noFollowups:'No follow-ups yet', createProjectHint:'Create the first project for a customer.', createTaskHint:'Break this project into actionable tasks.', createFollowupHint:'Record a call, email or meeting.', confirmDeleteProject:'Delete this project? This cannot be undone.', confirmDeleteTask:'Delete this task? This cannot be undone.', confirmDeleteFollowup:'Delete this follow-up? This cannot be undone.', method:'Method', phone:'Phone', email:'Email', meeting:'Meeting', message:'Message', other:'Other', followupDate:'Follow-up time', outcome:'Outcome', nextDate:'Next follow-up date', notes:'Notes', linkedProject:'Related project (optional)', noProject:'No project', pending:'Pending', done:'Completed', next:'Next', previous:'Previous', loading:'Loading…', loaded:'Loaded', failed:'Operation failed. Please try again.', relationError:'This project still has linked tasks or follow-ups. Reassign or delete them first.', required:'Complete required fields and select a customer.', customerMissing:'Create a customer before adding projects or follow-ups.', refresh:'Refresh', allProjects:'All projects', filterProject:'Filter by project', projectTitle:'Project name', followupTitle:'Follow-up subject', progress:'Project progress', progressPercent:'Manual project progress (0–100%)', progressMode:'Progress calculation', manualProgress:'Manual', autoProgress:'Automatic from tasks', progressAutoHint:'Completed tasks ÷ all project tasks × 100%.', progressManualHint:'Task status changes will not overwrite this value in manual mode.', viewDetails:'View details', projectDetails:'Project details', manageTasks:'Manage tasks', taskTitle:'Task name', taskProject:'Project', taskStatus:'Task status', taskDue:'Due date', todo:'To do', in_progress:'In progress', blocked:'Blocked', requiredTaskProject:'Select a project for this task.', invalidTaskStatus:'Select a valid task status.', invalidProgress:'Progress must be a whole number from 0 to 100.', close:'Close', viewCustomer:'View customer', viewProject:'View project', viewProjects:'View projects', viewFollowups:'View follow-ups', backToCustomer:'Back to customer', backToProject:'Back to project', relatedCustomer:'Related customer', relatedProject:'Related project', clearRelationFilter:'Clear relation filter', relatedTasks:'Related tasks', relatedFollowups:'Follow-ups', noRelatedRecords:'No related records', loadingRelations:'Loading related information…', relationLoadFailed:'Related information is temporarily unavailable.', rateLimited:'Too many requests. Please wait about a minute and refresh.' },
    ja: {businessTrends:'業務トレンド',trendsTitle:'業務トレンドと期間レビュー',trendsSubtitle:'週次・月次でプロジェクト、タスク、顧客フォローを確認',trendsLoading:'業務トレンドを集計中…',trendsLoadError:'業務トレンドを一時的に読み込めません',trendsWeek:'直近8週間',trendsMonth:'直近6か月',trendsProjects:'プロジェクトの推移',trendsTasks:'タスクの推移',trendsFollowups:'顧客フォローの推移',trendsCreated:'新規',trendsCompleted:'完了',trendsRecorded:'フォロー記録',trendsVsPrevious:'前期間比',trendsIncrease:'増加',trendsDecrease:'減少',trendsNoChange:'変化なし',trendsNote:'完了数は現在完了状態のレコードの最終更新日時から推定しています。正確な完了日ではなく、状態変更履歴は保存されていません。',trendsReview:'期間レビュー',trendsCurrent:'今期（本日まで）',trendsPrevious:'前期',projectCustomerOverview:'プロジェクト・顧客概要',pcOverviewTitle:'プロジェクトと顧客の業務概要',pcOverviewSubtitle:'プロジェクトの状態・進捗、顧客別の案件構成、最近の活動を確認',pcLoading:'プロジェクトと顧客のデータを集計中…',pcLoadError:'プロジェクト・顧客概要を一時的に読み込めません',pcProjects:'プロジェクト概要',pcCustomers:'顧客別プロジェクト',pcStatusDistribution:'プロジェクト状態の分布',pcProgressOverview:'プロジェクト進捗',pcAverageProgress:'平均プロジェクト進捗',pcCompletedProjects:'完了プロジェクト',pcOverdueProjects:'期限超過プロジェクト',pcCustomerCoverage:'顧客カバレッジ',pcCustomersWithProjects:'プロジェクトを持つ顧客',pcTaskCompletion:'タスク完了状況',pcRecentActivity:'最近の業務活動',pcNoProjects:'プロジェクトはありません',pcNoCustomers:'顧客はありません',pcNoActivity:'最近の活動はありません',pcProjectTaskSummary:'タスク完了',pcOpen:'未完了',pcCompleted:'完了',pcViewCustomer:'顧客を見る',pcViewProject:'プロジェクトを見る',pcViewTask:'タスクを見る',pcViewFollowup:'フォローを見る',  overview:'業務概要', todoCenter:'To-doセンター', todoCenterTitle:'To-doセンター', todoCenterSubtitle:'対応が必要なタスクと顧客フォローを一か所で確認', todoLoading:'To-do項目を読み込み中…', todoLoadError:'To-do項目を一時的に読み込めません', todoEmpty:'現在、対応が必要な項目はありません', todoOverdueTasks:'期限超過タスク', todoTodayTasks:'今日が期限のタスク', todoUpcomingTasks:'今後7日間のタスク', todoUndatedTasks:'期限未設定のタスク', todoPendingFollowups:'未対応フォロー', todoDueDate:'期限', todoProject:'プロジェクト', todoNextFollowup:'次回フォロー', todoFollowupOverdue:'期限超過', todoFollowupToday:'今日', todoFollowupScheduled:'予定あり', todoNoNextDate:'次回日付未設定', todoOpenRecord:'記録を開く', overviewTitle:'業務概要', overviewSubtitle:'現在の業務状況と対応が必要な項目を確認', customersTotal:'顧客総数', activeProjects:'進行中プロジェクト', unfinishedTasks:'未完了タスク', pendingFollowups:'未対応フォロー', needsAttention:'要対応', overdueTasksCount:'期限超過タスク', dueTodayCount:'今日が期限', dueNext7Count:'今後7日間が期限', overdueFollowups:'期限超過フォロー', recentProjects:'最近更新したプロジェクト', recentTasks:'最近のタスク', recentFollowups:'最近の顧客フォロー', noRecent:'記録はありません', overviewLoading:'業務データを集計中…', overviewError:'業務概要を読み込めません', incompleteData:'全データを取得できませんでした。再読み込みしてください。', openTasks:'未完了', allFollowupDates:'すべてのフォロー日', overdueOnly:'期限超過のみ', customers:'顧客', projects:'プロジェクト管理', tasks:'プロジェクトタスク', followups:'業務フォロー', project:'プロジェクト', task:'タスク', followup:'フォロー記録', newProject:'プロジェクト追加', newTask:'タスク追加', newFollowup:'フォロー追加', searchProject:'プロジェクト名を検索', searchTask:'タスク名を検索', allTaskDueDates:'すべての期限', overdueTasks:'期限超過', dueToday:'今日が期限', dueNext7Days:'今後7日間', noDueDate:'期限なし', noMatchingTasks:'条件に一致するタスクはありません', searchFollowup:'フォロー内容を検索', allStatus:'すべての状態', customer:'顧客', chooseCustomer:'顧客を選択', status:'プロジェクト状態', planned:'予定', active:'進行中', on_hold:'保留', completed:'完了', cancelled:'中止', prospect:'見込み顧客', trade:'貿易', software:'ソフトウェア開発', ecommerce:'EC', startDate:'開始日', dueDate:'完了予定日', description:'説明', save:'保存', cancel:'キャンセル', edit:'編集', delete:'削除', noProjects:'プロジェクトはまだありません', noTasks:'このプロジェクトにはタスクがありません', noFollowups:'フォロー記録はまだありません', createProjectHint:'顧客の最初のプロジェクトを作成します。', createTaskHint:'プロジェクトを実行可能なタスクに分割します。', createFollowupHint:'電話、メール、会議の内容を記録します。', confirmDeleteProject:'このプロジェクトを削除しますか？元に戻せません。', confirmDeleteTask:'このタスクを削除しますか？元に戻せません。', confirmDeleteFollowup:'この記録を削除しますか？元に戻せません。', method:'方法', phone:'電話', email:'メール', meeting:'会議', message:'メッセージ', other:'その他', followupDate:'フォロー日時', outcome:'結果', nextDate:'次回フォロー日', notes:'メモ', linkedProject:'関連プロジェクト（任意）', noProject:'プロジェクトなし', pending:'未対応', done:'完了', next:'次へ', previous:'前へ', loading:'読み込み中…', loaded:'読み込み完了', failed:'処理に失敗しました。もう一度お試しください。', relationError:'タスクまたはフォロー記録が関連付けられています。先に関連を変更または削除してください。', required:'必須項目を入力し、顧客を選択してください。', customerMissing:'先に顧客を登録してください。', refresh:'更新', allProjects:'すべてのプロジェクト', filterProject:'プロジェクトで絞り込み', projectTitle:'プロジェクト名', followupTitle:'フォロー件名', progress:'進捗', progressPercent:'手動プロジェクト進捗（0～100%）', progressMode:'進捗の計算方法', manualProgress:'手動設定', autoProgress:'タスクから自動計算', progressAutoHint:'完了タスク数 ÷ 全タスク数 × 100%。', progressManualHint:'手動モードではタスク状態の変更で進捗は上書きされません。', viewDetails:'詳細を見る', projectDetails:'プロジェクト詳細', manageTasks:'タスク管理', taskTitle:'タスク名', taskProject:'所属プロジェクト', taskStatus:'タスク状態', taskDue:'期限', todo:'未着手', in_progress:'進行中', blocked:'ブロック中', requiredTaskProject:'所属プロジェクトを選択してください。', invalidTaskStatus:'有効なタスク状態を選択してください。', invalidProgress:'進捗は0～100の整数で入力してください。', close:'閉じる', viewCustomer:'顧客を見る', viewProject:'プロジェクトを見る', viewProjects:'プロジェクト一覧', viewFollowups:'フォローを見る', backToCustomer:'顧客に戻る', backToProject:'プロジェクトに戻る', relatedCustomer:'関連顧客', relatedProject:'関連プロジェクト', clearRelationFilter:'関連フィルターを解除', relatedTasks:'関連タスク', relatedFollowups:'フォロー記録', noRelatedRecords:'関連記録はありません', loadingRelations:'関連情報を読み込み中…', relationLoadFailed:'関連情報を一時的に読み込めません。', rateLimited:'リクエストが多すぎます。1分ほど待ってから更新してください。' }
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
      const error = new Error(payload.error === 'RECORD_IN_USE_OR_INVALID_RELATION' ? t('relationError') : (payload.error === 'AUTHENTICATION_FAILED' ? '账号验证失败，请重新登录。' : (response.status === 429 || payload.error === 'RATE_LIMITED' ? t('rateLimited') : t('failed'))));
      error.code = payload.error; throw error;
    }
    return payload.data;
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
    [['overview',t('overview')],['todos',t('todoCenter')],['projectCustomerOverview',t('projectCustomerOverview')],['businessTrends',t('businessTrends')],['customers',t('customers')],['projects',t('projects')],['tasks',t('tasks')],['followups',t('followups')]].forEach(([key,label]) => {
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
    trends.innerHTML = '<header class="cw-trends-heading"><div><h3 id="cw-trends-title"></h3><p id="cw-trends-subtitle"></p></div><button class="secondary" id="cw-trends-refresh" type="button"></button></header><div id="cw-trends-feedback" class="cw-feedback" role="status" aria-live="polite"></div><div class="cw-trends-controls"><div class="cw-trends-period" role="group" aria-label="Trend period"><button type="button" id="cw-trends-week" class="secondary"></button><button type="button" id="cw-trends-month" class="secondary"></button></div><p id="cw-trends-range" class="cw-trends-range"></p></div><section id="cw-trends-kpis" class="cw-trends-kpis"></section><section class="cw-trends-section"><h4 id="cw-trends-review-title"></h4><div id="cw-trends-review" class="cw-trends-review"></div></section><section class="cw-trends-section"><h4 id="cw-trends-projects-title"></h4><div id="cw-trends-projects" class="cw-trends-chart"></div></section><section class="cw-trends-section"><h4 id="cw-trends-tasks-title"></h4><div id="cw-trends-tasks" class="cw-trends-chart"></div></section><section class="cw-trends-section"><h4 id="cw-trends-followups-title"></h4><div id="cw-trends-followups" class="cw-trends-chart"></div></section><p id="cw-trends-note" class="cw-trends-note"></p>';
    const business = node('section', 'cw-panel cw-business-panel'); business.id = 'cw-business-panel';
    business.innerHTML = '<div class="cw-business-toolbar"><form id="cw-business-search" class="cw-search"><label class="sr-only" for="cw-business-query"></label><input id="cw-business-query" type="search" maxlength="100"><button class="secondary" type="submit">搜索</button></form><select id="cw-business-status" aria-label="' + escape(t('allStatus')) + '"></select><select id="cw-business-project-filter" aria-label="' + escape(t('taskProject')) + '" hidden></select><select id="cw-business-due-filter" aria-label="' + escape(t('taskDue')) + '" hidden></select><select id="cw-business-followup-due-filter" aria-label="' + escape(t('nextDate')) + '" hidden></select><button class="primary" id="cw-business-new" type="button"></button><button class="secondary" id="cw-business-refresh" type="button">' + escape(t('refresh')) + '</button></div><div id="cw-business-relation-context" class="cw-relation-context" hidden></div><div class="cw-feedback" id="cw-business-feedback" role="status" aria-live="polite"></div><div class="cw-business-list" id="cw-business-list"></div><nav class="cw-pagination" id="cw-business-pagination"></nav>';
    shell.insertBefore(nav, customerPanel); shell.insertBefore(overview, customerPanel); shell.insertBefore(todos, customerPanel); shell.insertBefore(projectCustomer, customerPanel); shell.insertBefore(trends, customerPanel); customerPanel.insertAdjacentElement('afterend', business);
    $('cw-overview-title').textContent = t('overviewTitle'); $('cw-overview-subtitle').textContent = t('overviewSubtitle'); $('cw-overview-refresh').textContent = t('refresh'); $('cw-overview-attention-title').textContent = t('needsAttention'); $('cw-overview-recent-title').textContent = t('recentProjects') + ' · ' + t('recentTasks') + ' · ' + t('recentFollowups');
    $('cw-overview-refresh').addEventListener('click', () => loadOverview(0));
    $('cw-todo-title').textContent=t('todoCenterTitle'); $('cw-todo-subtitle').textContent=t('todoCenterSubtitle'); $('cw-todo-refresh').textContent=t('refresh'); $('cw-todo-refresh').addEventListener('click',()=>loadTodoCenter(0));
    updateProjectCustomerLabels(); $('cw-pc-refresh').addEventListener('click', () => loadProjectCustomerOverview(0));
    updateBusinessTrendLabels(); $('cw-trends-refresh').addEventListener('click', () => loadBusinessTrends(0));
    $('cw-trends-week').addEventListener('click', () => setBusinessTrendPeriod('week'));
    $('cw-trends-month').addEventListener('click', () => setBusinessTrendPeriod('month'));
    const dialog = document.createElement('dialog'); dialog.className = 'cw-dialog'; dialog.id = 'cw-business-editor';
    dialog.innerHTML = '<form id="cw-business-form" class="cw-editor-form"><div class="cw-dialog-head"><div><p class="cw-eyebrow">BUSINESS RECORD</p><h2 id="cw-business-editor-title"></h2></div><button class="close-btn" id="cw-business-close" type="button" aria-label="Close">×</button></div><div id="cw-business-fields" class="cw-form-grid"></div><p class="cw-form-error" id="cw-business-error" role="alert"></p><div class="cw-dialog-actions"><button class="secondary" id="cw-business-cancel" type="button">' + escape(t('cancel')) + '</button><button class="primary" type="submit">' + escape(t('save')) + '</button></div></form>';
    host.append(dialog);
    const details = document.createElement('dialog'); details.className = 'cw-dialog cw-project-details-dialog'; details.id = 'cw-project-details';
    details.innerHTML = '<div class="cw-editor-form"><div class="cw-dialog-head"><div><p class="cw-eyebrow">PROJECT DETAILS</p><h2 id="cw-project-details-title"></h2></div><button class="close-btn" id="cw-project-details-close" type="button" aria-label="Close">×</button></div><div class="cw-project-detail-progress"><div class="cw-project-progress-label"><span id="cw-project-details-progress-label"></span><strong id="cw-project-details-progress-value"></strong></div><div class="cw-project-progress-track"><div class="cw-project-progress-fill" id="cw-project-details-progress-fill"></div></div></div><dl class="cw-project-detail-grid"><div><dt id="cw-project-details-customer-label"></dt><dd id="cw-project-details-customer"></dd></div><div><dt id="cw-project-details-status-label"></dt><dd id="cw-project-details-status"></dd></div><div><dt id="cw-project-details-start-label"></dt><dd id="cw-project-details-start"></dd></div><div><dt id="cw-project-details-due-label"></dt><dd id="cw-project-details-due"></dd></div><div class="cw-project-detail-description"><dt id="cw-project-details-description-label"></dt><dd id="cw-project-details-description"></dd></div></dl><div class="cw-project-related-grid"><section class="cw-project-related"><h3 id="cw-project-related-tasks-title"></h3><div id="cw-project-related-tasks" class="cw-related-list"></div></section><section class="cw-project-related"><h3 id="cw-project-related-followups-title"></h3><div id="cw-project-related-followups" class="cw-related-list"></div></section></div><div class="cw-dialog-actions"><button class="secondary" id="cw-project-details-customer-action" type="button"></button><button class="secondary" id="cw-project-details-tasks" type="button"></button><button class="secondary" id="cw-project-details-followups" type="button"></button><button class="secondary" id="cw-project-details-edit" type="button"></button><button class="primary" id="cw-project-details-close-action" type="button"></button></div></div>';
    host.append(details);
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
    $('cw-business-followup-due-filter').addEventListener('change', () => { state.followupDueFilter = $('cw-business-followup-due-filter').value; state.followupOffset = 0; loadActive(); });
    $('cw-business-new').addEventListener('click', () => openEditor());
    $('cw-business-refresh').addEventListener('click', () => loadActive({ force:true }));
    $('cw-business-form').addEventListener('submit', saveEditor);
    $('cw-business-close').addEventListener('click', closeEditor); $('cw-business-cancel').addEventListener('click', closeEditor);
    dialog.addEventListener('click', e => { if (e.target === dialog) closeEditor(); });
    window.addEventListener('planner-language-change', () => { $('cw-business-nav').querySelectorAll('button:not([data-company-extension])').forEach(b => { const labels={overview:'overview',todos:'todoCenter',projectCustomerOverview:'projectCustomerOverview',businessTrends:'businessTrends',customers:'customers',projects:'projects',tasks:'tasks',followups:'followups'}; b.textContent=t(labels[b.dataset.tab]||b.dataset.tab); }); if (state.tab === 'projectCustomerOverview') { updateProjectCustomerLabels(); loadProjectCustomerOverview(LOOKUP_MAX_AGE_MS); } else if (state.tab === 'businessTrends') { updateBusinessTrendLabels(); if(state.trendData) renderBusinessTrends(state.trendData); } else if (state.tab === 'overview') { $('cw-overview-title').textContent=t('overviewTitle'); $('cw-overview-subtitle').textContent=t('overviewSubtitle'); $('cw-overview-refresh').textContent=t('refresh'); $('cw-overview-attention-title').textContent=t('needsAttention'); $('cw-overview-recent-title').textContent=t('recentProjects')+' · '+t('recentTasks')+' · '+t('recentFollowups'); loadOverview(LOOKUP_MAX_AGE_MS); } else if (state.tab !== 'customers') { updateToolbar(); loadActive(); } });
  }
  function switchTab(tab) {
    state.tab = tab;
    $('cw-customer-panel').hidden = tab !== 'customers';
    $('cw-business-panel').hidden = !['projects','tasks','followups'].includes(tab);
    $('cw-business-overview').hidden = tab !== 'overview';
    $('cw-business-todos').hidden = tab !== 'todos';
    $('cw-business-project-customer').hidden = tab !== 'projectCustomerOverview';
    $('cw-business-trends').hidden = tab !== 'businessTrends';
    $('cw-business-nav').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
    // V10.56: extension panels (transactions / documents) own their own loading.
    window.dispatchEvent(new CustomEvent('company-business-tab-change', { detail: { tab } }));
    if (document.querySelector('[data-company-extension][data-tab="' + tab + '"]')) return;
    if (tab === 'overview') loadOverview();
    else if (tab === 'todos') loadTodoCenter();
    else if (tab === 'projectCustomerOverview') loadProjectCustomerOverview();
    else if (tab === 'businessTrends') loadBusinessTrends();
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
    const followupDueFilter = $('cw-business-followup-due-filter'); followupDueFilter.hidden = !followup;
    if (followup) followupDueFilter.innerHTML = selectOptions([['',t('allFollowupDates')],['overdue',t('overdueOnly')]],state.followupDueFilter);
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
      ['activeProjects',metrics.activeProjects,()=>{state.projectQuery='';state.projectCustomerFilter='';state.projectStatus='active';state.projectOffset=0;switchTab('projects');}],
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
  async function loadBusinessTrends(maxAgeMs=ENTRY_MAX_AGE_MS) {
    if(state.trendBusy)return;
    state.trendBusy=true;
    const feedback=$('cw-trends-feedback');feedback.classList.remove('error');feedback.textContent=t('trendsLoading');
    try {
      const [projects,tasks,followups]=await loadBusinessRecords(['project','task','follow_up'],maxAgeMs);
      state.trendData={projects,tasks,followups};
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
      ['projects',metrics.totalProjects,()=>{state.projectStatus='';state.projectCustomerFilter='';state.projectQuery='';state.projectOffset=0;switchTab('projects');}],
      ['pcAverageProgress',metrics.averageProgress+'%',()=>{state.projectStatus='';state.projectCustomerFilter='';state.projectQuery='';state.projectOffset=0;switchTab('projects');}],
      ['pcCompletedProjects',metrics.completedProjects,()=>{state.projectStatus='completed';state.projectCustomerFilter='';state.projectQuery='';state.projectOffset=0;switchTab('projects');}],
      ['pcOverdueProjects',metrics.overdueProjects,()=>{state.projectStatus='';state.projectCustomerFilter='';state.projectQuery='';state.projectOffset=0;switchTab('projects');}],
      ['pcCustomersWithProjects',metrics.customersWithProjects+'/'+metrics.totalCustomers,()=>{switchTab('customers');window.CompanyWebsite?.refresh?.();}],
      ['pcTaskCompletion',metrics.completedTasks+'/'+metrics.totalTasks,()=>{state.taskQuery='';state.taskStatus='completed';state.taskProjectFilter='';state.taskDueFilter='';state.taskOffset=0;switchTab('tasks');}]
    ].forEach(([label,value,action])=>{const card=button('', 'cw-pc-kpi',action);card.append(node('span','',t(label)),node('strong','',String(value)));kpis.append(card);});
    const status=$('cw-pc-status');status.replaceChildren();
    [['planned','planned'],['active','active'],['on_hold','on_hold'],['completed','completed'],['cancelled','cancelled']].forEach(([key,label])=>{
      const item=button('', 'cw-pc-status-card',()=>{state.projectStatus=key;state.projectCustomerFilter='';state.projectQuery='';state.projectOffset=0;switchTab('projects');});
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
      item.append(node('strong','',row.customer.title||'—'),node('span','',t('pcCustomersWithProjects')+': '+row.projectCount+' · '+t('activeProjects')+': '+row.activeProjectCount+' · '+t('pendingFollowups')+': '+row.followupCount));
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
      const relationFiltered = (project && state.projectCustomerFilter) || (state.tab === 'followups' && (state.followupCustomerFilter || state.followupProjectFilter || state.followupDueFilter));
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
          if (project && state.projectCustomerFilter) return record.parent_record_id === state.projectCustomerFilter;
          if (state.followupCustomerFilter && (data.customer_id || (record.related_record_ids || [])[0] || (state.customers.some(c=>c.id===record.parent_record_id) ? record.parent_record_id : '')) !== state.followupCustomerFilter) return false;
          if (state.followupProjectFilter && (data.project_id || (state.projects.some(p=>p.id===record.parent_record_id) ? record.parent_record_id : '')) !== state.followupProjectFilter) return false;
          if (state.followupDueFilter === 'overdue') return record.status === 'pending' && Boolean(data.next_follow_up_date) && String(data.next_follow_up_date).slice(0,10) < getLocalDateKey();
          return true;
        });
        total = records.length;
        const pageRecords = records.slice(offset, offset + PAGE_SIZE);
        if (project) state.projects = [...new Map([...state.projects, ...all.filter(item => item.record_type === 'project')].map(item => [item.id, item])).values()];
        else state.followups = records;
        $('cw-business-feedback').textContent = total ? t('loaded') + ' · ' + total : '';
        renderList(project, task, pageRecords, total, offset);
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
  function showCustomerProjects(id) { state.projectCustomerFilter = id || ''; state.projectOffset = 0; switchTab('projects'); }
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
      actions.append(button(t('edit'),'secondary',()=>openEditor(record)),button(t('delete'),'cw-delete',()=>removeRecord(record,project,task)));
      card.append(actions); host.append(card);
    });
    const pager = $('cw-business-pagination'); pager.replaceChildren();
    const pages = Math.max(1,Math.ceil(total/PAGE_SIZE)), current = Math.floor(offset/PAGE_SIZE)+1;
    if (pages > 1) pager.append(button(t('previous'),'secondary',()=>{setOffset(Math.max(0,offset-PAGE_SIZE));loadActive();}),node('span','',current+' / '+pages),button(t('next'),'secondary',()=>{setOffset(offset+PAGE_SIZE);loadActive();}));
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
  window.CompanyBusiness = Object.freeze({ refresh:loadActive, switchTab, showCustomerProjects, showCustomerFollowups, showProjectFollowups, showProjectTasks, openCustomer, openProject:openProjectById, openRelatedRecord, loadCustomerRelations, invalidateRelations, loadRecords:(type, maxAgeMs) => loadRecords(type, maxAgeMs) });
})();