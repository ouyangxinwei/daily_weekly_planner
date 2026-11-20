(() => {
  'use strict';
  const API = 'company-api';
  const PROJECT_URL = 'https://kopvznygsqsheibsjjvv.supabase.co';
  const PAGE_SIZE = 20;
  const state = { tab: 'customers', verified: '', customers: [], projects: [], followups: [], projectOffset: 0, followupOffset: 0, projectQuery: '', followupQuery: '', projectStatus: '', followupStatus: '', editing: null, busy: false, followupProjectFilter: '' };
  const $ = id => document.getElementById(id);
  const root = () => $('company-workspace-root');
  const locale = () => (document.documentElement.lang || 'zh-CN').toLowerCase().startsWith('ja') ? 'ja' : ((document.documentElement.lang || '').toLowerCase().startsWith('en') ? 'en' : 'zh');
  const words = {
    zh: { customers:'客户', projects:'项目管理', followups:'业务跟进', project:'项目', followup:'跟进记录', newProject:'新增项目', newFollowup:'新增跟进', searchProject:'搜索项目名称', searchFollowup:'搜索跟进内容', allStatus:'全部状态', customer:'所属客户', chooseCustomer:'选择客户', status:'项目状态', planned:'计划中', active:'进行中', on_hold:'暂缓', completed:'已完成', cancelled:'已取消', prospect:'潜在客户', trade:'贸易', software:'软件开发', ecommerce:'电子商务', startDate:'开始日期', dueDate:'预计完成日期', description:'项目说明', save:'保存', cancel:'取消', edit:'编辑', delete:'删除', noProjects:'还没有项目', noFollowups:'还没有跟进记录', createProjectHint:'为客户建立第一个项目。', createFollowupHint:'记录一次电话、邮件或会议跟进。', confirmDeleteProject:'确定删除这个项目吗？此操作无法撤销。', confirmDeleteFollowup:'确定删除这条跟进记录吗？此操作无法撤销。', method:'跟进方式', phone:'电话', email:'邮件', meeting:'会议', message:'即时消息', other:'其他', followupDate:'跟进时间', outcome:'跟进结果', nextDate:'下次跟进日期', notes:'备注', linkedProject:'关联项目（可选）', noProject:'不关联项目', pending:'待跟进', done:'已完成', next:'下一页', previous:'上一页', loading:'正在加载…', loaded:'已加载', failed:'操作失败，请稍后重试。', relationError:'该项目仍有关联的跟进记录，请先调整或删除跟进记录。', required:'请填写必填项目并选择客户。', customerMissing:'请先创建客户，再创建项目或跟进记录。', refresh:'刷新', allProjects:'全部项目', filterProject:'按项目筛选', projectTitle:'项目名称', followupTitle:'跟进主题' },
    en: { customers:'Customers', projects:'Projects', followups:'Business follow-ups', project:'Project', followup:'Follow-up', newProject:'New project', newFollowup:'New follow-up', searchProject:'Search project name', searchFollowup:'Search follow-up', allStatus:'All statuses', customer:'Customer', chooseCustomer:'Select customer', status:'Project status', planned:'Planned', active:'In progress', on_hold:'On hold', completed:'Completed', cancelled:'Cancelled', prospect:'Prospect', trade:'Trade', software:'Software', ecommerce:'E-commerce', startDate:'Start date', dueDate:'Target date', description:'Description', save:'Save', cancel:'Cancel', edit:'Edit', delete:'Delete', noProjects:'No projects yet', noFollowups:'No follow-ups yet', createProjectHint:'Create the first project for a customer.', createFollowupHint:'Record a call, email or meeting.', confirmDeleteProject:'Delete this project? This cannot be undone.', confirmDeleteFollowup:'Delete this follow-up? This cannot be undone.', method:'Method', phone:'Phone', email:'Email', meeting:'Meeting', message:'Message', other:'Other', followupDate:'Follow-up time', outcome:'Outcome', nextDate:'Next follow-up date', notes:'Notes', linkedProject:'Related project (optional)', noProject:'No project', pending:'Pending', done:'Completed', next:'Next', previous:'Previous', loading:'Loading…', loaded:'Loaded', failed:'Operation failed. Please try again.', relationError:'This project still has linked follow-ups. Reassign or delete them first.', required:'Complete required fields and select a customer.', customerMissing:'Create a customer before adding projects or follow-ups.', refresh:'Refresh', allProjects:'All projects', filterProject:'Filter by project', projectTitle:'Project name', followupTitle:'Follow-up subject' },
    ja: { customers:'顧客', projects:'プロジェクト管理', followups:'業務フォロー', project:'プロジェクト', followup:'フォロー記録', newProject:'プロジェクト追加', newFollowup:'フォロー追加', searchProject:'プロジェクト名を検索', searchFollowup:'フォロー内容を検索', allStatus:'すべての状態', customer:'顧客', chooseCustomer:'顧客を選択', status:'プロジェクト状態', planned:'予定', active:'進行中', on_hold:'保留', completed:'完了', cancelled:'中止', prospect:'見込み顧客', trade:'貿易', software:'ソフトウェア開発', ecommerce:'EC', startDate:'開始日', dueDate:'完了予定日', description:'説明', save:'保存', cancel:'キャンセル', edit:'編集', delete:'削除', noProjects:'プロジェクトはまだありません', noFollowups:'フォロー記録はまだありません', createProjectHint:'顧客の最初のプロジェクトを作成します。', createFollowupHint:'電話、メール、会議の内容を記録します。', confirmDeleteProject:'このプロジェクトを削除しますか？元に戻せません。', confirmDeleteFollowup:'この記録を削除しますか？元に戻せません。', method:'方法', phone:'電話', email:'メール', meeting:'会議', message:'メッセージ', other:'その他', followupDate:'フォロー日時', outcome:'結果', nextDate:'次回フォロー日', notes:'メモ', linkedProject:'関連プロジェクト（任意）', noProject:'プロジェクトなし', pending:'未対応', done:'完了', next:'次へ', previous:'前へ', loading:'読み込み中…', loaded:'読み込み完了', failed:'処理に失敗しました。もう一度お試しください。', relationError:'フォロー記録が関連付けられています。先に関連を変更または削除してください。', required:'必須項目を入力し、顧客を選択してください。', customerMissing:'先に顧客を登録してください。', refresh:'更新', allProjects:'すべてのプロジェクト', filterProject:'プロジェクトで絞り込み', projectTitle:'プロジェクト名', followupTitle:'フォロー件名' }
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
    [['customers',t('customers')],['projects',t('projects')],['followups',t('followups')]].forEach(([key,label]) => {
      const b = button(label, 'cw-business-tab', () => switchTab(key)); b.dataset.tab = key; nav.append(b);
    });
    const customerPanel = host.querySelector('.cw-panel'); customerPanel.id = 'cw-customer-panel';
    const business = node('section', 'cw-panel cw-business-panel'); business.id = 'cw-business-panel';
    business.innerHTML = '<div class="cw-business-toolbar"><form id="cw-business-search" class="cw-search"><label class="sr-only" for="cw-business-query"></label><input id="cw-business-query" type="search" maxlength="100"><button class="secondary" type="submit">搜索</button></form><select id="cw-business-status" aria-label="' + escape(t('allStatus')) + '"></select><button class="primary" id="cw-business-new" type="button"></button><button class="secondary" id="cw-business-refresh" type="button">' + escape(t('refresh')) + '</button></div><div class="cw-feedback" id="cw-business-feedback" role="status" aria-live="polite"></div><div class="cw-business-list" id="cw-business-list"></div><nav class="cw-pagination" id="cw-business-pagination"></nav>';
    shell.insertBefore(nav, customerPanel); customerPanel.insertAdjacentElement('afterend', business);
    const dialog = document.createElement('dialog'); dialog.className = 'cw-dialog'; dialog.id = 'cw-business-editor';
    dialog.innerHTML = '<form id="cw-business-form" class="cw-editor-form"><div class="cw-dialog-head"><div><p class="cw-eyebrow">BUSINESS RECORD</p><h2 id="cw-business-editor-title"></h2></div><button class="close-btn" id="cw-business-close" type="button" aria-label="Close">×</button></div><div id="cw-business-fields" class="cw-form-grid"></div><p class="cw-form-error" id="cw-business-error" role="alert"></p><div class="cw-dialog-actions"><button class="secondary" id="cw-business-cancel" type="button">' + escape(t('cancel')) + '</button><button class="primary" type="submit">' + escape(t('save')) + '</button></div></form>';
    host.append(dialog);
    $('cw-business-search').addEventListener('submit', e => { e.preventDefault(); const q = $('cw-business-query').value.trim(); if (state.tab === 'projects') state.projectQuery = q; else state.followupQuery = q; setOffset(0); loadActive(); });
    $('cw-business-status').addEventListener('change', () => { if (state.tab === 'projects') state.projectStatus = $('cw-business-status').value; else state.followupStatus = $('cw-business-status').value; setOffset(0); loadActive(); });
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
  function setOffset(value) { if (state.tab === 'projects') state.projectOffset = value; else state.followupOffset = value; }
  function updateToolbar() {
    const project = state.tab === 'projects';
    $('cw-business-query').placeholder = t(project ? 'searchProject' : 'searchFollowup');
    $('cw-business-query').value = project ? state.projectQuery : state.followupQuery;
    $('cw-business-search').querySelector('button').textContent = locale() === 'en' ? 'Search' : locale() === 'ja' ? '検索' : '搜索';
    $('cw-business-new').textContent = '＋ ' + t(project ? 'newProject' : 'newFollowup');
    const status = $('cw-business-status'), current = project ? state.projectStatus : state.followupStatus;
    const choices = project ? [['',t('allStatus')],['planned',t('planned')],['active',t('active')],['on_hold',t('on_hold')],['completed',t('completed')],['cancelled',t('cancelled')]] : [['',t('allStatus')],['pending',t('pending')],['completed',t('done')]];
    status.innerHTML = selectOptions(choices, current);
  }
  async function loadCustomers() {
    const result = await api('/customers?limit=100&offset=0');
    state.customers = Array.isArray(result?.items) ? result.items : [];
  }
  async function loadActive() {
    if (state.busy || state.tab === 'customers') return;
    state.busy = true; $('cw-business-feedback').textContent = t('loading');
    try {
      await loadCustomers();
      const project = state.tab === 'projects', type = project ? 'project' : 'follow_up';
      const offset = project ? state.projectOffset : state.followupOffset;
      const query = project ? state.projectQuery : state.followupQuery;
      const status = project ? state.projectStatus : state.followupStatus;
      const params = new URLSearchParams({ record_type:type, limit:String(PAGE_SIZE), offset:String(offset) });
      if (query) params.set('q', query); if (status) params.set('status', status);
      const result = await api('/records?' + params.toString());
      const records = Array.isArray(result?.items) ? result.items : [];
      if (project) state.projects = records; else state.followups = records;
      $('cw-business-feedback').textContent = result?.total ? t('loaded') + ' · ' + result.total : '';
      renderList(project, records, Number(result?.total || 0), offset);
    } catch (error) { $('cw-business-feedback').textContent = error.message || t('failed'); $('cw-business-feedback').classList.add('error'); }
    finally { state.busy = false; }
  }
  function customerName(id) { return state.customers.find(c => c.id === id)?.title || '—'; }
  function projectName(id) { return state.projects.find(p => p.id === id)?.title || '—'; }
  function renderList(project, records, total, offset) {
    const host = $('cw-business-list'); host.replaceChildren();
    if (!records.length) {
      const empty = node('div','cw-empty'); node('div','cw-empty-icon','◇'); empty.append(node('div','cw-empty-icon','◇'),node('h3','',t(project?'noProjects':'noFollowups')),node('p','',t(project?'createProjectHint':'createFollowupHint')),button('＋ '+t(project?'newProject':'newFollowup'),'primary',()=>openEditor())); host.append(empty);
    } else records.forEach(record => {
      const card = node('article','cw-business-card'), main = node('div','cw-business-main');
      main.append(node('h3','cw-customer-title',record.title));
      const data = record.data && typeof record.data === 'object' ? record.data : {};
      const meta = node('div','cw-customer-meta');
      if (project) { meta.append(node('span','cw-tag',customerName(record.parent_record_id)),node('span','cw-status',t(record.status)||record.status)); }
      else {
        const cid = data.customer_id || (record.related_record_ids || [])[0] || record.parent_record_id;
        meta.append(node('span','cw-tag',customerName(cid)),node('span','cw-status',t(record.status)||record.status),node('span','cw-tag',t(data.method || 'other')));
      }
      main.append(meta);
      const details = node('div','cw-business-details');
      if (project) { if (data.description) details.append(node('p','',data.description)); if (record.record_date) details.append(node('span','',t('startDate')+': '+dateText(record.record_date))); if (record.due_date) details.append(node('span','',t('dueDate')+': '+dateText(record.due_date))); }
      else { if (data.outcome) details.append(node('p','',data.outcome)); if (data.next_follow_up_date) details.append(node('span','',t('nextDate')+': '+dateText(data.next_follow_up_date))); if (data.project_id) details.append(node('span','',t('project')+': '+(projectName(data.project_id) === '—' ? data.project_title || '—' : projectName(data.project_id)))); }
      card.append(main,details);
      const actions = node('div','cw-card-actions');
      actions.append(button(t('edit'),'secondary',()=>openEditor(record)),button(t('delete'),'cw-delete',()=>removeRecord(record,project)));
      if (project) actions.append(button(t('followups'),'secondary',()=>{ state.followupProjectFilter = record.id; switchTab('followups'); $('cw-business-query').value = ''; }));
      card.append(actions); host.append(card);
    });
    const pager = $('cw-business-pagination'); pager.replaceChildren();
    const pages = Math.max(1,Math.ceil(total/PAGE_SIZE)), current = Math.floor(offset/PAGE_SIZE)+1;
    if (pages > 1) pager.append(button(t('previous'),'secondary',()=>{setOffset(Math.max(0,offset-PAGE_SIZE));loadActive();}),node('span','',current+' / '+pages),button(t('next'),'secondary',()=>{setOffset(offset+PAGE_SIZE);loadActive();}));
  }
  function field(label,id,type,value,wide,extra) {
    const wrap = node('div','field'+(wide?' cw-field-wide':''));
    wrap.append(node('label','',label));
    let input;
    if (type === 'select') { input = document.createElement('select'); input.innerHTML = extra; }
    else if (type === 'textarea') input = document.createElement('textarea');
    else { input = document.createElement('input'); input.type = type; }
    input.id = id; if (value !== undefined && value !== null) input.value = value;
    if (type !== 'select') input.maxLength = 5000;
    wrap.append(input); return wrap;
  }
  async function openEditor(record) {
    state.editing = record || null;
    try { await loadCustomers(); } catch (e) { $('cw-business-feedback').textContent = e.message; return; }
    if (!state.customers.length) { $('cw-business-feedback').textContent = t('customerMissing'); return; }
    const data = record?.data && typeof record.data === 'object' ? record.data : {};
    const fields = $('cw-business-fields'); fields.replaceChildren();
    $('cw-business-editor-title').textContent = t(record ? 'edit' : (state.tab === 'projects' ? 'newProject' : 'newFollowup'));
    const customerChoices = [['',t('chooseCustomer')],...state.customers.map(c=>[c.id,c.title])];
    if (state.tab === 'projects') {
      const selectedCustomer = record?.parent_record_id || '';
      fields.append(field(t('projectTitle')+' *','cw-biz-title','text',record?.title || '',true));
      fields.append(field(t('customer')+' *','cw-biz-customer','select',selectedCustomer,false,selectOptions(customerChoices,selectedCustomer)));
      fields.append(field(t('status'),'cw-biz-status','select',record?.status || 'planned',false,selectOptions([['planned',t('planned')],['active',t('active')],['on_hold',t('on_hold')],['completed',t('completed')],['cancelled',t('cancelled')]],record?.status || 'planned')));
      fields.append(field(t('startDate'),'cw-biz-start','date',record?.record_date?.slice(0,10) || ''));
      fields.append(field(t('dueDate'),'cw-biz-due','date',record?.due_date?.slice(0,10) || ''));
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
    event.preventDefault(); const title = $('cw-biz-title').value.trim(), customerId = $('cw-biz-customer').value;
    if (!title || !customerId) { $('cw-business-error').textContent = t('required'); return; }
    const project = state.tab === 'projects'; let payload;
    if (project) {
      payload = { record_type:'project', title, business_type:state.customers.find(c=>c.id===customerId)?.business_type || null, status:$('cw-biz-status').value, parent_record_id:customerId, record_date:$('cw-biz-start').value || null, due_date:$('cw-biz-due').value || null, data:{ description:$('cw-biz-description').value.trim() } };
    } else {
      const projectId = $('cw-biz-project').value || null, when = $('cw-biz-date').value;
      payload = { record_type:'follow_up', title, business_type:state.customers.find(c=>c.id===customerId)?.business_type || null, status:$('cw-biz-status').value, parent_record_id:projectId || customerId, related_record_ids:projectId ? [customerId] : [], record_date:when ? new Date(when).toISOString() : new Date().toISOString(), data:{ customer_id:customerId, project_id:projectId, project_title:projectId ? state.projects.find(p=>p.id===projectId)?.title || '' : '', method:$('cw-biz-method').value, outcome:$('cw-biz-outcome').value.trim(), next_follow_up_date:$('cw-biz-next').value || null, notes:$('cw-biz-notes').value.trim() } };
    }
    const id = state.editing?.id;
    try { if (id) await api('/records/'+encodeURIComponent(id),'PATCH',payload); else await api('/records','POST',payload); $('cw-business-editor').close(); state.editing=null; await loadActive(); }
    catch (error) { $('cw-business-error').textContent = error.message || t('failed'); }
  }
  async function removeRecord(record, project) {
    if (!window.confirm(t(project?'confirmDeleteProject':'confirmDeleteFollowup')+'\n'+record.title)) return;
    try { await api('/records/'+encodeURIComponent(record.id),'DELETE'); await loadActive(); }
    catch (error) { $('cw-business-feedback').textContent = error.message || t('failed'); $('cw-business-feedback').classList.add('error'); }
  }
  function closeEditor() { $('cw-business-editor').close(); state.editing=null; }
  function init() {
    if (!root()) return;
    install();
    window.addEventListener('planner-workspace-change', () => { if (document.documentElement.dataset.workspace === 'company' && state.tab !== 'customers') loadActive(); });
    window.addEventListener('planner-auth-change', () => { state.verified=''; if (state.tab !== 'customers' && document.documentElement.dataset.workspace === 'company') loadActive(); });
    switchTab('customers');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
  window.CompanyBusiness = Object.freeze({ refresh:loadActive, switchTab });
})();