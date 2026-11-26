// Local interface mode is set by the startup entry chooser.
// It only controls visibility in the personal workspace; it is not authorization.
(function () {
  'use strict';
  const KEY = 'planner:user_role';
  const ROLES = ['personal', 'admin'];
  function getRole() {
    try { const value = localStorage.getItem(KEY); return ROLES.includes(value) ? value : null; }
    catch (error) { return null; }
  }
  function applyRole(role) {
    if (role === 'personal') document.documentElement.dataset.role = 'personal';
    else if (role === 'admin') document.documentElement.dataset.role = 'admin';
    else delete document.documentElement.dataset.role;
  }
  function setRole(role) {
    if (!ROLES.includes(role)) return false;
    try { localStorage.setItem(KEY, role); } catch (error) { /* apply for this page only */ }
    applyRole(role);
    return true;
  }
  function clearRole() {
    try { localStorage.removeItem(KEY); } catch (error) { /* ignore */ }
    applyRole(null);
  }
  function init() {
    applyRole(getRole());
    document.getElementById('sync-logout')?.addEventListener('click', clearRole);
  }
  window.PlannerRole = Object.freeze({ key: KEY, getRole, setRole, clearRole });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
