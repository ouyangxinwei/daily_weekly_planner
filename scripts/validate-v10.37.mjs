import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const zh = fs.readFileSync('CHANGELOG.md', 'utf8');
const en = fs.readFileSync('CHANGELOG.en.md', 'utf8');
const ja = fs.readFileSync('CHANGELOG.ja.md', 'utf8');

assert.ok(html.includes("APP_VERSION='V10.37_sw_network_first'"));
assert.ok(sw.includes("const CACHE_NAME = 'daily-weekly-planner-v10-37-sw-network-first'"));
assert.equal(fs.readFileSync('VERSION', 'utf8').trim(), '10.37.0');
assert.ok(zh.startsWith('# V10.37') && en.startsWith('# V10.37') && ja.startsWith('# V10.37'));

// 在沙箱中执行 sw.js，模拟在线、离线与跨域请求
const ORIGIN = 'https://example.test';
const listeners = {};
const stored = new Map();
let online = true;
let networkCalls = [];
const cacheApi = {
  put: async (req, res) => { stored.set(typeof req === 'string' ? req : req.url, res); },
  addAll: async () => {}
};
const sandbox = {
  self: { location: { origin: ORIGIN }, addEventListener: (type, fn) => { listeners[type] = fn; }, skipWaiting() {}, clients: { claim() {} } },
  caches: {
    open: async () => cacheApi,
    keys: async () => [],
    delete: async () => true,
    match: async req => stored.get(typeof req === 'string' ? new URL(req, ORIGIN + '/').href : req.url)
  },
  fetch: async req => {
    networkCalls.push(req);
    if (!online) throw new TypeError('offline');
    return { ok: true, body: 'network:' + req.url, clone() { return { ...this, cloned: true }; } };
  },
  Request: class { constructor(url, init) { this.url = url; Object.assign(this, init); } },
  Response: { error: () => ({ ok: false, error: true }) },
  URL
};
vm.createContext(sandbox);
vm.runInContext(sw, sandbox);

const run = async (url, { method = 'GET', mode = 'cors' } = {}) => {
  let responded = null;
  const waits = [];
  listeners.fetch({ request: { url, method, mode }, respondWith: p => { responded = p; }, waitUntil: p => waits.push(p) });
  const res = responded ? await responded : undefined;
  await Promise.all(waits);
  return { res, intercepted: !!responded };
};

// 在线：总是请求网络（no-cache 重新验证），并更新缓存
stored.set(ORIGIN + '/index.html', { ok: true, body: 'old' });
let r = await run(ORIGIN + '/index.html', { mode: 'navigate' });
assert.equal(r.res.body, 'network:' + ORIGIN + '/index.html', 'online navigation must use the network, not the old cache');
assert.equal(networkCalls.at(-1).cache, 'no-cache');
assert.equal(networkCalls.at(-1).credentials, 'same-origin');
assert.ok(stored.get(ORIGIN + '/index.html').cloned, 'fresh response is written back to the cache');

// 离线：使用缓存
online = false;
r = await run(ORIGIN + '/index.html', { mode: 'navigate' });
assert.ok(r.res.cloned, 'offline navigation falls back to the cached page');

// 离线且无缓存的页面导航：回退到 index.html
r = await run(ORIGIN + '/unknown-page', { mode: 'navigate' });
assert.ok(r.res.cloned, 'offline unknown navigation falls back to index.html');

// 离线且无缓存的资源：返回网络错误，而不是 index.html
r = await run(ORIGIN + '/missing.js');
assert.equal(r.res.error, true);

// 跨域请求与非 GET 请求不经过 Service Worker
online = true;
networkCalls = [];
r = await run('https://project.supabase.co/rest/v1/rpc/planner_get_data');
assert.equal(r.intercepted, false);
r = await run(ORIGIN + '/index.html', { method: 'POST' });
assert.equal(r.intercepted, false);
assert.equal(networkCalls.length, 0);

console.log('V10.37 service worker network-first validation passed.');
