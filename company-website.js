(() => {
  'use strict';
  const ROOT_ID = 'company-workspace-root';
  const PAGE_SIZE = 20;
  const API_NAME = 'company-api';
  const state = { verifiedFor:'', items:[], total:0, offset:0, query:'', businessType:'', status:'', editingId:null, busy:false };
  const $ = id => document.getElementById(id);
  function authContext(){ return window.PlannerCompanyContext?.getAuth?.() ?? null; }
  function basicToken(username,password){ const bytes=new TextEncoder().encode(username+':'+password);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary); }
  function apiError(code){
    const messages={
      AUTHENTICATION_FAILED:'账号或密码验证失败，请返回计划工作区重新登录。',
      ORIGIN_NOT_ALLOWED:'当前网页来源不在允许范围内。',
      RATE_LIMITED:'请求过于频繁，请稍后再试。',
      VALIDATION_ERROR:'提交内容不符合要求，请检查填写内容。',
      INVALID_JSON:'请求格式错误，请重新操作。',
      REQUEST_TOO_LARGE:'提交内容过大。',
      RECORD_NOT_FOUND:'客户记录不存在，可能已被删除。',
      RECORD_IN_USE_OR_INVALID_RELATION:'该客户仍被其他业务记录关联，暂时不能删除。',
      DATABASE_UNAVAILABLE:'数据库暂时不可用，请稍后重试。',
      SERVER_CONFIGURATION_ERROR:'服务端配置暂不可用，请稍后重试。',
      INTERNAL_ERROR:'服务暂时发生错误，请稍后重试。',
      NOT_FOUND:'请求的功能不存在。',
      METHOD_NOT_ALLOWED:'当前操作不受支持。'
    };
    return messages[code]||'操作失败，请稍后重试。';
  }
  async function request(path,method='GET',body){
    const auth=authContext();
    if(!auth)throw new Error('请先在计划工作区登录现有账号，再进入个人公司网站。');
    const headers={apikey:auth.key,Authorization:'Basic '+basicToken(auth.username,auth.password)};
    const options={method,headers,cache:'no-store'};
    if(body!==undefined){headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
    let response;
    try{response=await fetch(auth.url.replace(/\/+$/,'')+'/functions/v1/'+API_NAME+path,options)}
    catch{throw new Error('无法连接公司网站服务，请检查网络后重试。')}
    let payload=null;try{payload=await response.json()}catch{}
    if(!response.ok){const code=typeof payload?.error==='string'?payload.error:'INTERNAL_ERROR';const error=new Error(apiError(code));error.status=response.status;error.code=code;throw error}
    return payload?.data;
  }
  function createRoot(){
    if($(ROOT_ID))return $(ROOT_ID);
    const root=document.createElement('section');root.id=ROOT_ID;root.className='cw-root';root.setAttribute('aria-label','个人公司网站');
    root.innerHTML = `
      <div class="cw-shell">
        <header class="cw-header"><div><p class="cw-eyebrow">BUSINESS WORKSPACE</p><h2>个人公司网站</h2><p class="cw-subtitle">从客户资料开始，逐步管理贸易、软件开发与电商业务。</p></div><button class="secondary" id="cw-refresh" type="button">刷新</button></header>
        <div class="cw-session" id="cw-session" role="status" aria-live="polite"></div>
        <section class="cw-overview" aria-label="客户概况"><div class="cw-stat"><span>客户总数</span><strong id="cw-total">—</strong></div><div class="cw-stat"><span>当前显示</span><strong id="cw-showing">—</strong></div><div class="cw-stat"><span>业务类型</span><strong>贸易 · 软件 · 电商</strong></div></section>
        <section class="cw-panel">
          <div class="cw-toolbar">
            <form id="cw-search-form" class="cw-search"><label class="sr-only" for="cw-search">搜索客户</label><input id="cw-search" type="search" maxlength="100" placeholder="搜索客户名称"><button class="secondary" type="submit">搜索</button></form>
            <select id="cw-business-filter" aria-label="业务类型筛选"><option value="">全部业务类型</option><option value="trade">贸易</option><option value="software">软件开发</option><option value="ecommerce">电子商务</option></select>
            <select id="cw-status-filter" aria-label="客户状态筛选"><option value="">全部状态</option><option value="active">合作中</option><option value="prospect">潜在客户</option><option value="inactive">暂停合作</option></select>
            <button class="primary" id="cw-new" type="button">＋ 新增客户</button>
          </div>
          <div class="cw-feedback" id="cw-feedback" role="status" aria-live="polite"></div>
          <div class="cw-customer-list" id="cw-customer-list"></div><nav class="cw-pagination" id="cw-pagination" aria-label="客户列表分页"></nav>
        </section>
        <p class="cw-footnote">客户资料独立保存在公司业务数据库中，不会进入计划模块的云端备份。</p>
      </div>
      <dialog class="cw-dialog" id="cw-editor"><form class="cw-editor-form" id="cw-editor-form">
        <div class="cw-dialog-head"><div><p class="cw-eyebrow">CUSTOMER PROFILE</p><h2 id="cw-editor-title">新增客户</h2></div><button class="close-btn" id="cw-editor-close" type="button" aria-label="关闭">×</button></div>
        <div class="cw-form-grid">
          <div class="field cw-field-wide"><label for="cw-title">客户名称 *</label><input id="cw-title" maxlength="300" required placeholder="公司或客户名称"></div>
          <div class="field"><label for="cw-business-type">业务类型</label><select id="cw-business-type"><option value="trade">贸易</option><option value="software">软件开发</option><option value="ecommerce">电子商务</option></select></div>
          <div class="field"><label for="cw-status">客户状态</label><select id="cw-status"><option value="prospect">潜在客户</option><option value="active">合作中</option><option value="inactive">暂停合作</option></select></div>
          <div class="field"><label for="cw-contact">联系人</label><input id="cw-contact" maxlength="160"></div>
          <div class="field"><label for="cw-email">电子邮箱</label><input id="cw-email" type="email" maxlength="254"></div>
          <div class="field"><label for="cw-phone">电话</label><input id="cw-phone" maxlength="80"></div>
          <div class="field"><label for="cw-website">网站</label><input id="cw-website" type="url" maxlength="500" placeholder="https://"></div>
          <div class="field cw-field-wide"><label for="cw-address">地址</label><input id="cw-address" maxlength="500"></div>
          <div class="field cw-field-wide"><label for="cw-notes">备注</label><textarea id="cw-notes" maxlength="5000" rows="4"></textarea></div>
        </div>
        <p class="cw-form-error" id="cw-form-error" role="alert"></p>
        <div class="cw-dialog-actions"><button class="secondary" id="cw-cancel" type="button">取消</button><button class="primary" id="cw-save" type="submit">保存客户</button></div>
      </form></dialog>`;
    $('app-shell')?.querySelector('.top')?.insertAdjacentElement('afterend',root);
    return root;
  }
  function setFeedback(message='',kind=''){const host=$('cw-feedback');if(!host)return;host.textContent=message;host.className='cw-feedback'+(kind?' '+kind:'')}
  function setSessionMessage(message,kind=''){const host=$('cw-session');if(!host)return;host.textContent=message;host.className='cw-session'+(kind?' '+kind:'')}
  function businessLabel(value){return({trade:'贸易',software:'软件开发',ecommerce:'电子商务'})[value]||'未分类'}
  function statusLabel(value){return({active:'合作中',prospect:'潜在客户',inactive:'暂停合作'})[value]||value||'未设置'}
  function addText(parent,tag,className,value){const node=document.createElement(tag);if(className)node.className=className;node.textContent=value??'';parent.append(node);return node}
  function renderCustomers(){
    const host=$('cw-customer-list');if(!host)return;host.replaceChildren();
    if(!state.items.length){
      const empty=document.createElement('div');empty.className='cw-empty';addText(empty,'div','cw-empty-icon','◇');
      addText(empty,'h3','',state.query||state.businessType||state.status?'没有找到符合条件的客户':'还没有客户资料');
      addText(empty,'p','','新增第一位客户，开始建立你的业务资料库。');
      const button=document.createElement('button');button.type='button';button.className='primary';button.textContent='＋ 新增客户';button.addEventListener('click',()=>openEditor());empty.append(button);host.append(empty);
    }else{
      for(const customer of state.items){
        const card=document.createElement('article');card.className='cw-customer';
        const main=document.createElement('div');main.className='cw-customer-main';addText(main,'h3','cw-customer-title',customer.title);
        const meta=document.createElement('div');meta.className='cw-customer-meta';addText(meta,'span','cw-tag',businessLabel(customer.business_type));addText(meta,'span','cw-status status-'+(customer.status||'none'),statusLabel(customer.status));
        const data=customer.data&&typeof customer.data==='object'?customer.data:{};
        if(data.contact_name)addText(meta,'span','','联系人：'+data.contact_name);main.append(meta);
        const details=document.createElement('div');details.className='cw-customer-details';
        if(data.email)addText(details,'span','',data.email);if(data.phone)addText(details,'span','',data.phone);if(data.website)addText(details,'span','',data.website);
        card.append(main,details);
        const actions=document.createElement('div');actions.className='cw-card-actions';
        const edit=document.createElement('button');edit.type='button';edit.className='secondary';edit.textContent='编辑';edit.addEventListener('click',()=>openEditor(customer));
        const remove=document.createElement('button');remove.type='button';remove.className='cw-delete';remove.textContent='删除';remove.addEventListener('click',()=>deleteCustomer(customer));
        actions.append(edit,remove);card.append(actions);host.append(card);
      }
    }
    $('cw-total').textContent=String(state.total);$('cw-showing').textContent=String(state.items.length);renderPagination();
  }
  function renderPagination(){
    const host=$('cw-pagination');if(!host)return;host.replaceChildren();
    const pages=Math.max(1,Math.ceil(state.total/PAGE_SIZE)),current=Math.floor(state.offset/PAGE_SIZE)+1;if(pages<=1)return;
    const previous=document.createElement('button');previous.type='button';previous.className='secondary';previous.textContent='上一页';previous.disabled=current<=1;previous.addEventListener('click',()=>{state.offset=Math.max(0,state.offset-PAGE_SIZE);loadCustomers()});
    const label=document.createElement('span');label.textContent=current+' / '+pages;
    const next=document.createElement('button');next.type='button';next.className='secondary';next.textContent='下一页';next.disabled=current>=pages;next.addEventListener('click',()=>{state.offset+=PAGE_SIZE;loadCustomers()});host.append(previous,label,next);
  }
  async function verifySession(){
    const auth=authContext();
    if(!auth){state.verifiedFor='';setSessionMessage('请先在计划工作区使用现有账号登录，再进入个人公司网站。','warning');setFeedback('公司网站使用慢慢计划现有账号，不需要重新注册。');$('cw-customer-list').replaceChildren();return false}
    if(state.verifiedFor===auth.username)return true;
    setSessionMessage('正在验证当前账号…');setFeedback('');
    try{const result=await request('/auth/verify','POST',{});if(!result?.authenticated)throw new Error('账号验证失败，请重新登录。');state.verifiedFor=auth.username;setSessionMessage('已连接公司业务数据库 · '+auth.username,'success');return true}
    catch(error){state.verifiedFor='';setSessionMessage(error.message||'账号验证失败。','warning');return false}
  }
  async function loadCustomers(){
    if(state.busy)return;if(!await verifySession())return;state.busy=true;setFeedback('正在读取客户资料…');$('cw-refresh').disabled=true;
    try{
      const params=new URLSearchParams({limit:String(PAGE_SIZE),offset:String(state.offset)});
      if(state.query)params.set('q',state.query);if(state.businessType)params.set('business_type',state.businessType);if(state.status)params.set('status',state.status);
      const result=await request('/customers?'+params.toString());state.items=Array.isArray(result?.items)?result.items:[];state.total=Number(result?.total||0);
      setFeedback(state.total?'客户资料已加载。':'');renderCustomers();
    }catch(error){setFeedback(error.message||'读取客户资料失败。','error')}
    finally{state.busy=false;$('cw-refresh').disabled=false}
  }
  function openEditor(customer=null){
    state.editingId=customer?.id||null;$('cw-editor-title').textContent=customer?'编辑客户':'新增客户';$('cw-title').value=customer?.title||'';
    $('cw-business-type').value=customer?.business_type||'trade';$('cw-status').value=customer?.status||'prospect';
    const data=customer?.data&&typeof customer.data==='object'?customer.data:{};
    $('cw-contact').value=data.contact_name||'';$('cw-email').value=data.email||'';$('cw-phone').value=data.phone||'';$('cw-website').value=data.website||'';
    $('cw-address').value=data.address||'';$('cw-notes').value=data.notes||'';$('cw-form-error').textContent='';$('cw-editor').showModal();$('cw-title').focus();
  }
  function closeEditor(){$('cw-editor').close();state.editingId=null}
  function formPayload(){
    const title=$('cw-title').value.trim();if(!title)throw new Error('请填写客户名称。');
    const email=$('cw-email').value.trim();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('请填写有效的电子邮箱。');
    const website=$('cw-website').value.trim();if(website&&!/^https?:\/\/[^\s]+$/i.test(website))throw new Error('网站地址必须以 http:// 或 https:// 开头。');
    return{title,business_type:$('cw-business-type').value,status:$('cw-status').value,data:{contact_name:$('cw-contact').value.trim(),email,phone:$('cw-phone').value.trim(),website,address:$('cw-address').value.trim(),notes:$('cw-notes').value.trim()}};
  }
  async function saveCustomer(event){
    event.preventDefault();const button=$('cw-save');button.disabled=true;$('cw-form-error').textContent='';
    try{
      const payload=formPayload();
      const successMessage=state.editingId?'客户资料已更新。':'客户已新增。';
      if(state.editingId){await request('/customers/'+encodeURIComponent(state.editingId),'PATCH',payload)}
      else{await request('/customers','POST',payload);state.offset=0;state.query='';$('cw-search').value=''}
      closeEditor();await loadCustomers();setFeedback(successMessage,'success');
    }catch(error){$('cw-form-error').textContent=error.message||'保存失败，请稍后重试。'}
    finally{button.disabled=false}
  }
  async function deleteCustomer(customer){
    if(!window.confirm((window.PlannerI18n?.t('确定删除客户吗？此操作无法撤销。')||'确定删除客户吗？此操作无法撤销。')+'\n'+customer.title))return;
    try{await request('/customers/'+encodeURIComponent(customer.id),'DELETE');if(state.items.length===1&&state.offset>0)state.offset=Math.max(0,state.offset-PAGE_SIZE);await loadCustomers();setFeedback('客户已删除。','success')}
    catch(error){setFeedback(error.message||'删除失败，请稍后重试。','error')}
  }
  function bindEvents(root){
    root.addEventListener('click',event=>{
      if(event.target.id==='cw-new')openEditor();if(event.target.id==='cw-refresh')loadCustomers();
      if(event.target.id==='cw-editor-close'||event.target.id==='cw-cancel')closeEditor();
      if(event.target===$('cw-editor'))closeEditor();
    });
    $('cw-search-form').addEventListener('submit',event=>{event.preventDefault();state.query=$('cw-search').value.trim();state.offset=0;loadCustomers()});
    $('cw-business-filter').addEventListener('change',()=>{state.businessType=$('cw-business-filter').value;state.offset=0;loadCustomers()});
    $('cw-status-filter').addEventListener('change',()=>{state.status=$('cw-status-filter').value;state.offset=0;loadCustomers()});
    $('cw-editor-form').addEventListener('submit',saveCustomer);
  }
  function onWorkspaceChange(){if(document.documentElement.dataset.workspace!=='company')return;state.verifiedFor='';loadCustomers()}
  function init(){
    const root=createRoot();bindEvents(root);
    window.addEventListener('planner-auth-change',()=>{state.verifiedFor='';if(document.documentElement.dataset.workspace==='company')loadCustomers();else if(!authContext())setSessionMessage('请先在计划工作区登录。','warning')});
    window.addEventListener('planner-language-change',()=>{if(document.documentElement.dataset.workspace==='company')renderCustomers()});
    window.addEventListener('planner-workspace-change',onWorkspaceChange);
    if(document.documentElement.dataset.workspace==='company')loadCustomers();else setSessionMessage('选择「个人公司网站」工作区即可开始管理客户。');
  }
  window.CompanyWebsite=Object.freeze({version:'1.0.0',refresh:loadCustomers});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();