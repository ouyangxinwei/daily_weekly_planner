(function (global) {
  'use strict';

  const DB_NAME = 'manman-planner-runtime-logs';
  const DB_VERSION = 1;
  const STORE_NAME = 'entries';
  const SETTINGS_KEY = 'personal-planner:runtime-log-settings:v1';
  const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
  const MAX_ENTRIES = 10000;
  const FALLBACK_LIMIT = 200;
  let db = null;
  let enabled = true;
  let debugEnabled = false;
  let initialized = false;
  let writing = Promise.resolve();
  let fallback = [];
  let recursionGuard = false;
  const active = new Map();

  function nowIso() { return new Date().toISOString(); }
  function makeId() {
    try { return crypto.randomUUID(); }
    catch (_) { return 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
  }
  function redactString(value) {
    return String(value)
      .replace(/(password|passwd|token|authorization|api[_-]?key|secret|service[_-]?role|access[_-]?key)(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/ig, '$1$2[REDACTED]')
      .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/ig, 'Bearer [REDACTED]')
      .replace(/(https?:\/\/[^\s/?#]+\/[^\s?#]*\?[^\s#]*)(?=[\s"'<>]|$)/ig, '[URL REDACTED]');
  }
  function sanitize(value, depth) {
    if (depth > 4 || value == null) return value == null ? value : '[TRUNCATED]';
    if (typeof value === 'string') return redactString(value).slice(0, 3000);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (value instanceof Error) return {
      name: String(value.name || 'Error').slice(0, 120),
      message: redactString(value.message || '').slice(0, 2000),
      stack: redactString(value.stack || '').slice(0, 6000)
    };
    if (Array.isArray(value)) return value.slice(0, 30).map(item => sanitize(item, depth + 1));
    if (typeof value === 'object') {
      const out = {};
      for (const key of Object.keys(value).slice(0, 40)) {
        if (/password|passwd|token|secret|authorization|api.?key|service.?role|credential|session/i.test(key)) {
          out[key] = '[REDACTED]';
        } else {
          out[key] = sanitize(value[key], depth + 1);
        }
      }
      return out;
    }
    return String(value).slice(0, 500);
  }
  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) return reject(new Error('IndexedDB is unavailable'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('level', 'level', { unique: false });
          store.createIndex('module', 'module', { unique: false });
          store.createIndex('executionId', 'executionId', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open log database'));
      request.onblocked = () => reject(new Error('Log database upgrade is blocked'));
    });
  }
  function transaction(mode, callback) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Log database is not initialized'));
      let tx;
      try {
        tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const result = callback(store);
        tx.oncomplete = () => resolve(result);
        tx.onerror = tx.onabort = () => reject(tx.error || new Error('Log transaction failed'));
      } catch (error) { reject(error); }
    });
  }
  function queueWrite(record) {
    writing = writing.then(() => transaction('readwrite', store => store.put(record))).catch(() => {
      fallback.push(record);
      if (fallback.length > FALLBACK_LIMIT) fallback.shift();
    });
    return writing;
  }
  function write(level, moduleName, functionName, phase, message, details, trace) {
    if (!enabled || (level === 'DEBUG' && !debugEnabled)) return Promise.resolve(null);
    const record = {
      id: makeId(),
      createdAt: Date.now(),
      timestamp: nowIso(),
      level,
      module: String(moduleName || 'System').slice(0, 80),
      functionName: String(functionName || '').slice(0, 160),
      phase: String(phase || 'EVENT').slice(0, 40),
      result: trace && trace.result ? trace.result : '',
      executionId: trace && trace.executionId ? trace.executionId : '',
      spanId: trace && trace.spanId ? trace.spanId : '',
      parentSpanId: trace && trace.parentSpanId ? trace.parentSpanId : '',
      durationMs: trace && Number.isFinite(trace.durationMs) ? trace.durationMs : null,
      appVersion: String(trace && trace.appVersion || 'unknown').slice(0, 60),
      message: redactString(message || '').slice(0, 2000),
      details: sanitize(details || {}, 0)
    };
    return queueWrite(record).then(() => record).catch(() => null);
  }
  async function cleanup() {
    if (!db) return { deleted: 0 };
    const cutoff = Date.now() - RETENTION_MS;
    let deleted = 0;
    await transaction('readwrite', store => {
      const request = store.index('createdAt').openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (Number(cursor.value.createdAt) < cutoff) {
          cursor.delete();
          deleted++;
        }
        cursor.continue();
      };
    });
    const all = await getAll();
    if (all.length > MAX_ENTRIES) {
      const ranked = all.sort((a, b) => {
        const rank = level => level === 'DEBUG' ? 0 : level === 'INFO' ? 1 : level === 'WARN' ? 2 : 3;
        return rank(a.level) - rank(b.level) || a.createdAt - b.createdAt;
      });
      const removeCount = all.length - MAX_ENTRIES;
      const ids = new Set(ranked.slice(0, removeCount).map(item => item.id));
      await transaction('readwrite', store => ids.forEach(id => store.delete(id)));
      deleted += removeCount;
    }
    return { deleted };
  }
  function getAll() {
    return new Promise((resolve, reject) => {
      if (!db) return resolve(fallback.slice());
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('Unable to read logs'));
    });
  }
  async function init(options) {
    const opts = options || {};
    if (opts.appVersion) currentVersion = String(opts.appVersion);
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      debugEnabled = saved.debugEnabled === true;
    } catch (_) {}
    try {
      db = await openDatabase();
      initialized = true;
      await cleanup();
      await write('INFO', 'System', 'AppLogger.init', 'END', 'Runtime logger initialized', { storage: 'IndexedDB', retentionDays: 30, maxEntries: MAX_ENTRIES }, { appVersion: currentVersion });
      for (const record of fallback.splice(0)) await queueWrite(record);
      return { ok: true, storage: 'IndexedDB' };
    } catch (error) {
      initialized = false;
      fallback.push({
        id: makeId(), createdAt: Date.now(), timestamp: nowIso(), level: 'WARN',
        module: 'System', functionName: 'AppLogger.init', phase: 'FAILED', result: 'DEGRADED',
        executionId: '', spanId: '', parentSpanId: '', durationMs: null,
        appVersion: currentVersion, message: 'IndexedDB log storage unavailable; using temporary in-memory fallback',
        details: sanitize(error, 0)
      });
      return { ok: false, storage: 'memory', error: sanitize(error, 0) };
    }
  }
  let currentVersion = 'unknown';
  function start(moduleName, functionName, details, parentTrace) {
    const trace = {
      executionId: parentTrace && parentTrace.executionId || makeId(),
      spanId: makeId(),
      parentSpanId: parentTrace && parentTrace.spanId || '',
      startedAt: Date.now(),
      appVersion: currentVersion,
      result: 'RUNNING'
    };
    active.set(trace.spanId, trace);
    write('INFO', moduleName, functionName, 'START', 'Execution started', details, trace);
    return trace;
  }
  function finish(trace, result, level, message, details) {
    if (!trace || !trace.spanId) return Promise.resolve(null);
    trace.result = result;
    trace.durationMs = Math.max(0, Date.now() - trace.startedAt);
    active.delete(trace.spanId);
    return write(level || 'INFO', trace.module || 'System', trace.functionName || '', 'END', message || ('Execution ' + result.toLowerCase()), details, trace);
  }
  function end(trace, result, details) {
    if (trace) { trace.module = trace.module || 'System'; }
    return finish(trace, result || 'SUCCESS', 'INFO', 'Execution completed', details);
  }
  function fail(trace, error, details) {
    const info = sanitize(error, 0);
    if (trace) { trace.module = trace.module || 'System'; }
    return finish(trace, 'FAILED', 'ERROR', info && info.message || 'Execution failed', Object.assign({}, details || {}, { error: info }));
  }
  function cancel(trace, reason) {
    if (trace) trace.module = trace.module || 'System';
    return finish(trace, 'CANCELLED', 'INFO', 'Execution cancelled', { reason: sanitize(reason, 0) });
  }
  async function list(filters) {
    const f = filters || {};
    const records = await getAll();
    return records.filter(item =>
      (!f.level || item.level === f.level) &&
      (!f.module || item.module === f.module) &&
      (!f.executionId || item.executionId === f.executionId) &&
      (!f.from || item.createdAt >= Number(f.from)) &&
      (!f.to || item.createdAt <= Number(f.to)) &&
      (!f.query || (item.message + ' ' + item.functionName + ' ' + item.module + ' ' + JSON.stringify(item.details || {})).toLowerCase().includes(String(f.query).toLowerCase()))
    ).sort((a, b) => b.createdAt - a.createdAt);
  }
  async function clear() {
    fallback = [];
    if (!db) return false;
    await transaction('readwrite', store => store.clear());
    return true;
  }
  function setDebug(value) {
    debugEnabled = value === true;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ debugEnabled })); } catch (_) {}
    return debugEnabled;
  }
  function installGlobalHandlers() {
    if (global.__plannerLoggerHandlersInstalled) return;
    global.__plannerLoggerHandlersInstalled = true;
    global.addEventListener('error', event => {
      if (recursionGuard) return;
      recursionGuard = true;
      try { write('ERROR', 'System', 'window.error', 'FAILED', event.message || 'Uncaught runtime error', { filename: event.filename, line: event.lineno, column: event.colno, error: event.error }); }
      finally { recursionGuard = false; }
    });
    global.addEventListener('unhandledrejection', event => {
      if (recursionGuard) return;
      recursionGuard = true;
      try { write('ERROR', 'System', 'unhandledrejection', 'FAILED', 'Unhandled Promise rejection', { reason: event.reason }); }
      finally { recursionGuard = false; }
    });
  }

  const api = {
    init, write, info: (m, f, msg, d, t) => write('INFO', m, f, 'EVENT', msg, d, t),
    warn: (m, f, msg, d, t) => write('WARN', m, f, 'WARNING', msg, d, t),
    error: (m, f, msg, d, t) => write('ERROR', m, f, 'FAILED', msg, d, t),
    debug: (m, f, msg, d, t) => write('DEBUG', m, f, 'DEBUG', msg, d, t),
    start, end, fail, cancel, list, cleanup, clear, setDebug, installGlobalHandlers,
    getStatus: () => ({ initialized, debugEnabled, fallbackCount: fallback.length, activeCount: active.size, retentionDays: 30, maxEntries: MAX_ENTRIES })
  };
  global.AppLogger = api;
  installGlobalHandlers();
})(window);
