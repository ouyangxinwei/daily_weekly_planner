// Startup entry routing — select a display mode, then open the existing planner UI.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const gate = $('access-gate'), chooser = $('entry-screen'), login = $('access-form');
  const app = $('app-shell');

  function showEntry() {
    gate.hidden = false;
    chooser.hidden = false;
    if (login) login.hidden = true;
    app.hidden = true;
  }

  function enterWorkspace(role) {
    if (!window.PlannerRole?.setRole(role)) return;
    if (role === 'admin') {
      // Admin mode always opens the management toolbar, regardless of the last personal workspace.
      delete document.documentElement.dataset.workspace;
      const tagline = $('brand-tagline');
      if (tagline) tagline.textContent = '系统管理与维护工具';
    } else {
      const tagline = $('brand-tagline');
      if (tagline) tagline.textContent = '把想做的事，一件件完成';
    }
    gate.hidden = true;
    app.hidden = false;
    window.dispatchEvent(new CustomEvent('planner-workspace-entry', { detail: { role } }));
  }

  function openExisting(id) {
    const target = $(id);
    if (target) target.click();
  }

  $('choose-personal')?.addEventListener('click', () => enterWorkspace('personal'));
  $('choose-admin')?.addEventListener('click', () => enterWorkspace('admin'));
  $('personal-logout')?.addEventListener('click', () => openExisting('sync-logout'));
  // Admin logout uses the same existing logout path, clearing the cloud session and returning to the entry chooser.
  $('admin-return-entry')?.addEventListener('click', () => openExisting('sync-logout'));

  // The existing logout action returns to the mode chooser; it does not open another login page.
  window.addEventListener('planner-auth-change', () => {
    if (app.hidden && !gate.hidden) showEntry();
  });

  // Test pages can explicitly return to the administrator workspace without showing the entry chooser.
  if (new URLSearchParams(window.location.search).get('entry') === 'admin') enterWorkspace('admin');
  else showEntry();
})();
