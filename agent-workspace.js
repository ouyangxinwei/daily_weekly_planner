(() => {
"use strict";
const API="https://kopvznygsqsheibsjjvv.supabase.co/functions/v1/agent-api";
const $=id=>document.getElementById(id), dialog=$("agent-workspace-dialog");
if(!dialog||!$("open-agent-workspace"))return;
let auth=null,runId=null,busy=false;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function status(s,error){$("agent-status").textContent=s;$("agent-status").dataset.error=error?"true":"false";}
function lock(v){busy=v;dialog.querySelectorAll("button").forEach(b=>b.disabled=v);}
async function request(path,method,body){
 if(!auth)throw Error("请先连接 Agent。");
 const token=btoa(unescape(encodeURIComponent(auth.username+":"+auth.password)));
 const r=await fetch(API+path,{method:method||"GET",headers:{Authorization:"Basic "+token,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
 const p=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(({AUTHENTICATION_FAILED:"账号或密码错误。",RATE_LIMITED:"请求过于频繁。",RUN_ALREADY_OPEN:"该任务已有未结束的 Run。"}[p.error])||("Agent API 错误："+(p.error||r.status)));
 return p.data;
}
function renderTasks(items){
 $("agent-task-list").innerHTML=items.length?items.map(t=>'<article class="agent-task-item"><div><strong>'+esc(t.title)+'</strong><small>'+esc(t.target_repository)+' · '+esc(t.status)+'</small></div><div class="agent-task-actions"><button class="secondary" data-agent-run="'+esc(t.id)+'">创建 Run</button><button class="secondary" data-agent-detail="'+esc(t.id)+'">详情</button></div></article>').join(""):'<p class="agent-empty">还没有任务。</p>';
}
async function refresh(){const d=await request("/agent/tasks?limit=50");renderTasks(d.items||[]);}
async function loadRun(id){
 const r=await request("/agent/runs/"+encodeURIComponent(id));runId=r.id;
 $("agent-run-panel").hidden=false;$("agent-run-title").textContent="Run #"+r.run_number+" · "+r.status;
 $("agent-run-steps").innerHTML=(r.steps||[]).map(s=>'<li class="agent-step"><span><strong>'+esc(s.title)+'</strong><small>'+esc(s.step_key)+'</small></span><span>'+esc(s.status)+'</span></li>').join("");
 const summary=(r.steps||[]).find(s=>s.step_key==="summarize");
 $("agent-report").textContent=summary&&summary.result&&summary.result.report_markdown||"报告将在汇总步骤完成后生成。";
 $("agent-execute").hidden=!["queued","running"].includes(r.status);
 $("agent-pause").hidden=!["queued","running"].includes(r.status);
 $("agent-resume").hidden=r.status!=="paused";
}
$("open-agent-workspace").addEventListener("click",()=>{dialog.showModal();if(auth)refresh().catch(e=>status(e.message,true));});
$("agent-close").addEventListener("click",()=>dialog.close());
dialog.addEventListener("close",()=>{auth=null;runId=null;$("agent-password").value="";$("agent-login-panel").hidden=false;$("agent-main-panel").hidden=true;$("agent-run-panel").hidden=true;status("已断开连接，密码已从页面内存清除。");});
$("agent-connect").addEventListener("click",async()=>{
 const username=$("agent-username").value.trim(),password=$("agent-password").value;
 if(!username||!password)return status("请输入账号和密码。",true);
 auth={username,password};lock(true);
 try{await refresh();$("agent-login-panel").hidden=true;$("agent-main-panel").hidden=false;status("连接成功。密码仅保留在当前页面内存中。");}
 catch(e){auth=null;status(e.message,true);}finally{lock(false);}
});
$("agent-refresh").addEventListener("click",async()=>{lock(true);try{await refresh();status("任务列表已刷新。");}catch(e){status(e.message,true);}finally{lock(false);}});
$("agent-create-task").addEventListener("submit",async e=>{
 e.preventDefault();lock(true);
 try{
  const task=await request("/agent/tasks","POST",{title:$("agent-task-title").value.trim(),description:$("agent-task-description").value.trim(),task_type:"repository_audit",target_repository:$("agent-target-repository").value.trim(),scope:{standard_repository:$("agent-standard-repository").value.trim()}});
  $("agent-create-task").reset();$("agent-standard-repository").value="ouyangxinwei/oooo_Dev_Standard";await refresh();status("Task 已创建："+task.id);
 }catch(err){status(err.message,true);}finally{lock(false);}
});
$("agent-task-list").addEventListener("click",async e=>{
 const run=e.target.closest("[data-agent-run]"),detail=e.target.closest("[data-agent-detail]");if(!run&&!detail)return;lock(true);
 try{
  if(run){const r=await request("/agent/tasks/"+encodeURIComponent(run.dataset.agentRun)+"/runs","POST",{reason:"manual"});await loadRun(r.id);status("Run 已创建。");}
  else{const t=await request("/agent/tasks/"+encodeURIComponent(detail.dataset.agentDetail));if(t.runs&&t.runs.length)await loadRun(t.runs[0].id);else status("该任务尚无 Run。");}
  await refresh();
 }catch(err){status(err.message,true);}finally{lock(false);}
});
$("agent-execute").addEventListener("click",async()=>{if(!runId)return;lock(true);try{
 let result,count=0;do{result=await request("/agent/runs/"+encodeURIComponent(runId)+"/execute","POST",{});count++;if(count>=5||!result.next_step_available)break;}while(true);
 await loadRun(runId);await refresh();status("本次执行 "+count+" 个 Step。每次最多 5 步，可继续点击。");
 }catch(e){status(e.message,true);}finally{lock(false);}});
$("agent-pause").addEventListener("click",async()=>{if(!runId)return;lock(true);try{await request("/agent/runs/"+encodeURIComponent(runId)+"/pause","POST",{});await loadRun(runId);status("Run 已暂停。");}catch(e){status(e.message,true);}finally{lock(false);}});
$("agent-resume").addEventListener("click",async()=>{if(!runId)return;lock(true);try{await request("/agent/runs/"+encodeURIComponent(runId)+"/resume","POST",{});await loadRun(runId);status("Run 已恢复。");}catch(e){status(e.message,true);}finally{lock(false);}});
})();