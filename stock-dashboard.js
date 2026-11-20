(() => {
  'use strict';
  const API = 'https://kopvznygsqsheibsjjvv.supabase.co/functions/v1/stock-market-api';
  const KEY = 'planner:stock-dashboard:v1';
  const TTL = 15 * 60 * 1000;
  const SYMBOLS = [
    { symbol: 'AAPL', name: 'Apple', zh: '苹果', ja: 'Apple' },
    { symbol: 'MSFT', name: 'Microsoft', zh: '微软', ja: 'Microsoft' },
    { symbol: 'NVDA', name: 'NVIDIA', zh: '英伟达', ja: 'NVIDIA' },
    { symbol: 'AMZN', name: 'Amazon', zh: '亚马逊', ja: 'Amazon' },
    { symbol: 'GOOGL', name: 'Alphabet', zh: '谷歌', ja: 'Alphabet' },
    { symbol: 'META', name: 'Meta', zh: 'Meta', ja: 'Meta' },
    { symbol: 'TSLA', name: 'Tesla', zh: '特斯拉', ja: 'Tesla' },
  ];
  const COPY = {
    zh: { title: '美股七巨头', loading: '正在读取最近交易周行情…', refresh: '立即刷新', refreshing: '刷新中…', updated: '行情已更新', cached: '15 分钟缓存有效', offline: '网络请求失败，正在显示历史缓存', failed: '股票行情暂时无法获取，请稍后重试', partial: '部分股票暂时无法取得行情', period: '最近交易周', latest: '最新收盘', daily: '当日', weekly: '本周', days: '每日收盘价', detail: '每日 OHLCV 详情', date: '日期', open: '开盘', high: '最高', low: '最低', close: '收盘', volume: '成交量', noData: '暂无可用数据', provisional: '当日行情可能尚未收盘', source: '数据来源：Yahoo Finance 非官方公开行情接口', note: '日线行情可能延迟或暂时不可用，仅供信息参考，不构成投资建议。', lastUpdated: '数据更新时间', cache: '离线缓存数据' },
    en: { title: 'Magnificent Seven', loading: 'Loading the latest trading-week data…', refresh: 'Refresh', refreshing: 'Refreshing…', updated: 'Market data updated', cached: '15-minute cache is valid', offline: 'Network request failed; showing cached data', failed: 'Stock data is temporarily unavailable. Please try again.', partial: 'Some stock quotes are temporarily unavailable', period: 'Latest trading week', latest: 'Latest close', daily: 'Daily', weekly: 'This week', days: 'Daily closing prices', detail: 'Daily OHLCV details', date: 'Date', open: 'Open', high: 'High', low: 'Low', close: 'Close', volume: 'Volume', noData: 'No data available', provisional: 'Current-day data may not be final', source: 'Source: unofficial public Yahoo Finance chart endpoint', note: 'Daily prices may be delayed or temporarily unavailable. For information only; not investment advice.', lastUpdated: 'Data updated', cache: 'Cached data' },
    ja: { title: 'マグニフィセント・セブン', loading: '直近の取引週データを取得中…', refresh: '更新', refreshing: '更新中…', updated: '株価データを更新しました', cached: '15分間のキャッシュが有効です', offline: '通信に失敗したため、保存済みデータを表示しています', failed: '株価データを取得できません。しばらくしてから再試行してください。', partial: '一部の銘柄データを取得できません', period: '直近の取引週', latest: '最新終値', daily: '前日比', weekly: '週間', days: '日別終値', detail: '日別 OHLCV 詳細', date: '日付', open: '始値', high: '高値', low: '安値', close: '終値', volume: '出来高', noData: 'データなし', provisional: '当日の株価は確定前の可能性があります', source: 'データ提供元：Yahoo Finance 非公式公開チャート API', note: '日次データには遅延や一時的な取得不可の場合があります。情報提供のみを目的とし、投資助言ではありません。', lastUpdated: '更新時刻', cache: 'キャッシュデータ' }
  };
  const root = () => document.getElementById('stock-dashboard');
  let busy = false;
  let language = 'zh';
  function copy() {
    const current = window.PlannerI18n?.getLanguage?.() || 'zh';
    language = current === 'en' || current === 'ja' ? current : 'zh';
    return COPY[language];
  }
  function el(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  }
  function number(value) { return typeof value === 'number' && Number.isFinite(value); }
  function cache() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || 'null');
      return value && number(value.fetchedAt) && Array.isArray(value.stocks) && value.stocks.length === 7 ? value : null;
    } catch (_) { return null; }
  }
  function save(value) {
    const saved = { ...value, fetchedAt: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) {}
    return saved;
  }
  function money(value, currency = 'USD') {
    if (!number(value)) return '—';
    try {
      return new Intl.NumberFormat(language === 'ja' ? 'ja-JP' : language === 'en' ? 'en-US' : 'zh-CN', {
        style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2
      }).format(value);
    } catch (_) { return '$' + value.toFixed(2); }
  }
  function percent(value) {
    if (!number(value)) return '—';
    return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
  }
  function signedMoney(value, currency) {
    if (!number(value)) return '—';
    return (value > 0 ? '+' : value < 0 ? '−' : '') + money(Math.abs(value), currency);
  }
  function changeClass(value) {
    return !number(value) || value === 0 ? 'stock-neutral' : value > 0 ? 'stock-up' : 'stock-down';
  }
  function formatDate(value, weekday = false) {
    if (!value) return '—';
    const date = new Date(value + 'T12:00:00Z');
    return new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : language === 'en' ? 'en-US' : 'zh-CN', {
      timeZone: 'America/New_York', month: 'numeric', day: 'numeric', ...(weekday ? { weekday: 'short' } : {})
    }).format(date);
  }
  function dateRange(data) {
    const dates = data.stocks.flatMap(stock => stock.days.map(day => day.date)).sort();
    if (!dates.length) return '—';
    return formatDate(dates[0]) + ' – ' + formatDate(dates[dates.length - 1]);
  }
  function renderCard(stock, offline = false) {
    const labels = copy();
    const meta = SYMBOLS.find(item => item.symbol === stock.symbol) || { name: stock.name, zh: stock.name, ja: stock.name };
    const card = el('article', 'stock-card');
    const head = el('div', 'stock-card-head');
    const identity = el('div', 'stock-identity');
    identity.append(el('strong', 'stock-company', language === 'zh' ? meta.zh : language === 'ja' ? meta.ja : meta.name));
    identity.append(el('span', 'stock-symbol', stock.symbol));
    head.append(identity);
    const daily = el('span', 'stock-change ' + changeClass(stock.dayChangePercent), labels.daily + ' ' + percent(stock.dayChangePercent));
    head.append(daily);
    card.append(head);
    const priceRow = el('div', 'stock-price-row');
    priceRow.append(el('span', 'stock-price-label', labels.latest));
    priceRow.append(el('strong', 'stock-price', money(stock.latestClose, stock.currency)));
    card.append(priceRow);
    const weekRow = el('div', 'stock-week-change');
    weekRow.append(el('span', '', labels.weekly + ' ' + signedMoney(stock.weekChange, stock.currency)));
    weekRow.append(el('strong', changeClass(stock.weekChangePercent), percent(stock.weekChangePercent)));
    card.append(weekRow);
    if (stock.isProvisional) card.append(el('p', 'stock-provisional', '◷ ' + labels.provisional));
    const days = el('div', 'stock-days');
    days.append(el('div', 'stock-days-heading', labels.days));
    const list = el('div', 'stock-days-list');
    (stock.days || []).forEach(day => {
      const row = el('div', 'stock-day-row');
      row.append(el('span', 'stock-day-date', formatDate(day.date, true)));
      row.append(el('strong', 'stock-day-close', money(day.close, stock.currency)));
      row.append(el('span', 'stock-day-change ' + changeClass(day.changePercent), percent(day.changePercent)));
      list.append(row);
    });
    days.append(list);
    card.append(days);
    const details = el('details', 'stock-details');
    details.append(el('summary', '', labels.detail));
    const table = el('div', 'stock-detail-table');
    const header = el('div', 'stock-detail-row stock-detail-header');
    [labels.date, labels.open, labels.high, labels.low, labels.close, labels.volume].forEach(label => header.append(el('span', '', label)));
    table.append(header);
    (stock.days || []).forEach(day => {
      const row = el('div', 'stock-detail-row');
      row.append(el('span', '', formatDate(day.date)));
      row.append(el('span', '', money(day.open, stock.currency)));
      row.append(el('span', '', money(day.high, stock.currency)));
      row.append(el('span', '', money(day.low, stock.currency)));
      row.append(el('span', '', money(day.close, stock.currency)));
      row.append(el('span', '', number(day.volume) ? new Intl.NumberFormat(language === 'ja' ? 'ja-JP' : language === 'en' ? 'en-US' : 'zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(day.volume) : '—'));
      table.append(row);
    });
    details.append(table);
    card.append(details);
    if (offline) card.append(el('span', 'stock-offline-label', labels.cache));
    return card;
  }
  function render(data, offline = false, message = '') {
    const host = root();
    if (!host) return;
    const labels = copy();
    const grid = host.querySelector('[data-stock-grid]');
    grid.replaceChildren();
    const stocks = Array.isArray(data?.stocks) ? data.stocks : [];
    if (stocks.length) {
      stocks.forEach(stock => grid.append(renderCard(stock, offline)));
      const missing = data.missingSymbols || [];
      if (missing.length) grid.append(el('p', 'stock-missing', labels.partial + ': ' + missing.join(', ')));
      const start = data.periodStart || stocks.flatMap(s => s.days.map(d => d.date)).sort()[0];
      const end = data.periodEnd || stocks.flatMap(s => s.days.map(d => d.date)).sort().slice(-1)[0];
      host.querySelector('[data-stock-period]').textContent = labels.period + ': ' + formatDate(start) + ' – ' + formatDate(end) + ' (US Eastern)';
      host.querySelector('[data-stock-status]').textContent = offline ? labels.offline : (message || (missing.length ? labels.partial : labels.updated));
      const updated = data.fetchedAt ? new Date(data.fetchedAt) : new Date();
      host.querySelector('[data-stock-time]').textContent = labels.lastUpdated + ': ' + new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : language === 'en' ? 'en-US' : 'zh-CN', {
        timeZone: 'Asia/Tokyo', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
      }).format(updated) + ' (JST)';
    } else {
      grid.append(el('p', 'stock-loading', message || labels.loading));
      host.querySelector('[data-stock-period]').textContent = '';
      host.querySelector('[data-stock-status]').textContent = labels.failed;
      host.querySelector('[data-stock-time]').textContent = '';
    }
    host.querySelector('[data-stock-title]').textContent = labels.title;
    host.querySelector('[data-stock-note]').textContent = labels.note + ' ' + labels.source;
    const button = host.querySelector('[data-stock-refresh]');
    button.textContent = labels.refresh;
  }
  async function request() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(API, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Stock API HTTP ' + response.status);
      const payload = await response.json();
      if (!payload.ok || !Array.isArray(payload.stocks) || !payload.stocks.length) throw new Error(payload.error || 'Invalid stock data');
      return save(payload);
    } finally { clearTimeout(timer); }
  }
  async function refresh(force = false) {
    if (busy) return;
    const old = cache();
    if (!force && old && Date.now() - old.fetchedAt < TTL) {
      render(old, false, copy().cached);
      return;
    }
    busy = true;
    const button = root()?.querySelector('[data-stock-refresh]');
    if (button) { button.disabled = true; button.textContent = copy().refreshing; }
    try {
      render(await request(), false, copy().updated);
    } catch (error) {
      const fallback = cache() || old;
      if (fallback) render(fallback, true, copy().offline);
      else render(null, false, copy().failed);
    } finally {
      busy = false;
      if (button) { button.disabled = false; button.textContent = copy().refresh; }
    }
  }
  function init() {
    const host = root();
    if (!host || host.dataset.initialized) return;
    host.dataset.initialized = 'true';
    const old = cache();
    render(old, Boolean(old && Date.now() - old.fetchedAt >= TTL), old ? '' : copy().loading);
    host.querySelector('[data-stock-refresh]')?.addEventListener('click', () => refresh(true));
    window.addEventListener('planner-language-change', () => render(cache(), false, copy().updated));
    refresh(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
