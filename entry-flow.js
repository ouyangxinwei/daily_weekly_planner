// Startup entry routing — both views use the existing account sign-in.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const gate = $('access-gate'), chooser = $('entry-screen'), login = $('access-form');
  const app = $('app-shell');
  function showEntry() {
    gate.hidden = false; chooser.hidden = false; login.hidden = true; app.hidden = true;
  }
  function showLogin() {
    const adminMode = window.PlannerRole?.getRole() === 'admin';
    gate.hidden = false; chooser.hidden = true; login.hidden = false; app.hidden = true;
    $('login-entry-title').textContent = adminMode ? '管理员入口' : '个人入口';
    $('login-entry-description').textContent = adminMode
      ? '使用现有数据库账号登录，进入管理员管理界面。'
      : '使用现有数据库账号登录，进入个人计划和工作管理。';
    $('gate-submit').textContent = adminMode ? '登录并进入管理员工作区' : '登录并进入个人工作区';
    $('gate-username')?.focus();
  }
  function openExisting(id) { const target = $(id); if (target) target.click(); }
  $('choose-personal')?.addEventListener('click', () => { window.PlannerRole?.setRole('personal'); showLogin(); });
  $('choose-admin')?.addEventListener('click', () => { window.PlannerRole?.setRole('admin'); showLogin(); });
  $('personal-back')?.addEventListener('click', showEntry);
  $('personal-logout')?.addEventListener('click', () => openExisting('sync-logout'));
  window.addEventListener('planner-auth-change', () => window.setTimeout(() => {
    if (app.hidden && !gate.hidden) showEntry();
  }, 0));
  showEntry();
})();
