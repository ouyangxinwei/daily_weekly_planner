(() => {
  'use strict';
  const API = 'company-api';
  const PROJECT_URL = 'https://kopvznygsqsheibsjjvv.supabase.co';
  const PAGE_SIZE = 20;
  const state = { tab: 'customers', verified: '', customers: [], projects: [], followups: [], tasks: [], projectOffset: 0, followupOffset: 0, taskOffset: 0, projectQuery: '', followupQuery: '', taskQuery: '', projectStatus: '', followupStatus: '', taskStatus: '', taskProjectFilter: '', projectCustomerFilter: '', followupCustomerFilter: '', editing: null, busy: false, followupProjectFilter: '', relationshipRecords: null, relationshipPromise: null };
  const $ = id => document.getElementById(id);
  const root = () => $('company-workspace-root');
  const locale = () => (document.documentElement.lang || 'zh-CN').toLowerCase().startsWith('ja') ? 'ja' : ((document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'zh');
  const words = {
    zh: { customers:'客户', projects:'项目管理', tasks:'项目任务', followups:'业务跟进', project:'项目', task:'任务', followup:'跟进记录', newProject:'新增项目', newTask:'新增任务', newFollowup:'新增跟进', searchProject:'搜索项目名称', searchTask:'搜索任务名称', searchFollowup:'搜索跟进内容', allStatus:'全部状态', customer:'所属客户', chooseCustomer:'选择客户', status:'项目状态', planned:'计划中', active:'进行中', on_hold:'暂缓', completed:'已完成', cancelled:'已取消', prospect:'潜在客户', trade:'贸易', software:'软件开发', ecommerce:'电子商务', startDate:'开始日期', dueDate:'预计完成日期', description:'项目说明', save:'保存', cancel:'取消', edit:'编辑', delete:'删除', noProjects:'还没有项目', noTasks:'这个项目还没有任务', noFollowups:'还没有跟进记录', createProjectHint:'为客户建立第一个项目。', createTaskHint:'把项目拆分为可执行的任务。', createFollowupHint:'记录一次电话、邮件或会议跟进。', confirmDeleteProject:'确定删除这个项目吗？此操作无法撤销。', confirmDeleteTask:'确定删除这个任务吗？此操作无法撤销。', confirmDeleteFollowup:'确定删除这条跟进记录吗？此操作无法撤销。', method:'跟进方式', phone:'电话', email:'邮件', meeting:'会议', message:'即时消息', other:'其他', followupDate:'跟进时间', outcome:'跟进结果', nextDate:'下次跟进日期', notes:'备注', linkedProject:'关联项目（可选）', noProject:'不关联项目', pending:'待跟进', done:'已完成', next:'下一页', previous:'上一页', loading:'正在加载…', loaded:'已加载', failed:'操作失败，请稍后重试。', relationError:'该项目仍有关联的任务或跟进记录，请先调整或删除相关记录。', required:'请填写必填项目并选择客户。', customerMissing:'请先创建客户，再创建项目或跟进记录。', refresh:'刷新', allProjects:'全部项目', filterProject:'按项目筛选', projectTitle:'项目名称', followupTitle:'跟进主题', progress:'项目进度', progressPercent:'手动项目进度（0–100%）', progressMode:'进度计算方式', manualProgress:'手动设置', autoProgress:'按任务自动计算', progressAutoHint:'自动模式下，已完成任务数 ÷ 全部任务数 × 100%。', progressManualHint:'手动模式下，任务状态变化不会覆盖此进度。', viewDetails:'查看详情', projectDetails:'项目详情', manageTasks:'管理任务', taskTitle:'任务名称', taskProject:'所属项目', taskStatus:'任务状态', taskDue:'截止日期', todo:'待处理', in_progress:'进行中', blocked:'受阻', requiredTaskProject:'请选择所属项目。', invalidTaskStatus:'请选择有效的任务状态。', invalidProgress:'项目进度必须是 0 到 100 之间的整数。', close:'关闭', viewCustomer:'查看客户', viewProject:'查看项目', viewProjects:'查看项目', viewFollowups:'查看跟进', backToCustomer:'返回客户', backToProject:'返回项目', relatedCustomer:'关联客户', relatedProject:'关联项目', clearRelationFilter:'清除关联筛选', relatedTasks:'关联任务', relatedFollowups:'跟进记录', noRelatedRecords:'暂无关联记录', loadingRelations:'正在读取关联信息…', relationLoadFailed:'关联信息暂时无法读取。' },
    en: { customers:'Customers', projects:'Projects', tasks:'Project tasks', followups:'Business follow-ups', project:'Project', task:'Task', followup:'Follow-up', newProject:'New project', newTask:'New task', newFollowup:'New follow-up', searchProject:'Search project name', searchTask:'Search task name', searchFollowup:'Search follow-up', allStatus:'All statuses', customer:'Customer', chooseCustomer:'Select customer', status:'Project status', planned:'Planned', active:'In progress', on_hold:'On hold', completed:'Completed', cancelled:'Cancelled', prospect:'Prospect', trade:'Trade', software:'Software', ecommerce:'E-commerce', startDate:'Start date', dueDate:'Target date', description:'Description', save:'Save', cancel:'Cancel', edit:'Edit', delete:'Delete', noProjects:'No projects yet', noTasks:'No tasks for this project yet', noFollowups:'No follow-ups yet', createProjectHint:'Create the first project for a customer.', createTaskHint:'Break this project into actionable tasks.', createFollowupHint:'Record a call, email or meeting.', confirmDeleteProject:'Delete this project? This cannot be undone.', confirmDeleteTask:'Delete this task? This cannot be undone.', confirmDeleteFollowup:'Delete this follow-up? This cannot be undone.', method:'Method', phone:'Phone', email:'Email', meeting:'Meeting', message:'Message', other:'Other', followupDate:'Follow-up time', outcome:'Outcome', nextDate:'Next follow-up date', notes:'Notes', linkedProject:'Related project (optional)', noProject:'No project', pending:'Pending', done:'Completed', next:'Next', previous:'Previous', loading:'Loading…', loaded:'Loaded', failed:'Operation failed. Please try again.', relationError:'This project still has linked tasks or follow-ups. Reassign or delete them first.', required:'Complete required fields and select a customer.', customerMissing:'Create a customer before adding projects or follow-ups.', refresh:'Refresh', allProjects:'All projects', filterProject:'Filter by project', projectTitle:'Project name', followupTitle:'Follow-up subject', progress:'Project progress', progressPercent:'Manual project progress (0–100%)', progressMode:'Progress calculation', manualProgress:'Manual', autoProgress:'Automatic from tasks', progressAutoHint:'Completed tasks ÷ all project tasks × 100%.', progressManualHint:'Task status changes will not overwrite this value in manual mode.', viewDetails:'View details', projectDetails:'Project details', manageTasks:'Manage tasks', taskTitle:'Task name', taskProject:'Project', taskStatus:'Task status', taskDue:'Due date', todo:'To do', in_progress:'In progress', blocked:'Blocked', requiredTaskProject:'Select a project for this task.', invalidTaskStatus:'Select a valid task status.', invalidProgress:'Progress must be a whole number from 0 to 100.', close:'Close', viewCustomer:'View customer', viewProject:'View project', viewProjects:'View projects', viewFollowups:'View follow-ups', backToCustomer:'Back to customer', backToProject:'Back to project', relatedCustomer:'Related customer', relatedProject:'Related project', clearRelationFilter:'Clear relation filter', relatedTasks:'Related tasks', relatedFollowups:'Follow-ups', noRelatedRecords:'No related records', loadingRelations:'Loading related information…', relationLoadFailed:'Related information is temporarily unavailable.' },
    ja: { customers:'顧客', projects:'プロジェクト管理', tasks:'プロジェクトタスク', followups:'業務フォロー', project:'プロジェクト', task:'タスク', followup:'フォロー記録', newProject:'プロジェクト追加', newTask:'タスク追加', newFollowup:'フォロー追加', searchProject:'プロジェクト名を検索', searchTask:'タスク名を検索', searchFollowup:'フォロー内容を検索', allStatus:'すべての状態', customer:'顧客', chooseCustomer:'顧客を選択', status:'プロジェクト状態', planned:'予定', active:'進行中', on_hold:'保留', completed:'完了', cancelled:'中止', prospect:'見込み顧客', trade:'貿易', software:'ソフトウェア開発', ecommerce:'EC', startDate:'開始日', dueDate:'完了予定日', description:'説明', save:'保存', cancel:'キャンセル', edit:'編集', delete:'削除', noProjects:'プロジェクトはまだありません', noTasks:'このプロジェクトにはタスクがありません', noFollowups:'フォロー記録はまだありません', createProjectHint:'顧客の最初のプロジェクトを作成します。', createTaskHint:'プロジェクトを実行可能なタスクに分割します。', createFollowupHint:'電話、メール、会議の内容を記録します。', confirmDeleteProject:'このプロジェクトを削除しますか？元に戻せません。', confirmDeleteTask:'このタスクを削除しますか？元に戻せません。', confirmDeleteFollowup:'この記録を削除しますか？元に戻せません。', method:'方法', phone:'電話', email:'メール', meeting:'会議', message:'メッセージ', other:'その他', followupDate:'フォロー日時', outcome:'結果', nextDate:'次回フォロー日', notes:'メモ', linkedProject:'関連プロジェクト（任意）', noProject:'プロジェクトなし', pending:'未対応', done:'完了', next:'次へ', previous:'前へ', loading:'読み込み中…', loaded:'読み込み完了', failed:'処理に失敗しました。もう一度お試しください。', relationError:'タスクまたはフォロー記録が関連付けられています。先に関連を変更または削除してください。', required:'必須項目を入力し、顧客を選択してください。', customerMissing:'先に顧客を登録してください。', refresh:'更新', allProjects:'すべてのプロジェクト', filterProject:'プロジェクトで絞り込み', projectTitle:'プロジェクト名', followupTitle:'フォロー件名', progress:'進捗', progressPercent:'手動プロジェクト進捗（0～100%）', progressMode:'進捗の計算方法', manualProgress:'手動設定', autoProgress:'タスクから自動計算', progressAutoHint:'完了タスク数 ÷ 全タスク数 × 100%。', progressManualHint:'手動モードではタスク状態の変更で進捗は上書きされません。', viewDetails:'詳細を見る', projectDetails:'プロジェクト詳細', manageTasks:'タスク管理', taskTitle:'タスク名', taskProject:'所属プロジェクト', taskStatus:'タスク状態', taskDue:'期限', todo:'未着手', in_progress:'進行中', blocked:'ブロック中', requiredTaskProject:'所属プロジェクトを選択してください。', invalidTaskStatus:'有効なタスク状態を選択してください。', invalidProgress:'進捗は0～100の整数で入力してください。', close:'閉じる', viewCustomer:'顧客を見る', viewProject:'プロジェクトを見る', viewProjects:'プロジェクト一覧', viewFollowups:'フォローを見る', backToCustomer:'顧客に戻る', backToProject:'プロジェクトに戻る', relatedCustomer:'関連顧客', relatedProject:'関連プロジェクト', clearRelationFilter:'関連フィルターを解除', relatedTasks:'関連タスク', relatedFollowups:'フォロー記録', noRelatedRecords:'関連記録はありません', loadingRelations:'関連情報を読み込み中…', relationLoadFailed:'関連情報を一時的に読み込めません。' }
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
      const error = new Error(payload.error === 'RECORD_IN_USE_OR_INVALID_RELATION' ? t('relationError') : (payload.error === 'AUTHENTICATION_FAILED' ? '账号验证失败，请重新登录。' : t('failed')));
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
    [['customers',t('customers')],['projects',t('projects')],['tasks',t('tasks')],['followups',t('followups')]].forEach(([key,label]) => {
      const b = button(label, 'cw-business-tab', () => switchTab(key)); b.dataset.tab = key; nav.append(b);
    });
    const customerPanel = host.querySelector('.cw-panel'); customerPanel.id = 'cw-customer-panel';
    const business = node('section', 'cw-panel cw-business-panel'); business.id = 'cw-business-panel';
    business.innerHTML = '<div class="cw-business-toolbar"><form id="cw-business-search" class="cw-search"><label class="sr-only" for="cw-business-query"></label><input id="cw-business-query" type="search" maxlength="100"><button class="secondary" type="submit">搜索</button></form><select id="cw-business-status" aria-label="' + escape(t('allStatus')) + '"></select><select id="cw-business-project-filter" aria-label="' + escape(t('taskProject')) + '" hidden></select><button class="primary" id="cw-business-new" type="button"></button><button class="secondary" id="cw-business-refresh" type="button">' + escape(t('refresh')) + '</button></div><div class="cw-feedback" id="cw-business-feedback" role="status" aria-live="polite"></div><div class="cw-business-list" id="cw-business-list"></div><nav class="cw-pagination" id="cw-business-pagination"></nav>';
    shell.insertBefore(nav, customerPanel); customerPanel.insertAdjacentElement('afterend', business);
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
    $('cw-business-project-filter').addEventListener('change', () => { if (state.tab === 'tasks') { state.taskProjectFilter = $('cw-business-project-filter').value; state.taskOffset = 0; } else { state.followupProjectFilter = $('cw-business-project-filter').value; state.followupOffset = 0; } loadActive(); });
    $('cw-business-new').addEventListener('click', () => openEditor());
    $('cw-business-refresh').addEventListener('click', loadActive);
    $('cw-business-form').addEventListener('submit', saveEditor);
    $('cw-business-close').addEventListener('click', closeEditor); $('cw-business-cancel').addEventListener('click', closeEditor);
    dialog.addEventListener('click', e => { if (e.target === dialog) closeEditor(); });
    window.addEventListener('planner-language-change', () => { if (state.tab !== 'customers') { updateToolbar(); loadActive(); } });
  }
  function switchTab(tab) {
    state.tab = tab;
    $('cw-customer-panel').hidden = tab !== 'customers';
    $('cw-business-panel').hidden = tab === 'customers';
    $('cw-business-nav').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
    if (tab !== 'customers') { updateToolbar(); loadActive(); }
  }
  function setOffset(value) { if (state.tab === 'projects') state.projectOffset = value; else if (state.tab === 'tasks') state.taskOffset = value; else state.followupOffset = value; }
  function updateToolbar() {
    const project = state.tab === 'projects', task = state.tab === 'tasks', followup = state.tab === 'followups';
    $('cw-business-query').placeholder = t(project ? 'searchProject' : task ? 'searchTask' : 'searchFollowup');
    $('cw-business-query').value = project ? state.projectQuery : task ? state.taskQuery : state.followupQuery;
    $('cw-business-search').querySelector('button').textContent = locale() === 'en' ? 'Search' : locale() === 'ja' ? '検索' : '搜索';
    $('cw-business-new').textContent = '＋ ' + t(project ? 'newProject' : task ? 'newTask' : 'newFollowup');
    const status = $('cw-business-status'), current = project ? state.projectStatus : task ? state.taskStatus : state.followupStatus;
    const choices = project ? [['',t('allStatus')],['planned',t('planned')],['active',t('active')],['on_hold',t('on_hold')],['completed',t('completed')],['cancelled',t('cancelled')]] : task ? [['',t('allStatus')],['todo',t('todo')],['in_progress',t('in_progress')],['blocked',t('blocked')],['completed',t('done')]] : [['',t('allStatus')],['pending',t('pending')],['completed',t('done')]];
    status.innerHTML = selectOptions(choices, current);
    const projectFilter = $('cw-business-project-filter'); projectFilter.hidden = !(task || followup);
    if (task || followup) projectFilter.innerHTML = selectOptions([['',t('allProjects')],...state.projects.map(p=>[p.id,p.title])],task ? state.taskProjectFilter : state.followupProjectFilter);
  }
  async function fetchAllRecords(type) {
    const items=[]; let offset=0,total=0;
    do {
      const params=new URLSearchParams({record_type:type,limit:'100',offset:String(offset)});
      const result=await api('/records?'+params.toString());
      const page=Array.isArray(result?.items)?result.items:[];
      items.push(...page); total=Number(result?.total||0); offset+=page.length;
      if(!page.length)break;
    } while(offset<total && offset<10000);
    return items;
  }
  async function getRelationshipRecords() {
    if(state.relationshipRecords)return state.relationshipRecords;
    if(!state.relationshipPromise){
      state.relationshipPromise=Promise.all(['project','task','follow_up'].map(fetchAllRecords)).then(([projects,tasks,followups])=>{
        state.relationshipRecords={projects,tasks,followups};
        state.projects=[...new Map([...state.projects,...projects].map(item=>[item.id,item])).values()];
        return state.relationshipRecords;
      }).catch(error=>{state.relationshipPromise=null;throw error;});
    }
    return state.relationshipPromise;
  }
  async function loadCustomerRelations(customers) {
    const summaries={}; (customers||[]).forEach(customer=>summaries[customer.id]={projects:[],tasks:[],followups:[]});
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
    } catch(error) { console.warn('Unable to load company relationship summaries',error); }
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
  function invalidateRelations(){state.relationshipRecords=null;state.relationshipPromise=null;}
  function renderProjectRelations(projectId) {
    const tasksHost=$('cw-project-related-tasks'),followupsHost=$('cw-project-related-followups');
    tasksHost.replaceChildren(node('p','cw-related-empty',t('loadingRelations')));
    followupsHost.replaceChildren(node('p','cw-related-empty',t('loadingRelations')));
    loadProjectRelations(projectId).then(({tasks,followups})=>{
      if($('cw-project-details').dataset.projectId!==projectId)return;
      tasksHost.replaceChildren(); if(!tasks.length)tasksHost.append(node('p','cw-related-empty',t('noRelatedRecords')));
      tasks.slice(0,6).forEach(task=>{const data=task.data&&typeof task.data==='object'?task.data:{};const row=node('div','cw-related-row');row.append(node('strong','',task.title||t('task')),node('span','cw-related-meta',(t(task.status)||task.status||'—')+(task.due_date?' · '+t('taskDue')+': '+dateText(task.due_date):'')));if(data.description)row.append(node('p','cw-related-note',data.description));tasksHost.append(row);});
      if(tasks.length>6)tasksHost.append(node('p','cw-related-more','+'+(tasks.length-6)));
      followupsHost.replaceChildren(); if(!followups.length)followupsHost.append(node('p','cw-related-empty',t('noRelatedRecords')));
      followups.slice(0,6).forEach(record=>{const data=record.data&&typeof record.data==='object'?record.data:{};const row=node('div','cw-related-row');row.append(node('strong','',record.title||t('followup')),node('span','cw-related-meta',dateText(record.record_date)+' · '+(t(record.status)||record.status||'—')));if(data.outcome)row.append(node('p','cw-related-note',data.outcome));followupsHost.append(row);});
      if(followups.length>6)followupsHost.append(node('p','cw-related-more','+'+(followups.length-6)));
    }).catch(()=>{tasksHost.replaceChildren(node('p','cw-related-empty',t('relationLoadFailed')));followupsHost.replaceChildren(node('p','cw-related-empty',t('relationLoadFailed')));});
  }
  async function loadCustomers() {
    const result = await api('/customers?limit=100&offset=0');
    state.customers = Array.isArray(result?.items) ? result.items : [];
    const projects = await api('/records?record_type=project&limit=100&offset=0');
    state.projects = Array.isArray(projects?.items) ? projects.items : [];
  }
  async function loadActive() {
    if (state.busy || state.tab === 'customers') return;
    state.busy = true; $('cw-business-feedback').textContent = t('loading');
    try {
      await loadCustomers();
      const project = state.tab === 'projects', task = state.tab === 'tasks', type = project ? 'project' : task ? 'task' : 'follow_up';
      if (task || state.tab === 'followups') updateToolbar();
      const offset = project ? state.projectOffset : task ? state.taskOffset : state.followupOffset;
      const query = project ? state.projectQuery : task ? state.taskQuery : state.followupQuery;
      const status = project ? state.projectStatus : task ? state.taskStatus : state.followupStatus;
      const relationFiltered = (project && state.projectCustomerFilter) || (state.tab === 'followups' && (state.followupCustomerFilter || state.followupProjectFilter));
      let records = [], total = 0;
      if (relationFiltered) {
        const all = []; let pageOffset = 0, reportedTotal = 0;
        do {
          const params = new URLSearchParams({ record_type:type, limit:'100', offset:String(pageOffset) });
          if (query) params.set('q', query); if (status) params.set('status', status);
          const result = await api('/records?' + params.toString());
          const items = Array.isArray(result?.items) ? result.items : [];
          all.push(...items); reportedTotal = Number(result?.total || 0); pageOffset += items.length;
          if (!items.length) break;
        } while (pageOffset < reportedTotal);
        records = all.filter(record => {
          const data = record.data && typeof record.data === 'object' ? record.data : {};
          if (project && state.projectCustomerFilter) return record.parent_record_id === state.projectCustomerFilter;
          if (state.followupCustomerFilter) return (data.customer_id || (record.related_record_ids || [])[0] || (state.customers.some(c=>c.id===record.parent_record_id) ? record.parent_record_id : '')) === state.followupCustomerFilter;
          if (state.followupProjectFilter) return (data.project_id || (state.projects.some(p=>p.id===record.parent_record_id) ? record.parent_record_id : '')) === state.followupProjectFilter;
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
    finally { state.busy = false; }
  }
  function customerName(id) { return state.customers.find(c => c.id === id)?.title || '—'; }
  function openCustomer(id) { const customer = state.customers.find(c => c.id === id); switchTab('customers'); if (customer && window.CompanyWebsite?.focusCustomer) window.CompanyWebsite.focusCustomer(id); else if (window.CompanyWebsite?.focusCustomer) window.CompanyWebsite.focusCustomer(id); }
  function showCustomerProjects(id) { state.projectCustomerFilter = id || ''; state.projectOffset = 0; switchTab('projects'); }
  function showCustomerFollowups(id) { state.followupCustomerFilter = id || ''; state.followupProjectFilter = ''; state.followupOffset = 0; switchTab('followups'); }
  function showProjectFollowups(id) { state.followupProjectFilter = id || ''; state.followupCustomerFilter = ''; state.followupOffset = 0; switchTab('followups'); }
  function showProjectTasks(id) { state.taskProjectFilter = id || ''; state.taskOffset = 0; switchTab('tasks'); }
  function projectName(id) { return state.projects.find(p => p.id === id)?.title || '—'; }
  function renderList(project, task, records, total, offset) {
    const host = $('cw-business-list'); host.replaceChildren();
    if (!records.length) {
      const empty = node('div','cw-empty'); node('div','cw-empty-icon','◇'); empty.append(node('div','cw-empty-icon','◇'),node('h3','',t(project?'noProjects':task?'noTasks':'noFollowups')),node('p','',t(project?'createProjectHint':task?'createTaskHint':'createFollowupHint')),button('＋ '+t(project?'newProject':task?'newTask':'newFollowup'),'primary',()=>openEditor())); host.append(empty);
    } else records.forEach(record => {
      const card = node('article','cw-business-card'), main = node('div','cw-business-main');
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
    try { if (id) { const patch = { ...payload }; delete patch.record_type; await api('/records/'+encodeURIComponent(id),'PATCH',patch); } else await api('/records','POST',payload); $('cw-business-editor').close(); state.editing=null; invalidateRelations(); await loadActive(); }
    catch (error) { $('cw-business-error').textContent = error.message || t('failed'); }
  }
  async function removeRecord(record, project, task) {
    if (!window.confirm(t(project?'confirmDeleteProject':task?'confirmDeleteTask':'confirmDeleteFollowup')+'\n'+record.title)) return;
    try { await api('/records/'+encodeURIComponent(record.id),'DELETE'); invalidateRelations(); await loadActive(); }
    catch (error) { $('cw-business-feedback').textContent = error.message || t('failed'); $('cw-business-feedback').classList.add('error'); }
  }
  function closeEditor() { $('cw-business-editor').close(); state.editing=null; }
  function init() {
    if (!root()) return;
    install();
    window.addEventListener('planner-workspace-change', () => { if (document.documentElement.dataset.workspace === 'company' && state.tab !== 'customers') loadActive(); });
    window.addEventListener('planner-auth-change', () => { state.verified=''; invalidateRelations(); if (state.tab !== 'customers' && document.documentElement.dataset.workspace === 'company') loadActive(); });
    switchTab('customers');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
  window.CompanyBusiness = Object.freeze({ refresh:loadActive, switchTab, showCustomerProjects, showCustomerFollowups, showProjectFollowups, showProjectTasks, openCustomer, openProject:openProjectById, loadCustomerRelations, invalidateRelations });
})();