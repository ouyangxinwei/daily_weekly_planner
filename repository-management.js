(function(){
'use strict';
const API='/repositories';
const PROJECT_URL='https://kopvznygsqsheibsjjvv.supabase.co';
const $=id=>document.getElementById(id);
const dialog=$('repository-management-dialog');
if(!dialog)return;
const dictionaries={
 zh:{title:'仓库管理',subtitle:'独立维护 GitHub 仓库信息；登录后保存到个人云端资料库。',add:'＋ 新增仓库',export:'导出 JSON',import:'导入 JSON',clearAll:'清空清单',githubPrompt:'GitHub 提取提示词',clearConfirm:'确定清空当前云端仓库清单中的 {count} 条记录吗？此操作无法在应用内撤销。不会删除 GitHub 仓库或原始 JSON 备份。建议先导出 JSON 备份。',clearDone:'已清空 {count} 条仓库管理记录。',close:'关闭',all:'全部',search:'搜索仓库名称、地址、技术栈、标签或备注',category:'全部分类',status:'全部状态',tag:'全部标记',total:'仓库总数',active:'进行中',paused:'已暂停',done:'已完成',unfinished:'未完成标记',edit:'编辑',delete:'删除',branch:'默认分支',tech:'技术栈',notes:'备注',priority:'优先级',categoryLabel:'分类',statusLabel:'状态',tags:'特殊标记（逗号分隔）',name:'仓库名称',url:'GitHub 地址',stack:'技术栈（逗号分隔）',branchLabel:'默认分支',notesHint:'卡住或尚未解决的问题可添加「未完成」标记，并在备注中记录原因和后续处理。',save:'保存',cancel:'取消',newTitle:'新增仓库',editTitle:'编辑仓库',empty:'没有符合条件的仓库。',confirmDelete:'确定删除这个仓库条目吗？这只会删除慢慢计划中的管理记录，不会删除 GitHub 仓库。',badUrl:'请输入有效的 GitHub 仓库地址。',badName:'请填写仓库名称。',saved:'已保存。',deleted:'已删除管理记录。',importTitle:'导入预览',added:'新增',updated:'更新',skipped:'跳过',confirmImport:'确认导入并合并',discard:'取消导入',importDone:'导入完成。',invalid:'JSON 格式或数据结构不正确，当前数据未改变。',noData:'暂无仓库数据。',seedFail:'初始仓库数据加载失败；可稍后重试或手动新增。',tagUnfinished:'未完成',priorityHigh:'高',priorityMedium:'中',priorityLow:'低',statusTodo:'待整理',statusDoing:'进行中',statusPaused:'已暂停',statusDone:'已完成',statusUnfinished:'未完成',records:'条记录',importSummary:'导入采用合并方式：相同仓库按 GitHub 地址或 ID 匹配，不会清空未出现在文件中的现有记录。'},
 en:{title:'Repository Management',subtitle:'Manage GitHub repositories in your private cloud library after signing in.',add:'＋ Add repository',export:'Export JSON',import:'Import JSON',clearAll:'Clear list',githubPrompt:'GitHub export prompt',clearConfirm:'Clear all {count} repository records from the cloud list? This cannot be undone in the app. GitHub repositories and your original JSON backups will not be deleted. Export a JSON backup first if needed.',clearDone:'Cleared {count} repository management records.',close:'Close',all:'All',search:'Search name, URL, stack, tags or notes',category:'All categories',status:'All statuses',tag:'All tags',total:'Repositories',active:'Active',paused:'Paused',done:'Completed',unfinished:'Unfinished tags',edit:'Edit',delete:'Delete',branch:'Default branch',tech:'Tech stack',notes:'Notes',priority:'Priority',categoryLabel:'Category',statusLabel:'Status',tags:'Special tags (comma separated)',name:'Repository name',url:'GitHub URL',stack:'Tech stack (comma separated)',branchLabel:'Default branch',notesHint:'For blocked items, add the “Unfinished” tag and record the reason and next step in notes.',save:'Save',cancel:'Cancel',newTitle:'Add repository',editTitle:'Edit repository',empty:'No repositories match the filters.',confirmDelete:'Delete this repository entry? This removes only the planner record, not the GitHub repository.',badUrl:'Enter a valid GitHub repository URL.',badName:'Repository name is required.',saved:'Saved.',deleted:'Repository entry deleted.',importTitle:'Import preview',added:'Added',updated:'Updated',skipped:'Skipped',confirmImport:'Confirm merge',discard:'Cancel import',importDone:'Import completed.',invalid:'Invalid JSON or schema. Existing data was not changed.',noData:'No repository data yet.',seedFail:'Could not load initial repository data. Retry later or add repositories manually.',tagUnfinished:'Unfinished',priorityHigh:'High',priorityMedium:'Medium',priorityLow:'Low',statusTodo:'To review',statusDoing:'In progress',statusPaused:'Paused',statusDone:'Completed',statusUnfinished:'Unfinished',records:'records',importSummary:'Import merges by repository ID or GitHub URL. Existing records absent from the file are kept.'},
 ja:{title:'リポジトリ管理',subtitle:'ログイン後、個人用クラウドライブラリで GitHub リポジトリを管理します。',add:'＋ リポジトリ追加',export:'JSON エクスポート',import:'JSON インポート',clearAll:'一覧を全消去',githubPrompt:'GitHub 全件抽出プロンプト',clearConfirm:'クラウドのリポジトリ管理一覧 {count} 件をすべて消去しますか？アプリ内では元に戻せません。GitHub 上のリポジトリや元の JSON バックアップは削除されません。必要に応じて先に JSON をエクスポートしてください。',clearDone:'リポジトリ管理記録 {count} 件を消去しました。',close:'閉じる',all:'すべて',search:'名前、URL、技術スタック、タグ、メモを検索',category:'すべての分類',status:'すべての状態',tag:'すべてのタグ',total:'リポジトリ数',active:'進行中',paused:'一時停止',done:'完了',unfinished:'未完了タグ',edit:'編集',delete:'削除',branch:'デフォルトブランチ',tech:'技術スタック',notes:'メモ',priority:'優先度',categoryLabel:'分類',statusLabel:'状態',tags:'特別タグ（カンマ区切り）',name:'リポジトリ名',url:'GitHub URL',stack:'技術スタック（カンマ区切り）',branchLabel:'デフォルトブランチ',notesHint:'停止中の項目には「未完了」タグを付け、理由と次の対応をメモに記録してください。',save:'保存',cancel:'キャンセル',newTitle:'リポジトリ追加',editTitle:'リポジトリ編集',empty:'条件に一致するリポジトリはありません。',confirmDelete:'この管理記録を削除しますか？GitHub 上のリポジトリは削除されません。',badUrl:'有効な GitHub URL を入力してください。',badName:'リポジトリ名を入力してください。',saved:'保存しました。',deleted:'管理記録を削除しました。',importTitle:'インポート確認',added:'追加',updated:'更新',skipped:'スキップ',confirmImport:'マージを確定',discard:'インポート取消',importDone:'インポートが完了しました。',invalid:'JSON またはデータ形式が正しくありません。既存データは変更されていません。',noData:'リポジトリデータはありません。',seedFail:'初期データを読み込めません。後で再試行するか手動で追加してください。',tagUnfinished:'未完了',priorityHigh:'高',priorityMedium:'中',priorityLow:'低',statusTodo:'確認待ち',statusDoing:'進行中',statusPaused:'一時停止',statusDone:'完了',statusUnfinished:'未完了',records:'件',importSummary:'ID または GitHub URL で照合してマージします。ファイルにない既存レコードは保持されます。'}
};
function lang(){const l=window.PlannerI18n&&window.PlannerI18n.getLanguage?window.PlannerI18n.getLanguage():'zh';return dictionaries[l]?l:'zh'}
function T(k){return dictionaries[lang()][k]||dictionaries.zh[k]||k}
function applyTranslations(){dialog.querySelectorAll('[data-rm-i18n]').forEach(el=>{el.textContent=T(el.dataset.rmI18n)});dialog.querySelectorAll('[data-rm-placeholder]').forEach(el=>{el.placeholder=T(el.dataset.rmPlaceholder)});const btn=$('open-repository-management');if(btn)btn.textContent=T('title');const status=$('repository-status');if(status)Array.from(status.options).forEach(o=>{const labels={'待整理':'statusTodo','进行中':'statusDoing','已暂停':'statusPaused','已完成':'statusDone','未完成':'statusUnfinished'};if(labels[o.value])o.textContent=T(labels[o.value])});const priority=$('repository-priority');if(priority)Array.from(priority.options).forEach(o=>{const labels={'高':'priorityHigh','中':'priorityMedium','低':'priorityLow'};if(labels[o.value])o.textContent=T(labels[o.value])})}
let records=[];
let pendingImport=null;
let initialized=false;
function now(){return new Date().toISOString()}
function cleanList(value){return Array.isArray(value)?value.map(x=>String(x).trim()).filter(Boolean):String(value||'').split(/[,，;；\n]/).map(x=>x.trim()).filter(Boolean)}
function normalizeUrl(value){const u=new URL(String(value||''));if(u.protocol!=='https:'||u.hostname.toLowerCase()!=='github.com')throw new Error(T('badUrl'));const parts=u.pathname.split('/').filter(Boolean);if(parts.length<2)throw new Error(T('badUrl'));return 'https://github.com/'+parts[0]+'/'+parts[1].replace(/\.git$/i,'')}
function normalizeRepo(input,stamp){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error(T('invalid'));
 const name=String(input.name||'').trim();if(!name)throw new Error(T('badName'));
 const url=normalizeUrl(input.url);
 const parts=url.split('/').slice(-2);
 const id=String(input.id||('github:'+parts[0]+'/'+parts[1])).trim();
 const allowed=['待整理','进行中','已暂停','已完成','未完成'];
 const status=allowed.includes(input.status)?input.status:'待整理';
 const priority=['高','中','低'].includes(input.priority)?input.priority:'中';
 return {id,name,url,defaultBranch:String(input.defaultBranch||input.default_branch||'').trim(),category:String(input.category||'待分类').trim()||'待分类',techStack:cleanList(input.techStack||input.tech_stack),status,priority,tags:[...new Set(cleanList(input.tags))],notes:String(input.notes||'').trim(),createdAt:String(input.createdAt||stamp||now()),updatedAt:String(input.updatedAt||stamp||now())};
}
function validateEnvelope(raw){
 if(!raw||raw.type!=='oooo.repository-management'||raw.version!==1||!Array.isArray(raw.repositories)||raw.repositories.length>1000)throw new Error(T('invalid'));
 const seenIds=new Set(),seenUrls=new Set();
 const normalized=raw.repositories.map(item=>normalizeRepo(item));
 for(const item of normalized){const url=item.url.toLowerCase();if(seenIds.has(item.id)||seenUrls.has(url))throw new Error(T('invalid'));seenIds.add(item.id);seenUrls.add(url)}
 return normalized;
}
function auth(){return window.PlannerCompanyContext&&window.PlannerCompanyContext.getAuth?window.PlannerCompanyContext.getAuth():null}
function basicToken(user,pass){const bytes=new TextEncoder().encode(user+':'+pass);let binary='';bytes.forEach(b=>binary+=String.fromCharCode(b));return btoa(binary)}
async function cloudRequest(method,body){
 const a=auth();
 if(!a)throw new Error('请先在计划工作区登录现有账号。');
 if(!a.url||a.url.replace(/\/+$/,'')!==PROJECT_URL)throw new Error('仓库管理只能连接慢慢计划的 Supabase 项目。');
 const headers={apikey:a.key,Authorization:'Basic '+basicToken(a.username,a.password)};
 const options={method,headers,cache:'no-store'};
 if(body!==undefined){headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
 let response;
 try{response=await fetch(a.url.replace(/\/+$/,'')+'/functions/v1/company-api'+API,options)}
 catch(e){throw new Error('云端连接失败，请检查网络后重试。')}
 let payload={};try{payload=await response.json()}catch{}
 if(!response.ok){
  if(payload.error==='AUTHENTICATION_FAILED')throw new Error('账号验证失败，请重新登录。');
  if(payload.error==='RATE_LIMITED'||response.status===429)throw new Error('请求过于频繁，请等待约 1 分钟后重试。');
  if(payload.error==='VALIDATION_ERROR')throw new Error('云端拒绝了无效的仓库数据，请检查 JSON 内容。');
  throw new Error('云端仓库资料读取或保存失败（'+(payload.error||response.status)+'）。');
 }
 return payload.data;
}
async function persist(next){
 await cloudRequest('PUT',{repositories:next});
 records=next;
 return true;
}
function setMessage(message,danger){const el=$('repository-status-message');el.textContent=message||'';el.classList.toggle('rm-danger',Boolean(danger))}
async function initialize(){
 if(initialized)return;
 try{
  const cloud=await cloudRequest('GET');
  const list=cloud&&Array.isArray(cloud.repositories)?cloud.repositories:[];
  records=validateEnvelope({type:'oooo.repository-management',version:1,repositories:list});
  initialized=true;
 }catch(error){setMessage(error.message||'云端仓库资料加载失败。',true);throw error}
}
function addOption(select,value,label,selected){const option=document.createElement('option');option.value=value;option.textContent=label;if(selected)option.selected=true;select.appendChild(option)}
function updateFilters(){
 const category=$('repository-category-filter'),status=$('repository-status-filter'),tag=$('repository-tag-filter');
 const selectedCategory=category.value,selectedStatus=status.value,selectedTag=tag.value;
 category.textContent='';addOption(category,'all',T('category'));[...new Set(records.map(x=>x.category).filter(Boolean))].sort().forEach(x=>addOption(category,x,x,x===selectedCategory));
 status.textContent='';addOption(status,'all',T('status'));[['待整理',T('statusTodo')],['进行中',T('statusDoing')],['已暂停',T('statusPaused')],['已完成',T('statusDone')],['未完成',T('statusUnfinished')]].forEach(([v,l])=>addOption(status,v,l,v===selectedStatus));
 tag.textContent='';addOption(tag,'all',T('tag'));[...new Set(records.flatMap(x=>x.tags))].sort().forEach(x=>addOption(tag,x,x,x===selectedTag));
 if([...category.options].some(x=>x.value===selectedCategory))category.value=selectedCategory;
 if([...status.options].some(x=>x.value===selectedStatus))status.value=selectedStatus;
 if([...tag.options].some(x=>x.value===selectedTag))tag.value=selectedTag;
}
function stat(label,value){const box=document.createElement('div');box.className='rm-stat';const a=document.createElement('span');a.textContent=label;const b=document.createElement('strong');b.textContent=String(value);box.append(a,b);return box}
function pill(text,unfinished){const el=document.createElement('span');el.className='rm-pill'+(unfinished?' rm-unfinished':'');el.textContent=text;return el}
function button(label,action,kind){const b=document.createElement('button');b.type='button';b.className=kind||'secondary';b.textContent=label;b.addEventListener('click',action);return b}
function render(){
 applyTranslations();updateFilters();
 const clearButton=$('repository-clear');if(clearButton)clearButton.disabled=records.length===0;
 const stats=$('repository-stats');stats.textContent='';
 stats.append(stat(T('total'),records.length),stat(T('active'),records.filter(x=>x.status==='进行中').length),stat(T('paused'),records.filter(x=>x.status==='已暂停').length),stat(T('done'),records.filter(x=>x.status==='已完成').length),stat(T('unfinished'),records.filter(x=>x.tags.includes('未完成')||x.status==='未完成').length));
 const query=$('repository-search').value.trim().toLowerCase(),category=$('repository-category-filter').value,status=$('repository-status-filter').value,tag=$('repository-tag-filter').value;
 const filtered=records.filter(x=>(category==='all'||x.category===category)&&(status==='all'||x.status===status)&&(tag==='all'||x.tags.includes(tag))&&(!query||[x.name,x.url,x.defaultBranch,x.category,x.status,x.priority,x.notes,...x.techStack,...x.tags].join(' ').toLowerCase().includes(query)));
 const priorityRank={'高':0,'中':1,'低':2};
 filtered.sort((a,b)=>(priorityRank[a.priority]-priorityRank[b.priority])||a.name.localeCompare(b.name));
 const host=$('repository-list');host.textContent='';
 if(!filtered.length){const empty=document.createElement('div');empty.className='rm-empty';empty.textContent=records.length?T('empty'):T('noData');host.appendChild(empty);return}
 for(const item of filtered){
  const card=document.createElement('article');card.className='rm-card';
  const head=document.createElement('div');head.className='rm-card-head';
  const title=document.createElement('h3');title.textContent=item.name;head.appendChild(title);
  const pri=pill(T(item.priority==='高'?'priorityHigh':item.priority==='低'?'priorityLow':'priorityMedium')+' · '+T('priority'));head.appendChild(pri);card.appendChild(head);
  const link=document.createElement('a');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.url;card.appendChild(link);
  const meta=document.createElement('div');meta.className='rm-meta';meta.append(pill(item.category),pill(T(({待整理:'statusTodo',进行中:'statusDoing',已暂停:'statusPaused',已完成:'statusDone',未完成:'statusUnfinished'})[item.status]||'statusTodo')));
  item.tags.forEach(tag=>meta.appendChild(pill(tag,tag==='未完成')));card.appendChild(meta);
  if(item.defaultBranch){const p=document.createElement('p');p.textContent=T('branch')+': '+item.defaultBranch;card.appendChild(p)}
  if(item.techStack.length){const p=document.createElement('p');p.textContent=T('tech')+': '+item.techStack.join(' · ');card.appendChild(p)}
  if(item.notes){const p=document.createElement('p');p.textContent=T('notes')+': '+item.notes;card.appendChild(p)}
  const actions=document.createElement('div');actions.className='rm-card-actions';actions.append(button(T('edit'),()=>openEditor(item.id)));actions.append(button(T('delete'),()=>deleteRecord(item.id),'secondary'));card.appendChild(actions);
  host.appendChild(card);
 }
}
function openEditor(id){
 const item=id?records.find(x=>x.id===id):null;
 $('repository-editor').classList.remove('rm-hidden');$('repository-import-preview').classList.add('rm-hidden');
 $('repository-editor-title').textContent=item?T('editTitle'):T('newTitle');
 $('repository-id').value=item?item.id:'';
 $('repository-name').value=item?item.name:'';
 $('repository-url').value=item?item.url:'';
 $('repository-branch').value=item?item.defaultBranch:'';
 $('repository-category').value=item?item.category:'待分类';
 $('repository-tech').value=item?item.techStack.join(', '):'';
 $('repository-status').value=item?item.status:'待整理';
 $('repository-priority').value=item?item.priority:'中';
 $('repository-tags').value=item?item.tags.join(', '):'';
 $('repository-notes').value=item?item.notes:'';
 $('repository-name').focus();
}
function closeEditor(){$('repository-editor').classList.add('rm-hidden')}
async function saveEditor(event){
 event.preventDefault();
 try{
  const id=$('repository-id').value||('manual:'+((crypto.randomUUID&&crypto.randomUUID())||Date.now().toString(36)));
  const old=records.find(x=>x.id===id),stamp=now();
  const item=normalizeRepo({id,name:$('repository-name').value,url:$('repository-url').value,defaultBranch:$('repository-branch').value,category:$('repository-category').value,techStack:$('repository-tech').value,status:$('repository-status').value,priority:$('repository-priority').value,tags:$('repository-tags').value,notes:$('repository-notes').value,createdAt:old?old.createdAt:stamp,updatedAt:stamp});
  const duplicate=records.find(x=>x.id!==id&&x.url.toLowerCase()===item.url.toLowerCase());if(duplicate)throw new Error('该 GitHub 地址已存在：'+duplicate.name);
  const next=old?records.map(x=>x.id===id?item:x):records.concat(item);
  await persist(next);closeEditor();render();setMessage(T('saved'));
 }catch(error){setMessage(error.message||T('invalid'),true)}
}
async function deleteRecord(id){const item=records.find(x=>x.id===id);if(!item||!window.confirm(T('confirmDelete')))return;try{await persist(records.filter(x=>x.id!==id));render();setMessage(T('deleted'))}catch(error){setMessage(error.message||'云端删除失败。',true)}}
async function clearRecords(){
 const count=records.length;if(!count)return;
 if(!window.confirm(T('clearConfirm').replace('{count}',String(count))))return;
 try{await persist([]);render();setMessage(T('clearDone').replace('{count}',String(count)))}
 catch(error){render();setMessage(error.message||'云端清空失败，现有记录未改变。',true)}
}
function comparable(x){return JSON.stringify([x.name,x.url,x.defaultBranch,x.category,x.techStack,x.status,x.priority,x.tags,x.notes])}
function showImportPreview(incoming){
 const next=records.slice(),added=[],updated=[],skipped=[];
 for(const item of incoming){
  const index=next.findIndex(x=>x.id===item.id||x.url.toLowerCase()===item.url.toLowerCase());
  if(index<0){next.push({...item,createdAt:item.createdAt||now(),updatedAt:now()});added.push(item.name)}
  else if(comparable(next[index])===comparable(item)){skipped.push(item.name)}
  else{next[index]={...item,id:next[index].id,createdAt:next[index].createdAt,updatedAt:now()};updated.push(item.name)}
 }
 pendingImport=next;
 $('repository-import-preview').classList.remove('rm-hidden');$('repository-editor').classList.add('rm-hidden');
 const box=$('repository-import-summary');box.textContent='';
 box.append(stat(T('added'),added.length),stat(T('updated'),updated.length),stat(T('skipped'),skipped.length));
 $('repository-import-details').textContent=[T('importSummary'),T('added')+': '+added.join('、'),T('updated')+': '+updated.join('、'),T('skipped')+': '+skipped.join('、')].join('\n');
}
async function readImport(file){
 try{if(!initialized)throw new Error('请先登录并成功加载云端仓库资料，再导入 JSON。');const raw=JSON.parse(await file.text());showImportPreview(validateEnvelope(raw));setMessage('')}
 catch(error){pendingImport=null;$('repository-import-preview').classList.add('rm-hidden');setMessage(error.message||T('invalid'),true)}
}
async function confirmImport(){if(!pendingImport)return;try{await persist(pendingImport);pendingImport=null;$('repository-import-preview').classList.add('rm-hidden');render();setMessage(T('importDone'))}catch(error){setMessage(error.message||'云端导入失败，现有云端数据未改变。',true)}}
function exportJson(){
 const payload={type:'oooo.repository-management',version:1,exportedAt:now(),repositories:records};
 const blob=new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='oooo_repositories_'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function openManager(){setMessage('');initialized=false;dialog.showModal();try{await initialize();render()}catch(error){records=[];render();setMessage(error.message||'无法读取个人云端仓库资料。',true)}}
$('open-repository-management').addEventListener('click',openManager);
$('repository-close').addEventListener('click',()=>dialog.close());
$('repository-add').addEventListener('click',()=>openEditor(''));
$('repository-export').addEventListener('click',exportJson);
$('repository-import').addEventListener('click',()=>$('repository-import-file').click());
$('repository-clear').addEventListener('click',clearRecords);
$('repository-import-file').addEventListener('change',event=>{const file=event.target.files&&event.target.files[0];event.target.value='';if(file)readImport(file)});
$('repository-editor').addEventListener('submit',saveEditor);
$('repository-cancel-edit').addEventListener('click',closeEditor);
$('repository-import-confirm').addEventListener('click',confirmImport);
$('repository-import-cancel').addEventListener('click',()=>{pendingImport=null;$('repository-import-preview').classList.add('rm-hidden')});
['repository-search','repository-category-filter','repository-status-filter','repository-tag-filter'].forEach(id=>$(id).addEventListener(id==='repository-search'?'input':'change',render));
window.addEventListener('planner-language-change',()=>{if(dialog.open)render();else applyTranslations()});
window.addEventListener('planner-auth-change',()=>{initialized=false;records=[];pendingImport=null;if(dialog.open){render();setMessage('登录状态已变化，请重新打开仓库管理。',true)}});
dialog.addEventListener('close',()=>{initialized=false;records=[];pendingImport=null});
})();
