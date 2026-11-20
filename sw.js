const CACHE_NAME = 'daily-weekly-planner-v10-49-related-record-shortcuts';
const APP_FILES = ['./', './index.html', './i18n.js', './logger.js', './runtime-logs.js', './health-check.js', './language-workspace.js', './language-workspace.css', './company-website.js', './company-website.css', './company-business.js', './company-business.css', './weather-dashboard.js', './weather-dashboard.css', './CHANGELOG.md', './CHANGELOG.en.md', './CHANGELOG.ja.md', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
// 网络优先：在线时总是向服务器确认最新版本（未变化时只返回 304），离线时才使用缓存。
// 跨域请求（Supabase 等）不经过 Service Worker。
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
