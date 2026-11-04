(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { records: [], selected: null };
  const dateValue = value => value ? new Date(value).toLocaleString() : '';
  const label = value => String(value == null ? '' : value);
  function node(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  }
  function addCell(parent, title, value) {
    const wrap = node('div', 'runtime-log-detail-field');
    wrap.append(node('strong', '', title), node('div', '', value));
    parent.append(wrap);
  }
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function currentFilters() {
    const from = $('runtime-log-from').value ? new Date($('runtime-log-from').value + 'T00:00:00').getTime() : null;
    const to = $('runtime-log-to').value ? new Date($('runtime-log-to').value + 'T23:59:59.999').getTime() : null;
    return { level: $('runtime-log-level').value, module: $('runtime-log-module').value,
      from, to, query: $('runtime-log-search').value.trim() };
  }
  function updateSummary(all) {
    $('runtime-log-total').textContent = String(all.length);
    $('runtime-log-errors').textContent = String(all.filter(x => x.level === 'ERROR').length);
    $('runtime-log-warnings').textContent = String(all.filter(x => x.level === 'WARN').length);
    const latest = all.find(x => x.level === 'ERROR');
    $('runtime-log-last-error').textContent = latest ? dateValue(latest.createdAt) : '—';
    const modules = [...new Set(all.map(x => x.module).filter(Boolean))].sort();
    const select = $('runtime-log-module'), previous = select.value;
    select.replaceChildren(new Option('全部模块', ''));
    modules.forEach(name => select.add(new Option(name, name)));
    if (modules.includes(previous)) select.value = previous;
  }
  function renderRows(records) {
    const host = $('runtime-log-list'); host.replaceChildren();
    $('runtime-log-count').textContent = String(records.length);
    if (!records.length) { host.append(node('p', 'runtime-log-empty', '没有符合条件的日志记录。')); return; }
    records.forEach(record => {
      const row = node('button', 'runtime-log-row');
      row.type = 'button';
      const top = node('span', 'runtime-log-row-top');
      top.append(node('b', 'runtime-log-level level-' + record.level.toLowerCase(), record.level),
        node('time', '', dateValue(record.createdAt)));
      const title = node('strong', 'runtime-log-row-title', record.functionName || record.module || 'System');
      const meta = node('span', 'runtime-log-row-meta', [record.module, record.phase, record.result].filter(Boolean).join(' · '));
      const msg = node('span', 'runtime-log-row-message', record.message || '');
      row.append(top, title, meta, msg);
      row.addEventListener('click', () => showDetail(record));
      host.append(row);
    });
  }
  async function refresh() {
    const api = window.AppLogger;
    if (!api) { $('runtime-log-storage').textContent = '日志模块不可用'; return; }
    $('runtime-log-storage').textContent = api.getStatus().initialized ? 'IndexedDB · 本机保存' : '内存降级模式';
    try {
      const all = await api.list({});
      updateSummary(all);
      const records = await api.list(currentFilters());
      state.records = records;
      renderRows(records);
    } catch (error) {
      $('runtime-log-list').replaceChildren(node('p', 'runtime-log-empty', '读取日志失败：' + (error.message || error)));
    }
  }
  async function showDetail(record) {
    state.selected = record;
    const host = $('runtime-log-detail'); host.replaceChildren();
    const grid = node('div', 'runtime-log-detail-grid');
    addCell(grid, '时间', dateValue(record.createdAt));
    addCell(grid, '等级', record.level);
    addCell(grid, '模块', record.module);
    addCell(grid, '功能 / 函数', record.functionName);
    addCell(grid, '阶段', record.phase);
    addCell(grid, '结果', record.result || '—');
    addCell(grid, '耗时', record.durationMs == null ? '—' : record.durationMs + ' ms');
    addCell(grid, '应用版本', record.appVersion);
    addCell(grid, 'Execution ID', record.executionId || '—');
    addCell(grid, 'Span ID', record.spanId || '—');
    addCell(grid, 'Parent Span ID', record.parentSpanId || '—');
    host.append(grid, node('h3', '', '日志消息'), node('p', 'runtime-log-detail-message', record.message || '—'));
    if (record.details && record.details.error) {
      host.append(node('h3', '', '错误信息'));
      const error = record.details.error;
      host.append(node('pre', 'runtime-log-pre', typeof error === 'string' ? error : JSON.stringify(error, null, 2)));
    }
    host.append(node('h3', '', '完整脱敏详情'), node('pre', 'runtime-log-pre', JSON.stringify(record.details || {}, null, 2)));
    const chain = $('runtime-log-chain'); chain.replaceChildren();
    if (record.executionId) {
      const related = (await window.AppLogger.list({ executionId: record.executionId })).sort((a,b) => a.createdAt-b.createdAt);
      chain.append(node('h3', '', '同一操作执行链路 · ' + related.length + ' 条'));
      related.forEach(item => {
        const line = node('div', 'runtime-log-chain-item');
        line.append(node('b', 'level-' + item.level.toLowerCase(), item.level),
          node('span', '', dateValue(item.createdAt) + ' · ' + item.functionName + ' · ' + item.phase + (item.result ? ' · ' + item.result : '')));
        chain.append(line);
      });
    } else chain.append(node('p', 'runtime-log-empty', '此记录没有 Execution ID。'));
    $('runtime-log-detail-dialog').showModal();
  }
  function exportJson() {
    download('慢慢计划_运行日志_' + new Date().toISOString().slice(0,10) + '.json',
      JSON.stringify({ exportedAt: new Date().toISOString(), count: state.records.length, logs: state.records }, null, 2),
      'application/json;charset=utf-8');
  }
  function exportCsv() {
    const columns = ['timestamp','level','module','functionName','phase','result','durationMs','executionId','spanId','parentSpanId','appVersion','message','details'];
    const quote = value => '"' + String(value == null ? '' : (typeof value === 'object' ? JSON.stringify(value) : value)).replace(/"/g, '""') + '"';
    const csv = [columns.join(','), ...state.records.map(item => columns.map(key => quote(item[key])).join(','))].join('\r\n');
    download('慢慢计划_运行日志_' + new Date().toISOString().slice(0,10) + '.csv', '\uFEFF' + csv, 'text/csv;charset=utf-8');
  }
  function init() {
    if (!$('open-runtime-logs') || !window.AppLogger) return;
    $('open-runtime-logs').addEventListener('click', () => {
      $('runtime-log-dialog').showModal(); refresh();
    });
    $('runtime-log-refresh').addEventListener('click', refresh);
    ['runtime-log-level','runtime-log-module','runtime-log-from','runtime-log-to'].forEach(id => $(id).addEventListener('change', refresh));
    $('runtime-log-search').addEventListener('input', () => { clearTimeout(window.__runtimeLogSearchTimer); window.__runtimeLogSearchTimer = setTimeout(refresh, 180); });
    $('runtime-log-export-json').addEventListener('click', exportJson);
    $('runtime-log-export-csv').addEventListener('click', exportCsv);
    $('runtime-log-debug').checked = window.AppLogger.getStatus().debugEnabled;
    $('runtime-log-debug').addEventListener('change', event => {
      window.AppLogger.setDebug(event.target.checked);
      window.AppLogger.info('System','RuntimeLogViewer','DEBUG logging preference changed',{enabled:event.target.checked});
      refresh();
    });
    $('runtime-log-clear').addEventListener('click', async () => {
      if (!confirm('确定清空当前设备保存的全部运行日志？此操作不可撤销。')) return;
      const ok = await window.AppLogger.clear();
      if (ok) { $('runtime-log-detail-dialog').close(); await refresh(); }
      else alert('日志存储不可用，无法清空。');
    });
    $('runtime-log-detail-close').addEventListener('click', () => $('runtime-log-detail-dialog').close());
    $('runtime-log-close').addEventListener('click', () => $('runtime-log-dialog').close());
    $('runtime-log-dialog').addEventListener('click', event => { if (event.target === $('runtime-log-dialog')) $('runtime-log-dialog').close(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
