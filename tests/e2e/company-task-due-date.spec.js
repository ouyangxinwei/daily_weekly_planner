import { test, expect } from '@playwright/test';
import { openLocalTestApp } from './helpers.js';

const CUSTOMER_ID = '00000000-0000-4000-8000-000000000151';
const PROJECT_A = '00000000-0000-4000-8000-000000000152';
const PROJECT_B = '00000000-0000-4000-8000-000000000153';

function addDays(dateKey, days) {
  const date = new Date(dateKey + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test('task due-date filters compose with search, status, project, and paginate the filtered result set', async ({ page }) => {
  await openLocalTestApp(page);
  await page.evaluate(() => {
    window.PlannerCompanyContext = Object.freeze({ getAuth: () => ({
      url:'https://kopvznygsqsheibsjjvv.supabase.co', key:'playwright-public-key',
      username:'oooo', password:'not-a-real-password'
    }) });
  });
  const today = await page.evaluate(() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  });
  const projects = [
    { id:PROJECT_A, record_type:'project', title:'Filter project A', parent_record_id:CUSTOMER_ID, status:'active', data:{} },
    { id:PROJECT_B, record_type:'project', title:'Filter project B', parent_record_id:CUSTOMER_ID, status:'active', data:{} }
  ];
  const tasks = [];
  for (let i=0;i<22;i++) {
    tasks.push({ id:'today-'+i, record_type:'task', title:'Today target '+String(i+1).padStart(2,'0'), parent_record_id:i<12?PROJECT_A:PROJECT_B, status:i===21?'in_progress':'todo', due_date:today, data:{} });
  }
  for (let i=0;i<3;i++) tasks.push({ id:'overdue-'+i, record_type:'task', title:'Overdue task '+i, parent_record_id:PROJECT_A, status:'todo', due_date:addDays(today,-i-1), data:{} });
  tasks.push({ id:'overdue-done', record_type:'task', title:'Completed overdue task', parent_record_id:PROJECT_A, status:'completed', due_date:addDays(today,-2), data:{} });
  tasks.push({ id:'future-6', record_type:'task', title:'Due in six days', parent_record_id:PROJECT_B, status:'todo', due_date:addDays(today,6), data:{} });
  tasks.push({ id:'future-7', record_type:'task', title:'Due in seven days', parent_record_id:PROJECT_B, status:'todo', due_date:addDays(today,7), data:{} });
  tasks.push({ id:'no-due', record_type:'task', title:'Unscheduled task', parent_record_id:PROJECT_A, status:'todo', due_date:null, data:{} });

  const cors = (route, options) => route.fulfill({ ...options, headers:{ 'Access-Control-Allow-Origin':'http://127.0.0.1:4173', ...(options.headers||{}) } });
  await page.route('**/functions/v1/company-api/**', async route => {
    const req=route.request(), url=new URL(req.url()), path=url.pathname.replace('/functions/v1/company-api',''), method=req.method();
    if(method==='OPTIONS'){await cors(route,{status:204,headers:{'Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info'}});return;}
    if(method==='POST'&&path==='/auth/verify'){await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{authenticated:true,username:'oooo'}})});return;}
    if(method==='GET'&&path.startsWith('/customers')){await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{items:[{id:CUSTOMER_ID,record_type:'customer',title:'Filter customer',status:'active',data:{}}],total:1,limit:100,offset:0}})});return;}
    if(method==='GET'&&path==='/records'){
      const type=url.searchParams.get('record_type');
      const rows=type==='project'?projects:type==='task'?tasks:[];
      const offset=Number(url.searchParams.get('offset')||0), limit=Number(url.searchParams.get('limit')||100);
      await cors(route,{status:200,contentType:'application/json',body:JSON.stringify({data:{items:rows.slice(offset,offset+limit),total:rows.length,limit,offset}})});return;
    }
    await cors(route,{status:404,contentType:'application/json',body:JSON.stringify({error:'NOT_FOUND'})});
  });

  await page.locator('#workspace-company').click();
  await expect(page.locator('#company-workspace-root')).toBeVisible();
  await page.locator('#cw-business-nav button[data-tab="tasks"]').click();
  const dueFilter=page.locator('#cw-business-due-filter');
  await expect(dueFilter).toBeVisible();

  await dueFilter.selectOption('overdue');
  await expect(page.locator('.cw-business-card')).toHaveCount(3);
  await expect(page.locator('#cw-business-list')).not.toContainText('Completed overdue task');

  await dueFilter.selectOption('today');
  await expect(page.locator('#cw-business-feedback')).toContainText('22');
  await expect(page.locator('.cw-business-card')).toHaveCount(20);
  await expect(page.locator('#cw-business-pagination')).toContainText('1 / 2');
  await page.locator('#cw-business-pagination button').last().click();
  await expect(page.locator('.cw-business-card')).toHaveCount(2);
  await expect(page.locator('#cw-business-pagination')).toContainText('2 / 2');

  await dueFilter.selectOption('next7');
  await expect(page.locator('#cw-business-feedback')).toContainText('23');
  await expect(page.locator('#cw-business-list')).toContainText('Due in six days');
  await expect(page.locator('#cw-business-list')).not.toContainText('Due in seven days');

  await dueFilter.selectOption('none');
  await expect(page.locator('.cw-business-card')).toHaveCount(1);
  await expect(page.locator('#cw-business-list')).toContainText('Unscheduled task');

  await dueFilter.selectOption('today');
  await page.locator('#cw-business-query').fill('Today target');
  await page.locator('#cw-business-search button').click();
  await page.locator('#cw-business-status').selectOption('todo');
  await page.locator('#cw-business-project-filter').selectOption(PROJECT_A);
  await expect(page.locator('#cw-business-feedback')).toContainText('12');
  await expect(page.locator('.cw-business-card')).toHaveCount(12);
  await expect(page.locator('#cw-business-list')).toContainText('Today target 01');
  await expect(page.locator('#cw-business-list')).not.toContainText('Today target 22');
});
