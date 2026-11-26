// Interface mode ("role") selection — V10.69.
// This only changes which entries are shown; it is NOT access control.
// The role lives in this browser only (localStorage) and is never synced.
// Hiding is done by CSS: html[data-role="personal"] [data-admin-only]{display:none!important}.
// The early boot script in index.html sets data-role before first paint to avoid flicker.
(function () {
  'use strict';
  const KEY = 'planner:user_role';
  const ROLES = ['personal', 'admin'];
  const $ = id => document.getElementById(id);

  function getRole() {
    try {
      const v = localStorage.getItem(KEY);
      return ROLES.includes(v) ? v : null;
    } catch (e) {
      return null;
    }
  }

  // No stored role means the full interface (existing users keep everything).
  function applyRole(role) {
    if (role === 'personal') document.documentElement.dataset.role = 'personal';
    else if (role === 'admin') document.documentElement.dataset.role = 'admin';
    else delete document.documentElement.dataset.role;
    document.querySelectorAll('#role-dialog [data-role]').forEach(btn => {
      const current = btn.dataset.role === (role || 'admin');
      btn.setAttribute('aria-pressed', String(current));
    });
  }

  function setRole(role) {
    if (!ROLES.includes(role)) return false;
    try { localStorage.setItem(KEY, role); } catch (e) { /* still apply for this page */ }
    applyRole(role);
    return true;
  }

  function clearRole() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    applyRole(null);
  }

  function openRoleDialog() {
    const dialog = $('role-dialog');
    if (!dialog || dialog.open) return;
    applyRole(getRole());
    dialog.showModal();
    const current = dialog.querySelector('[data-role][aria-pressed="true"]');
    if (current) current.focus();
  }

  function isSignedIn() {
    const shell = $('app-shell');
    return Boolean(shell && !shell.hidden);
  }

  function init() {
    const dialog = $('role-dialog');
    if (!dialog) return;
    applyRole(getRole());

    dialog.addEventListener('click', event => {
      const card = event.target.closest('[data-role]');
      if (card && dialog.contains(card)) {
        setRole(card.dataset.role);
        dialog.close();
      }
    });
    // Closing without a choice (Esc / close button) keeps the full interface.
    dialog.addEventListener('close', () => {
      if (!getRole()) setRole('admin');
    });
    $('role-dialog-close')?.addEventListener('click', () => dialog.close());

    // Sign-in: the app dispatches planner-auth-change and then shows #app-shell,
    // so check on the next task. Sign-out also dispatches it with the shell hidden.
    window.addEventListener('planner-auth-change', () => {
      setTimeout(() => {
        if (isSignedIn() && !getRole()) openRoleDialog();
      }, 0);
    });
    $('sync-logout')?.addEventListener('click', clearRole);
    $('sync-switch-role')?.addEventListener('click', openRoleDialog);
  }

  window.PlannerRole = Object.freeze({ key: KEY, getRole, setRole, clearRole, openRoleDialog });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
