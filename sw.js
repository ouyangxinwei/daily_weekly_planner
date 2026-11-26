const CACHE_NAME = 'daily-weekly-planner-v10-69-ui-role-mode';
const APP_FILES = ['./', './index.html', './i18n.js', './logger.js', './runtime-logs.js', './health-check.js', './language-workspace.js', './language-workspace.css', './company-website.js', './company-website.css', './company-business.js', './company-record-loader.js', './company-task-date-filter.js', './company-overview-metrics.js', './company-todo-center.js', './company-project-customer-overview.js', './company-business-trends.js', './company-decision-center.js', './company-contribution-analysis.js', './company-customer-health.js', './company-project-delivery-analysis.js', './company-records-rules.js', './company-records-workspace.js', './company-business.css', './weather-dashboard.js', './weather-dashboard.css', './stock-dashboard.js', './stock-dashboard.css', './diary.js', './diary.css', './repository-management.js', './repository-management.css', './role-control.js', './CHANGELOG.md', './CHANGELOG.en.md', './CHANGELOG.ja.md', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
// Network first: fetch current assets online and use the cache only when offline.
// Cross-origin requests (including Supabase) are not intercepted by this service worker.
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' })).then(response => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
    }
    return response;
  }).catch(() => caches.match(request).then(cached => cached || (request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
