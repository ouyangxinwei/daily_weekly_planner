// Startup entry routing — V10.71. Administrator mode is a public, read-only learning view.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const gate = $('access-gate'), chooser = $('entry-screen'), login = $('access-form');
  const admin = $('admin-dashboard'), app = $('app-shell');
  function showEntry(){gate.hidden=false;chooser.hidden=false;login.hidden=true;admin.hidden=true;app.hidden=true;}
  function showLogin(){gate.hidden=false;chooser.hidden=true;login.hidden=false;admin.hidden=true;app.hidden=true;$('gate-username')?.focus();}
  function openExisting(id){const target=$(id);if(target)target.click();}
  function showAdmin(){gate.hidden=true;login.hidden=true;chooser.hidden=true;app.hidden=true;admin.hidden=false;const v=$('release-current-version')?.textContent?.trim();$('admin-current-version').textContent=v||'—';}
  $('choose-personal')?.addEventListener('click',()=>{window.PlannerRole?.setRole('personal');showLogin();});
  $('choose-admin')?.addEventListener('click',()=>{window.PlannerRole?.setRole('admin');showAdmin();});
  $('personal-back')?.addEventListener('click',showEntry);
  $('admin-back-to-entry')?.addEventListener('click',showEntry);
  $('admin-open-health')?.addEventListener('click',()=>openExisting('open-health-check'));
  $('admin-open-logs')?.addEventListener('click',()=>openExisting('open-runtime-logs'));
  $('admin-open-release')?.addEventListener('click',()=>openExisting('open-release'));
  $('admin-open-tests')?.addEventListener('click',()=>openExisting('open-automation-tests'));
  window.addEventListener('planner-auth-change',()=>window.setTimeout(()=>{if(app.hidden&&!admin.hidden)return;if(app.hidden&&!gate.hidden)showEntry();},0));
  showEntry();
})();
