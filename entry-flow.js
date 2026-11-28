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

  // The existing logout action returns to the mode chooser; it does not open another login page.
  window.addEventListener('planner-auth-change', () => {
    if (app.hidden && !gate.hidden) showEntry();
  });

  showEntry();
})();
