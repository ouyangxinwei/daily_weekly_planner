import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

const CUSTOMER_ID = '00000000-0000-4000-8000-000000000061';
const PROJECT_ID = '00000000-0000-4000-8000-000000000062';
const TASK_ID = '00000000-0000-4000-8000-000000000063';
const FOLLOWUP_ID = '00000000-0000-4000-8000-000000000064';

test('company workspace supports navigation between customers, projects, tasks and follow-ups', async ({ page }) => {
  await openLocalTestApp(page);
  const customer = { id:CUSTOMER_ID, record_type:'customer', title:'Navigation Customer', business_type:'software', status:'active', data:{} };
  const project = { id:PROJECT_ID, record_type:'project', title:'Navigation Project', parent_record_id:CUSTOMER_ID, status:'active', data:{progress_percent:50,progress_mode:'manual'} };
  const task = { id:TASK_ID, record_type:'task', title:'Navigation Task', parent_record_id:PROJECT_ID, status:'in_progress', data:{} };
  const followup = { id:FOLLOWUP_ID, record_type:'follow_up', title:'Navigation Follow-up', parent_record_id:PROJECT_ID, related_record_ids:[CUSTOMER_ID], status:'pending', data:{customer_id:CUSTOMER_ID,project_id:PROJECT_ID,method:'meeting',outcome:'Discussed project scope'} };
  const records = [project, task, followup];

  await page.evaluate(() => {
    window.PlannerCompanyContext = Object.freeze({ getAuth: () => ({
      url:'https://kopvznygsqsheibsjjvv.supabase.co', key:'playwright-public-key',
      username:'oooo', password:'not-a-real-password'
    }) });
  });
  const cors = (route, options) => route.fulfill({ ...options, headers:{ 'Access-Control-Allow-Origin':'http://127.0.0.1:4173', ...(options.headers||{}) } });
  await page.route('**/functions/v1/company-api/**', async route => {
    const req=route.request(), url=new URL(req.url()), path=url.pathname.replace('/functions/v1/company-api',''), method=req.method();
    if(method==='OPTIONS'){await cors(route,{status:204,headers:{'Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info'}});return;}
    if(method==='POST'&&path==='/auth/verify'){await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{authenticated:true,username:'oooo'}})});return;}
    if(method==='GET'&&path==='/customers'){await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{items:[customer],total:1,limit:100,offset:0}})});return;}
    if(method==='GET'&&path==='/customers/'+CUSTOMER_ID){await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:customer})});return;}
    if(method==='GET'&&path==='/records'){
      const type=url.searchParams.get('record_type');
      const rows=records.filter(item=>item.record_type===type);
      await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{items:rows,total:rows.length,limit:Number(url.searchParams.get('limit')||20),offset:Number(url.searchParams.get('offset')||0)}})});return;
    }
    const taskRoute=path.match(/^\/projects\/([^/]+)\/tasks$/);
    if(method==='GET'&&taskRoute){const rows=records.filter(item=>item.record_type==='task'&&item.parent_record_id===taskRoute[1]);await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{items:rows,total:rows.length,limit:20,offset:0}})});return;}
    await cors(route,{status:404,contentType:'application/json',body:JSON.stringify({error:'NOT_FOUND'})});
  });

  await page.locator('#workspace-company').click();
  await expect(page.locator('#company-workspace-root')).toBeVisible();

  // Customer -> projects and follow-ups.
  await page.getByRole('button',{name:'查看项目'}).click();
  await expect(page.locator('#cw-business-nav button[data-tab="projects"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#cw-business-list')).toContainText('Navigation Project');

  // Project -> customer.
  await page.locator('.cw-business-card').getByRole('button',{name:'查看详情'}).click();
  await expect(page.locator('#cw-project-details')).toBeVisible();
  await page.locator('#cw-project-details-customer-action').click();
  await expect(page.locator('#cw-customer-panel')).toBeVisible();
  await expect(page.locator('#cw-customer-list')).toContainText('Navigation Customer');

  // Project -> tasks -> project details.
  await page.getByRole('button',{name:'查看项目'}).click();
  await page.locator('.cw-business-card').getByRole('button',{name:'查看详情'}).click();
  await page.locator('#cw-project-details-tasks').click();
  await expect(page.locator('#cw-business-nav button[data-tab="tasks"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#cw-business-list')).toContainText('Navigation Task');
  await page.locator('.cw-business-card').getByRole('button',{name:'查看项目'}).click();
  await expect(page.locator('#cw-project-details')).toBeVisible();
  await expect(page.locator('#cw-project-details-title')).toHaveText('Navigation Project');
  await page.locator('#cw-project-details-close-action').click();

  // Project -> follow-ups; follow-up -> customer and project.
  await page.locator('#cw-business-nav button[data-tab="projects"]').click();
  await page.locator('.cw-business-card').getByRole('button',{name:'查看详情'}).click();
  await page.locator('#cw-project-details-followups').click();
  await expect(page.locator('#cw-business-nav button[data-tab="followups"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#cw-business-list')).toContainText('Navigation Follow-up');
  await page.locator('.cw-business-card').getByRole('button',{name:'查看客户'}).click();
  await expect(page.locator('#cw-customer-list')).toContainText('Navigation Customer');
  await page.getByRole('button',{name:'查看跟进'}).click();
  await expect(page.locator('#cw-business-list')).toContainText('Navigation Follow-up');
  await page.locator('.cw-business-card').getByRole('button',{name:'查看项目'}).click();
  await expect(page.locator('#cw-project-details-title')).toHaveText('Navigation Project');
});
