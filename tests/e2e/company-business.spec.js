import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

const CUSTOMER_ID = '00000000-0000-4000-8000-000000000051';
const PROJECT_ID = '00000000-0000-4000-8000-000000000052';
const FOLLOWUP_ID = '00000000-0000-4000-8000-000000000053';
const TASK_ID = '00000000-0000-4000-8000-000000000054';
const TASK2_ID = '00000000-0000-4000-8000-000000000055';

test('company workspace manages projects and linked follow-ups through generic records API', async ({ page }) => {
  await openLocalTestApp(page);
  const customers = [{ id:CUSTOMER_ID, record_type:'customer', title:'E2E Customer', business_type:'software', status:'active', data:{} }];
  const records = [];
  const calls = [];
  function syncAutoProgress(projectId) {
    const project=records.find(r=>r.id===projectId&&r.record_type==='project');
    if(!project||project.data?.progress_mode!=='auto')return;
    const tasks=records.filter(r=>r.record_type==='task'&&r.parent_record_id===projectId);
    const completed=tasks.filter(r=>r.status==='completed').length;
    project.data.progress_task_total=tasks.length;
    project.data.progress_task_completed=completed;
    project.data.progress_percent=tasks.length?Math.round(completed*100/tasks.length):0;
  }
  await page.evaluate(() => {
    window.PlannerCompanyContext = Object.freeze({ getAuth: () => ({
      url:'https://kopvznygsqsheibsjjvv.supabase.co', key:'playwright-public-key',
      username:'oooo', password:'not-a-real-password'
    }) });
  });
  const cors = (route, options) => route.fulfill({ ...options, headers:{ 'Access-Control-Allow-Origin':'http://127.0.0.1:4173', ...(options.headers||{}) } });
  await page.route('**/functions/v1/company-api/**', async route => {
    const req=route.request(), url=new URL(req.url()), path=url.pathname.replace('/functions/v1/company-api',''), method=req.method();
    calls.push({method,path,auth:req.headers().authorization,body:method==='POST'||method==='PATCH'?req.postDataJSON():null});
    if(method==='OPTIONS'){await cors(route,{status:204,headers:{'Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info'}});return;}
    if(method==='POST'&&path==='/auth/verify'){await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{authenticated:true,username:'oooo'}})});return;}
    if(method==='GET'&&path==='/customers'){await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{items:customers,total:customers.length,limit:100,offset:0}})});return;}
    const projectTasksMatch=path.match(/^\/projects\/([0-9a-f-]+)\/tasks$/);
    if(method==='GET'&&projectTasksMatch){
      const projectId=projectTasksMatch[1], q=(url.searchParams.get('q')||'').toLowerCase(), status=url.searchParams.get('status')||'';
      const rows=records.filter(r=>r.record_type==='task'&&r.parent_record_id===projectId&&(!q||r.title.toLowerCase().includes(q))&&(!status||r.status===status));
      await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{items:rows,total:rows.length,limit:20,offset:0}})});return;
    }
    if(method==='GET'&&path==='/records'){
      const type=url.searchParams.get('record_type'), q=(url.searchParams.get('q')||'').toLowerCase(), status=url.searchParams.get('status')||'';
      const rows=records.filter(r=>r.record_type===type&&(!q||r.title.toLowerCase().includes(q))&&(!status||r.status===status));
      await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{items:rows,total:rows.length,limit:20,offset:0}})});return;
    }
    if(method==='POST'&&path==='/records'){
      const body=req.postDataJSON(), id=body.record_type==='project'?PROJECT_ID:body.record_type==='task'?(records.some(r=>r.id===TASK_ID)?TASK2_ID:TASK_ID):FOLLOWUP_ID;
      const row={id,...body,created_at:new Date().toISOString(),updated_at:new Date().toISOString()};records.push(row);
      if(body.record_type==='task')syncAutoProgress(body.parent_record_id);
      if(body.record_type==='project')syncAutoProgress(id);
      await cors(route,{status:201,contentType:'application/json',body:JSON.stringify({data:row})});return;
    }
    const match=path.match(/^\/records\/([0-9a-f-]+)$/);
    if(match&&method==='PATCH'){
      const row=records.find(r=>r.id===match[1]), patch=req.postDataJSON();
      const oldProjectId=row.record_type==='task'?row.parent_record_id:null;
      const oldMode=row.record_type==='project'?row.data?.progress_mode:null;
      Object.assign(row,patch);
      if(row.record_type==='task'){syncAutoProgress(oldProjectId);syncAutoProgress(row.parent_record_id);}
      if(row.record_type==='project'){
        if(row.data?.progress_mode==='auto')syncAutoProgress(row.id);
        else if(oldMode==='auto'&&row.data?.progress_mode==='manual')row.data.progress_percent=row.data.manual_progress_percent??row.data.progress_percent;
      }
      await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:row})});return;
    }
    if(match&&method==='DELETE'){
      const target=records.find(r=>r.id===match[1]);
      if(target?.record_type==='project'&&records.some(r=>r.parent_record_id===target.id||(r.related_record_ids||[]).includes(target.id))){
        await cors(route,{status:409,contentType:'application/json',body:JSON.stringify({error:'RECORD_IN_USE_OR_INVALID_RELATION'})});return;
      }
      const index=records.findIndex(r=>r.id===match[1]), removed=index>=0?records[index]:null;
      if(index>=0)records.splice(index,1);
      if(removed?.record_type==='task')syncAutoProgress(removed.parent_record_id);
      await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{deleted:true}})});return;
    }
    await cors(route,{status:404,contentType:'application/json',body:JSON.stringify({error:'NOT_FOUND'})});
  });

  await page.locator('#workspace-company').click();
  await expect(page.locator('#company-workspace-root')).toBeVisible();
  await page.locator('#cw-business-nav button[data-tab="projects"]').click();
  await page.locator('#cw-business-new').click();
  await page.locator('#cw-biz-title').fill('E2E Website Redesign');
  await page.locator('#cw-biz-customer').selectOption(CUSTOMER_ID);
  await page.locator('#cw-biz-status').selectOption('active');
  await page.locator('#cw-biz-description').fill('Build a customer portal');
  await page.locator('#cw-biz-progress').fill('35');
  await page.locator('#cw-business-form button[type="submit"]').click();
  await expect(page.locator('#cw-business-list')).toContainText('E2E Website Redesign');
  await expect(page.locator('#cw-business-list')).toContainText('35%');
  expect(records[0].parent_record_id).toBe(CUSTOMER_ID);
  expect(records[0].data.progress_percent).toBe(35);
  await page.locator('#cw-business-list button').filter({hasText:'查看详情'}).click();
  await expect(page.locator('#cw-project-details')).toBeVisible();
  await expect(page.locator('#cw-project-details')).toContainText('35%');
  await expect(page.locator('#cw-project-details')).toContainText('Build a customer portal');
  await page.locator('#cw-project-details-tasks').click();
  await expect(page.locator('#cw-business-nav button[data-tab="tasks"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#cw-business-project-filter')).toHaveValue(PROJECT_ID);
  await page.locator('#cw-business-nav button[data-tab="projects"]').click();
  await expect(page.locator('#cw-project-details')).not.toBeVisible();
  await page.locator('#cw-business-list button').filter({hasText:'编辑'}).click();
  await page.locator('#cw-biz-title').fill('E2E Website Redesign Updated');
  await page.locator('#cw-biz-progress').fill('70');
  await page.locator('#cw-business-form button[type="submit"]').click();
  await expect(page.locator('#cw-business-list')).toContainText('E2E Website Redesign Updated');
  expect(calls.some(c=>c.method==='PATCH'&&c.path==='/records/'+PROJECT_ID)).toBe(true);
  expect(records[0].data.progress_percent).toBe(70);
  expect(records[0].data.manual_progress_percent).toBe(70);

  await page.locator('#cw-business-list button').filter({hasText:'编辑'}).click();
  await page.locator('#cw-biz-progress-mode').selectOption('auto');
  await expect(page.locator('#cw-biz-progress')).toBeDisabled();
  await expect(page.locator('#cw-biz-progress-hint')).toContainText('已完成任务数');
  await page.locator('#cw-business-form button[type="submit"]').click();
  expect(records[0].data.progress_mode).toBe('auto');
  expect(records[0].data.progress_percent).toBe(0);
  expect(records[0].data.manual_progress_percent).toBe(70);

  await page.locator('#cw-business-nav button[data-tab="followups"]').click();
  await page.locator('#cw-business-new').click();
  await page.locator('#cw-biz-title').fill('Discuss initial requirements');
  await page.locator('#cw-biz-customer').selectOption(CUSTOMER_ID);
  await page.locator('#cw-biz-project').selectOption(PROJECT_ID);
  await page.locator('#cw-biz-method').selectOption('meeting');
  await page.locator('#cw-biz-outcome').fill('Requirements confirmed');
  await page.locator('#cw-biz-next').fill('2026-11-27');
  await page.locator('#cw-business-form button[type="submit"]').click();
  await expect(page.locator('#cw-business-list')).toContainText('Discuss initial requirements');
  expect(records[1].record_type).toBe('follow_up');
  expect(records[1].parent_record_id).toBe(PROJECT_ID);
  expect(records[1].related_record_ids).toContain(CUSTOMER_ID);

  await page.locator('#cw-business-list button').filter({hasText:'编辑'}).click();
  await page.locator('#cw-biz-title').fill('Discuss revised requirements');
  await page.locator('#cw-business-form button[type="submit"]').click();
  await expect(page.locator('#cw-business-list')).toContainText('Discuss revised requirements');
  expect(calls.some(c=>c.method==='PATCH'&&c.path==='/records/'+FOLLOWUP_ID)).toBe(true);

  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#cw-business-list button').filter({hasText:'删除'}).click();
  await expect(page.locator('#cw-business-list')).toContainText('还没有跟进记录');
  await page.locator('#cw-business-nav button[data-tab="tasks"]').click();
  await page.locator('#cw-business-project-filter').selectOption(PROJECT_ID);
  await page.locator('#cw-business-new').click();
  await page.locator('#cw-biz-title').fill('Build project landing page');
  await page.locator('#cw-biz-project').selectOption(PROJECT_ID);
  await page.locator('#cw-biz-status').selectOption('in_progress');
  await page.locator('#cw-biz-due').fill('2026-12-01');
  await page.locator('#cw-biz-description').fill('Create responsive landing page');
  await page.locator('#cw-business-form button[type="submit"]').click();
  await expect(page.locator('#cw-business-list')).toContainText('Build project landing page');
  await expect(page.locator('#cw-business-list')).toContainText('2026');
  const taskRecord=records.find(r=>r.record_type==='task');
  expect(taskRecord.parent_record_id).toBe(PROJECT_ID);
  expect(taskRecord.status).toBe('in_progress');
  expect(taskRecord.due_date).toBe('2026-12-01');
  expect(taskRecord.data.description).toBe('Create responsive landing page');
  expect(records[0].data.progress_percent).toBe(0);
  expect(records[0].data.progress_task_total).toBe(1);
  expect(calls.some(c=>c.method==='GET'&&c.path==='/projects/'+PROJECT_ID+'/tasks')).toBe(true);

  await page.locator('#cw-business-new').click();
  await page.locator('#cw-biz-title').fill('Prepare launch checklist');
  await page.locator('#cw-biz-project').selectOption(PROJECT_ID);
  await page.locator('#cw-biz-status').selectOption('todo');
  await page.locator('#cw-business-form button[type="submit"]').click();
  const secondTask=records.find(r=>r.id===TASK2_ID);
  expect(secondTask.parent_record_id).toBe(PROJECT_ID);
  expect(records[0].data.progress_task_total).toBe(2);
  expect(records[0].data.progress_percent).toBe(0);

  await page.locator('.cw-business-card').filter({hasText:'Build project landing page'}).getByRole('button',{name:'编辑'}).click();
  await page.locator('#cw-biz-status').selectOption('completed');
  await page.locator('#cw-business-form button[type="submit"]').click();
  expect(taskRecord.status).toBe('completed');
  expect(records[0].data.progress_percent).toBe(50);
  expect(records[0].data.progress_task_completed).toBe(1);

  await page.locator('.cw-business-card').filter({hasText:'Prepare launch checklist'}).getByRole('button',{name:'编辑'}).click();
  await page.locator('#cw-biz-status').selectOption('completed');
  await page.locator('#cw-business-form button[type="submit"]').click();
  expect(secondTask.status).toBe('completed');
  expect(records[0].data.progress_percent).toBe(100);

  await page.locator('#cw-business-nav button[data-tab="projects"]').click();
  await expect(page.locator('#cw-business-list')).toContainText('100%');
  await expect(page.locator('#cw-business-list')).toContainText('按任务自动计算');
  await page.locator('.cw-business-card').filter({hasText:'E2E Website Redesign Updated'}).getByRole('button',{name:'编辑'}).click();
  await page.locator('#cw-biz-progress-mode').selectOption('manual');
  await expect(page.locator('#cw-biz-progress')).toBeEnabled();
  await expect(page.locator('#cw-biz-progress')).toHaveValue('70');
  await page.locator('#cw-business-form button[type="submit"]').click();
  expect(records[0].data.progress_mode).toBe('manual');
  expect(records[0].data.progress_percent).toBe(70);

  await page.locator('#cw-business-nav button[data-tab="tasks"]').click();
  await page.locator('.cw-business-card').filter({hasText:'Build project landing page'}).getByRole('button',{name:'编辑'}).click();
  await page.locator('#cw-biz-status').selectOption('todo');
  await page.locator('#cw-business-form button[type="submit"]').click();
  expect(records[0].data.progress_percent).toBe(70);
  await page.locator('#cw-business-nav button[data-tab="projects"]').click();
  await expect(page.locator('#cw-business-list')).toContainText('70%');
  await expect(page.locator('#cw-business-list')).toContainText('手动设置');

  await page.locator('.cw-business-card').filter({hasText:'E2E Website Redesign Updated'}).getByRole('button',{name:'编辑'}).click();
  await page.locator('#cw-biz-progress-mode').selectOption('auto');
  await page.locator('#cw-business-form button[type="submit"]').click();
  expect(records[0].data.progress_percent).toBe(50);
  await page.locator('#cw-business-nav button[data-tab="tasks"]').click();
  await page.locator('.cw-business-card').filter({hasText:'Prepare launch checklist'}).getByRole('button',{name:'编辑'}).click();
  await page.locator('#cw-biz-status').selectOption('todo');
  await page.locator('#cw-business-form button[type="submit"]').click();
  expect(records[0].data.progress_percent).toBe(0);

  await page.locator('#cw-business-nav button[data-tab="projects"]').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#cw-business-list button').filter({hasText:'删除'}).click();
  await expect(page.locator('#cw-business-feedback')).toContainText('该项目仍有关联的任务或跟进记录');
  expect(records.some(r=>r.record_type==='task'&&r.parent_record_id===PROJECT_ID)).toBe(true);
  await page.locator('#cw-business-nav button[data-tab="tasks"]').click();

  await page.locator('#cw-business-list button').filter({hasText:'编辑'}).click();
  await page.locator('#cw-biz-title').fill('Build project landing page v2');
  await page.locator('#cw-biz-status').selectOption('completed');
  await page.locator('#cw-biz-due').fill('2026-12-05');
  await page.locator('#cw-business-form button[type="submit"]').click();
  await expect(page.locator('#cw-business-list')).toContainText('Build project landing page v2');
  expect(taskRecord.status).toBe('completed');
  expect(taskRecord.due_date).toBe('2026-12-05');
  expect(calls.some(c=>c.method==='PATCH'&&c.path==='/records/'+TASK_ID)).toBe(true);

  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#cw-business-list button').filter({hasText:'删除'}).click();
  await expect(page.locator('#cw-business-list')).toContainText('这个项目还没有任务');
  expect(calls.some(c=>c.method==='DELETE'&&c.path==='/records/'+TASK_ID)).toBe(true);

  await page.locator('#cw-business-nav button[data-tab="projects"]').click();
  await page.locator('#cw-business-nav button[data-tab="tasks"]').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('.cw-business-card').filter({hasText:'Prepare launch checklist'}).getByRole('button',{name:'删除'}).click();
  await page.locator('.cw-business-card').filter({hasText:'Build project landing page'}).getByRole('button',{name:'删除'}).click();
  expect(records[0].data.progress_task_total).toBe(0);
  expect(records[0].data.progress_percent).toBe(0);

  await page.locator('#cw-business-nav button[data-tab="projects"]').click();
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#cw-business-list button').filter({hasText:'删除'}).click();
  await expect(page.locator('#cw-business-list')).toContainText('还没有项目');
  expect(calls.some(c=>c.method==='DELETE'&&c.path==='/records/'+PROJECT_ID)).toBe(true);
  expect(calls.some(c=>c.method==='POST'&&c.path==='/records')).toBe(true);
  expect(calls.filter(c=>c.method!=='OPTIONS').every(c=>c.auth?.startsWith('Basic '))).toBe(true);
  expect(records).toHaveLength(0);
});