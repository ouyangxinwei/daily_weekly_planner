// Learning meetings module — V10.71.
// Independent module: stored as one JSON snapshot per account via company-api
// (GET/PUT /learning-meetings), never mixed with planner data or backups.
// Dates and times are Asia/Tokyo local values; .ics export converts timed events to UTC.
(function () {
  'use strict';
  const API = '/learning-meetings';
  const PROJECT_URL = 'https://kopvznygsqsheibsjjvv.supabase.co';
  const REGIONS = ['tokyo', 'yokohama', 'online', 'other'];
  const FORMATS = ['offline', 'live', 'recorded', 'hybrid'];
  const $ = id => document.getElementById(id);
  const dialog = $('learning-meetings-dialog');
  if (!dialog) return;
  const root = $('learning-meetings-root');

  const dictionaries = {
    zh: {
      title: '学习会议', subtitle: '记录想参加的学习会议、讲座和展会，可导出 .ics 加入 Google 日历等。时间均为日本时间。',
      add: '＋ 新增会议', exportAll: '导出全部 .ics', aiOpen: 'AI 解析助手', close: '关闭',
      upcoming: '即将举行', past: '已结束', empty: '还没有会议。可以手动新增，或用 AI 解析助手批量导入。',
      edit: '编辑', remove: '删除', exportOne: '导出 .ics', open: '打开网址',
      fTitle: '名称', fStartDate: '开始日期', fStartTime: '开始时间', fEndDate: '结束日期', fEndTime: '结束时间',
      fRegion: '地区', fFormat: '形式', fLocation: '地点', fCost: '费用', fUrl: '网址', fDescription: '简介', fReminder: '提前提醒（分钟）',
      timeHint: '不填开始时间即为全天活动；跨多天的展会填写结束日期。',
      save: '保存', cancel: '取消', newTitle: '新增会议', editTitle: '编辑会议',
      r_tokyo: '东京', r_yokohama: '横滨', r_online: '线上', r_other: '其他地区',
      f_offline: '线下', f_live: '线上直播', f_recorded: '录播', f_hybrid: '线上线下',
      allDay: '全天', untilPrefix: '至 ',
      aiTitle: 'AI 解析助手', aiStep1: '① 复制下面的提示词，连同活动信息（网页文字、邮件等）一起发给 Claude 等 AI。',
      aiStep2: '② 把 AI 返回的 JSON 粘贴到下面，点「预览」确认后导入。', copy: '复制提示词', copied: '已复制。',
      pastePlaceholder: '在这里粘贴 AI 返回的 JSON 数组', preview: '预览', importConfirm: '导入 {n} 条', back: '返回列表',
      previewInfo: '可导入 {ok} 条；跳过 {skip} 条（缺少名称/开始日期，或已存在同名同日的会议）。',
      imported: '已导入 {n} 条会议。', saved: '已保存。', deleted: '已删除。',
      confirmDelete: '确定删除「{t}」吗？',
      reminderNote: '提示：Google 日历导入 .ics 时会忽略提醒设置，请在 Google 日历中自行设置通知；Apple 日历等会保留提醒。',
      errTitle: '请填写名称。', errStart: '请填写开始日期。', errEnd: '结束日期不能早于开始日期。', errEndTime: '填写结束时间前请先填写开始时间。',
      errJson: 'JSON 格式错误：{m}', errArray: 'JSON 必须是数组。', errNothing: '没有可导入的会议。', exportNone: '没有可导出的会议。',
      needLogin: '请先登录账号后再使用学习会议。', loading: '正在读取云端数据…',
      errLoad: '云端读取失败：{m}（如果刚上线，可能是数据库或 company-api 尚未部署）', errSave: '保存失败：{m}'
    },
    en: {
      title: 'Learning Meetings', subtitle: 'Track study sessions, talks and expos you want to attend, and export .ics files for Google Calendar and others. All times are Japan time.',
      add: '＋ Add meeting', exportAll: 'Export all .ics', aiOpen: 'AI parsing helper', close: 'Close',
      upcoming: 'Upcoming', past: 'Past', empty: 'No meetings yet. Add one manually or import several with the AI parsing helper.',
      edit: 'Edit', remove: 'Delete', exportOne: 'Export .ics', open: 'Open link',
      fTitle: 'Title', fStartDate: 'Start date', fStartTime: 'Start time', fEndDate: 'End date', fEndTime: 'End time',
      fRegion: 'Region', fFormat: 'Format', fLocation: 'Location', fCost: 'Cost', fUrl: 'URL', fDescription: 'Description', fReminder: 'Reminder (minutes before)',
      timeHint: 'Leave the start time empty for an all-day event; set an end date for multi-day expos.',
      save: 'Save', cancel: 'Cancel', newTitle: 'Add meeting', editTitle: 'Edit meeting',
      r_tokyo: 'Tokyo', r_yokohama: 'Yokohama', r_online: 'Online', r_other: 'Other area',
      f_offline: 'In person', f_live: 'Live online', f_recorded: 'Recorded', f_hybrid: 'Hybrid',
      allDay: 'All day', untilPrefix: 'until ',
      aiTitle: 'AI parsing helper', aiStep1: '1. Copy the prompt below and send it to Claude or another AI together with the event information (web page text, e-mail, etc.).',
      aiStep2: '2. Paste the JSON returned by the AI below, preview it, then import.', copy: 'Copy prompt', copied: 'Copied.',
      pastePlaceholder: 'Paste the JSON array returned by the AI here', preview: 'Preview', importConfirm: 'Import {n}', back: 'Back to list',
      previewInfo: '{ok} can be imported; {skip} skipped (missing title/start date, or a meeting with the same title and date already exists).',
      imported: 'Imported {n} meetings.', saved: 'Saved.', deleted: 'Deleted.',
      confirmDelete: 'Delete "{t}"?',
      reminderNote: 'Note: Google Calendar ignores reminders when importing .ics files, so set notifications in Google Calendar; Apple Calendar and others keep them.',
      errTitle: 'Enter a title.', errStart: 'Enter a start date.', errEnd: 'The end date cannot be before the start date.', errEndTime: 'Enter a start time before the end time.',
      errJson: 'Invalid JSON: {m}', errArray: 'The JSON must be an array.', errNothing: 'Nothing to import.', exportNone: 'No meetings to export.',
      needLogin: 'Sign in first to use learning meetings.', loading: 'Loading cloud data…',
      errLoad: 'Could not load cloud data: {m} (if this was just released, the database or company-api may not be deployed yet)', errSave: 'Could not save: {m}'
    },
    ja: {
      title: '学習イベント', subtitle: '参加したい勉強会・講座・展示会を記録し、.ics で Google カレンダーなどに追加できます。時刻はすべて日本時間です。',
      add: '＋ イベント追加', exportAll: 'すべて .ics 出力', aiOpen: 'AI 解析アシスタント', close: '閉じる',
      upcoming: '開催予定', past: '終了', empty: 'まだイベントがありません。手動で追加するか、AI 解析アシスタントでまとめて取り込めます。',
      edit: '編集', remove: '削除', exportOne: '.ics 出力', open: 'リンクを開く',
      fTitle: '名称', fStartDate: '開始日', fStartTime: '開始時刻', fEndDate: '終了日', fEndTime: '終了時刻',
      fRegion: '地域', fFormat: '形式', fLocation: '場所', fCost: '費用', fUrl: 'URL', fDescription: '概要', fReminder: 'リマインダー（分前）',
      timeHint: '開始時刻が空なら終日イベントになります。複数日の展示会は終了日を入力してください。',
      save: '保存', cancel: 'キャンセル', newTitle: 'イベント追加', editTitle: 'イベント編集',
      r_tokyo: '東京', r_yokohama: '横浜', r_online: 'オンライン', r_other: 'その他の地域',
      f_offline: '会場', f_live: 'ライブ配信', f_recorded: '録画配信', f_hybrid: 'ハイブリッド',
      allDay: '終日', untilPrefix: '〜',
      aiTitle: 'AI 解析アシスタント', aiStep1: '① 下のプロンプトをコピーし、イベント情報（Web ページの文章、メールなど）と一緒に Claude などの AI に送ります。',
      aiStep2: '② AI が返した JSON を下に貼り付け、「プレビュー」で確認してから取り込みます。', copy: 'プロンプトをコピー', copied: 'コピーしました。',
      pastePlaceholder: 'AI が返した JSON 配列をここに貼り付け', preview: 'プレビュー', importConfirm: '{n} 件取り込む', back: '一覧に戻る',
      previewInfo: '取り込み可能 {ok} 件、スキップ {skip} 件（名称・開始日がない、または同名・同日のイベントが既にある）。',
      imported: '{n} 件取り込みました。', saved: '保存しました。', deleted: '削除しました。',
      confirmDelete: '「{t}」を削除しますか？',
      reminderNote: '注意：Google カレンダーは .ics 取り込み時にリマインダーを無視するため、通知は Google カレンダー側で設定してください。Apple カレンダーなどでは保持されます。',
      errTitle: '名称を入力してください。', errStart: '開始日を入力してください。', errEnd: '終了日は開始日より前にできません。', errEndTime: '終了時刻の前に開始時刻を入力してください。',
      errJson: 'JSON の形式が正しくありません：{m}', errArray: 'JSON は配列である必要があります。', errNothing: '取り込めるイベントがありません。', exportNone: '出力するイベントがありません。',
      needLogin: '先にログインしてください。', loading: 'クラウドから読み込み中…',
      errLoad: 'クラウドの読み込みに失敗しました：{m}（公開直後の場合、データベースまたは company-api が未デプロイの可能性があります）', errSave: '保存に失敗しました：{m}'
    }
  };
  function lang() { const l = window.PlannerI18n && window.PlannerI18n.getLanguage ? window.PlannerI18n.getLanguage() : 'zh'; return dictionaries[l] ? l : 'zh'; }
  function T(k, vars) {
    let s = dictionaries[lang()][k] || dictionaries.zh[k] || k;
    if (vars) for (const [key, v] of Object.entries(vars)) s = s.split('{' + key + '}').join(String(v));
    return s;
  }

  // ---------- state ----------
  let meetings = [];
  let loaded = false;
  let view = 'list'; // list | form | ai
  let editingId = null;
  let pendingImport = null;
  let message = '', messageDanger = false;

  // ---------- helpers ----------
  const nowIso = () => new Date().toISOString();
  const uid = () => 'lm-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  function todayJst() {
    const d = new Date(Date.now() + 9 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }
  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'text') el.textContent = v;
      else if (k === 'className') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children || [])) if (c) el.append(c);
    return el;
  }
  function normTime(v) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(v || '').trim());
    if (!m) return '';
    const hh = Number(m[1]), mm = Number(m[2]);
    if (hh > 23 || mm > 59) return '';
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }
  function normDate(v) {
    const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(String(v || '').trim());
    if (!m) return '';
    const s = m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
    const d = new Date(s + 'T00:00:00Z');
    return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? '' : s;
  }
  const REGION_ALIASES = { '线下-东京': 'tokyo', '东京': 'tokyo', '東京': 'tokyo', '线下-横滨': 'yokohama', '横滨': 'yokohama', '横浜': 'yokohama', '线上': 'online', 'オンライン': 'online' };
  const FORMAT_ALIASES = { '线下': 'offline', '線下': 'offline', '会場': 'offline', '线上直播': 'live', '直播': 'live', 'ライブ配信': 'live', '录播': 'recorded', '録画': 'recorded', '混合': 'hybrid', 'ハイブリッド': 'hybrid' };

  // Normalize one record (from the form, the cloud, or AI JSON in snake_case or camelCase).
  function normalize(input, existing) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const pick = (...keys) => { for (const k of keys) if (input[k] !== undefined && input[k] !== null) return input[k]; return ''; };
    const title = String(pick('title', 'name', 'summary')).trim().slice(0, 300);
    const startDate = normDate(pick('startDate', 'start_date', 'date'));
    if (!title || !startDate) return null;
    const startTime = normTime(pick('startTime', 'start_time'));
    let endDate = normDate(pick('endDate', 'end_date'));
    if (endDate && endDate < startDate) endDate = '';
    if (endDate === startDate) endDate = '';
    const endTime = startTime ? normTime(pick('endTime', 'end_time')) : '';
    const regionRaw = String(pick('region', 'category')).trim();
    const formatRaw = String(pick('format', 'format_type')).trim();
    const region = REGIONS.includes(regionRaw.toLowerCase()) ? regionRaw.toLowerCase() : (REGION_ALIASES[regionRaw] || 'other');
    const format = FORMATS.includes(formatRaw.toLowerCase()) ? formatRaw.toLowerCase() : (FORMAT_ALIASES[formatRaw] || (region === 'online' ? 'live' : 'offline'));
    let url = String(pick('url')).trim().slice(0, 2000);
    try { if (url && !/^https?:$/.test(new URL(url).protocol)) url = ''; } catch (e) { url = ''; }
    const reminderRaw = Number(pick('reminderMinutes', 'reminder_minutes'));
    const reminderMinutes = Number.isInteger(reminderRaw) && reminderRaw >= 0 && reminderRaw <= 10080 ? reminderRaw : 15;
    const stamp = nowIso();
    return {
      id: existing ? existing.id : (typeof input.id === 'string' && input.id.startsWith('lm-') ? input.id : uid()),
      title, startDate, startTime, endDate, endTime,
      location: String(pick('location')).trim().slice(0, 500),
      cost: String(pick('cost')).trim().slice(0, 200),
      description: String(pick('description')).trim().slice(0, 5000),
      url, region, format, reminderMinutes,
      createdAt: existing ? existing.createdAt : (typeof input.createdAt === 'string' && !Number.isNaN(Date.parse(input.createdAt)) ? input.createdAt : stamp),
      updatedAt: typeof input.updatedAt === 'string' && !existing && !Number.isNaN(Date.parse(input.updatedAt)) ? input.updatedAt : stamp
    };
  }
  const sortKey = m => m.startDate + 'T' + (m.startTime || '00:00');
  const isPast = m => (m.endDate || m.startDate) < todayJst();

  // ---------- cloud ----------
  function auth() { return window.PlannerCompanyContext && window.PlannerCompanyContext.getAuth ? window.PlannerCompanyContext.getAuth() : null; }
  function basicToken(user, pass) { const bytes = new TextEncoder().encode(user + ':' + pass); let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); }); return btoa(bin); }
  async function cloudRequest(method, body) {
    const a = auth();
    if (!a) throw new Error(T('needLogin'));
    if (!a.url || a.url.replace(/\/+$/, '') !== PROJECT_URL) throw new Error('Supabase project mismatch');
    const headers = { apikey: a.key, Authorization: 'Basic ' + basicToken(a.username, a.password) };
    const options = { method, headers, cache: 'no-store' };
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(body); }
    const response = await fetch(a.url.replace(/\/+$/, '') + '/functions/v1/company-api' + API, options);
    let payload = {};
    try { payload = await response.json(); } catch (e) { /* ignore */ }
    if (!response.ok) throw new Error(payload.error || String(response.status));
    return payload.data;
  }
  async function load() {
    if (loaded) return;
    setMessage(T('loading'));
    try {
      const data = await cloudRequest('GET');
      const list = data && Array.isArray(data.meetings) ? data.meetings : [];
      meetings = list.map(m => {
        const n = normalize(m, m && m.id ? m : null);
        if (n && typeof m.updatedAt === 'string') n.updatedAt = m.updatedAt; // keep stored timestamp on load
        return n;
      }).filter(Boolean);
      loaded = true;
      setMessage('');
    } catch (e) {
      setMessage(auth() ? T('errLoad', { m: e.message }) : T('needLogin'), true);
    }
  }
  async function persist(next, okMessage) {
    try {
      await cloudRequest('PUT', { meetings: next });
      meetings = next;
      setMessage(okMessage);
      return true;
    } catch (e) {
      setMessage(T('errSave', { m: e.message }), true);
      return false;
    }
  }
  function setMessage(text, danger) { message = text || ''; messageDanger = Boolean(danger); render(); }

  // ---------- ICS ----------
  const pad = n => String(n).padStart(2, '0');
  function icsDate(dateStr) { return dateStr.replace(/-/g, ''); }
  function addDays(dateStr, n) { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  // JST local date+time -> UTC "YYYYMMDDTHHMMSSZ"
  function jstToUtc(dateStr, timeStr, plusMinutes) {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [hh, mm] = timeStr.split(':').map(Number);
    const t = new Date(Date.UTC(y, mo - 1, d, hh - 9, mm + (plusMinutes || 0)));
    return t.getUTCFullYear() + pad(t.getUTCMonth() + 1) + pad(t.getUTCDate()) + 'T' + pad(t.getUTCHours()) + pad(t.getUTCMinutes()) + '00Z';
  }
  function icsEscape(v) { return String(v).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  // Fold lines at 75 octets without splitting multi-byte characters (RFC 5545 3.1).
  function fold(line) {
    const enc = new TextEncoder();
    if (enc.encode(line).length <= 75) return line;
    const out = []; let cur = ''; let bytes = 0; let limit = 75;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (bytes + b > limit) { out.push(cur); cur = ''; bytes = 0; limit = 74; }
      cur += ch; bytes += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  }
  function toIcs(list) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//daily_weekly_planner//Learning Meetings//JA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    for (const m of list) {
      lines.push('BEGIN:VEVENT', 'UID:' + m.id + '@daily-weekly-planner', 'DTSTAMP:' + stamp);
      let description = m.description || '';
      if (m.startTime) {
        lines.push('DTSTART:' + jstToUtc(m.startDate, m.startTime));
        if (m.endTime) lines.push('DTEND:' + jstToUtc(m.endDate || m.startDate, m.endTime));
        else {
          lines.push('DTEND:' + jstToUtc(m.startDate, m.startTime, 60));
          if (m.endDate) description = (description ? description + '\n' : '') + '(' + T('untilPrefix') + m.endDate + ')';
        }
      } else {
        // All-day: DTEND is exclusive, so add one day after the last day.
        lines.push('DTSTART;VALUE=DATE:' + icsDate(m.startDate));
        lines.push('DTEND;VALUE=DATE:' + icsDate(addDays(m.endDate || m.startDate, 1)));
      }
      lines.push('SUMMARY:' + icsEscape(m.title));
      const extra = [m.cost ? T('fCost') + ': ' + m.cost : '', m.url].filter(Boolean).join('\n');
      if (description || extra) lines.push('DESCRIPTION:' + icsEscape([description, extra].filter(Boolean).join('\n')));
      if (m.location) lines.push('LOCATION:' + icsEscape(m.location));
      if (m.url) lines.push('URL:' + m.url);
      if (m.reminderMinutes > 0) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(m.title), 'TRIGGER:-PT' + m.reminderMinutes + 'M', 'END:VALARM');
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function download(list, name) {
    if (!list.length) { setMessage(T('exportNone'), true); return; }
    const url = URL.createObjectURL(new Blob([toIcs(list)], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const safeName = s => s.replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 40);

  // ---------- AI prompt ----------
  function aiPrompt() {
    const year = todayJst().slice(0, 4);
    return [
      '你是活动信息整理助手。请从我提供的文字（网页、邮件、活动列表等）中提取所有学习会议、讲座、研讨会和展会，只输出一个 JSON 数组，不要输出任何解释或 Markdown 代码块标记。',
      '每个元素包含以下字段：',
      '- title：活动名称（必填）',
      '- start_date：开始日期 YYYY-MM-DD（必填；只写了月日时，年份按 ' + year + ' 年推断，若该日期已过则用下一年）',
      '- start_time：开始时间 HH:MM（24 小时制，日本时间）；全天活动或不确定时写 null',
      '- end_date：结束日期 YYYY-MM-DD；当天结束或不确定写 null',
      '- end_time：结束时间 HH:MM；不确定写 null',
      '- location：地点（线上活动写平台名或 "オンライン"）；不确定写 ""',
      '- cost：费用（如 "免费"、"3000円"）；不确定写 ""',
      '- description：一两句话的内容简介',
      '- url：活动网址；没有写 ""',
      '- region：只能是 "tokyo"、"yokohama"、"online"、"other" 之一',
      '- format：只能是 "offline"（线下）、"live"（线上直播）、"recorded"（录播/随时观看）、"hybrid"（线上线下同时）之一',
      '只写了「12月中旬」等模糊日期、无法确定具体日期的活动不要输出。所有时间按日本时间（Asia/Tokyo）。',
      '',
      '以下是要整理的内容：',
      '（在这里粘贴活动信息）'
    ].join('\n');
  }
  function parseImport(text) {
    const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    let data;
    try { data = JSON.parse(cleaned); } catch (e) { throw new Error(T('errJson', { m: e.message })); }
    if (!Array.isArray(data)) throw new Error(T('errArray'));
    const existing = new Set(meetings.map(m => m.title + '|' + m.startDate));
    const ok = []; let skip = 0;
    for (const raw of data) {
      const m = normalize(raw);
      const key = m && m.title + '|' + m.startDate;
      if (!m || existing.has(key)) { skip++; continue; }
      existing.add(key); ok.push(m);
    }
    return { ok, skip };
  }

  // ---------- rendering ----------
  function badge(text, cls) { return h('span', { className: 'lm-badge ' + (cls || ''), text }); }
  function whenText(m) {
    const range = m.endDate ? m.startDate + ' – ' + m.endDate : m.startDate;
    if (!m.startTime) return range + ' · ' + T('allDay');
    return range + ' ' + m.startTime + (m.endTime ? '–' + m.endTime : '');
  }
  function itemView(m) {
    return h('article', { className: 'lm-item' + (isPast(m) ? ' is-past' : ''), 'data-meeting-id': m.id }, [
      h('div', { className: 'lm-item-head' }, [
        h('strong', { text: m.title }),
        h('span', { className: 'lm-badges' }, [badge(T('r_' + m.region)), badge(T('f_' + m.format), 'lm-format')])
      ]),
      h('div', { className: 'lm-when', text: whenText(m) }),
      m.location ? h('div', { className: 'lm-meta', text: '📍 ' + m.location }) : null,
      m.cost ? h('div', { className: 'lm-meta', text: '💴 ' + m.cost }) : null,
      m.description ? h('p', { className: 'lm-desc', text: m.description }) : null,
      h('div', { className: 'lm-actions' }, [
        m.url ? h('a', { className: 'lm-link', href: m.url, target: '_blank', rel: 'noopener noreferrer', text: T('open') }) : null,
        h('button', { type: 'button', className: 'secondary', text: T('exportOne'), onclick: () => download([m], 'meeting-' + safeName(m.title) + '-' + m.startDate + '.ics') }),
        h('button', { type: 'button', className: 'secondary', text: T('edit'), onclick: () => { editingId = m.id; view = 'form'; render(); } }),
        h('button', { type: 'button', className: 'secondary lm-danger', text: T('remove'), onclick: () => removeMeeting(m) })
      ])
    ]);
  }
  function listView() {
    const sorted = meetings.slice().sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    const upcoming = sorted.filter(m => !isPast(m));
    const past = sorted.filter(isPast).reverse();
    const toolbar = h('div', { className: 'lm-toolbar' }, [
      h('button', { type: 'button', className: 'primary', text: T('add'), onclick: () => { editingId = null; view = 'form'; render(); } }),
      h('button', { type: 'button', className: 'secondary', text: T('aiOpen'), onclick: () => { pendingImport = null; view = 'ai'; render(); } }),
      h('button', { type: 'button', className: 'secondary', text: T('exportAll'), onclick: () => download(upcoming.length ? upcoming : sorted, 'learning-meetings-' + todayJst() + '.ics') })
    ]);
    if (!meetings.length) return [toolbar, h('p', { className: 'lm-empty', text: T('empty') })];
    const section = (label, list) => list.length ? h('section', { className: 'lm-section' }, [h('h3', { text: label + '（' + list.length + '）' }), ...list.map(itemView)]) : null;
    return [toolbar, h('p', { className: 'lm-note', text: T('reminderNote') }), section(T('upcoming'), upcoming), section(T('past'), past)];
  }
  function field(label, input) { return h('label', { className: 'lm-field' }, [h('span', { text: label }), input]); }
  function formView() {
    const m = editingId ? meetings.find(x => x.id === editingId) : null;
    const v = k => (m ? String(m[k] ?? '') : '');
    const input = (name, type, extra) => h('input', Object.assign({ name, type: type || 'text', value: name === 'reminderMinutes' ? (m ? m.reminderMinutes : 15) : v(name) }, extra || {}));
    const select = (name, values, prefix) => {
      const s = h('select', { name });
      values.forEach(val => s.append(h('option', { value: val, text: T(prefix + val), selected: (m ? m[name] : values[0]) === val })));
      return s;
    };
    const form = h('form', { className: 'lm-form', novalidate: true }, [
      h('h3', { text: m ? T('editTitle') : T('newTitle') }),
      field(T('fTitle') + ' *', input('title', 'text', { maxlength: 300, required: true })),
      h('div', { className: 'lm-grid' }, [
        field(T('fStartDate') + ' *', input('startDate', 'date', { required: true })),
        field(T('fStartTime'), input('startTime', 'time')),
        field(T('fEndDate'), input('endDate', 'date')),
        field(T('fEndTime'), input('endTime', 'time')),
        field(T('fRegion'), select('region', REGIONS, 'r_')),
        field(T('fFormat'), select('format', FORMATS, 'f_'))
      ]),
      h('small', { className: 'lm-hint', text: T('timeHint') }),
      field(T('fLocation'), input('location', 'text', { maxlength: 500 })),
      h('div', { className: 'lm-grid' }, [
        field(T('fCost'), input('cost', 'text', { maxlength: 200 })),
        field(T('fReminder'), input('reminderMinutes', 'number', { min: 0, max: 10080, step: 1 }))
      ]),
      field(T('fUrl'), input('url', 'url', { maxlength: 2000 })),
      field(T('fDescription'), h('textarea', { name: 'description', rows: 3, maxlength: 5000, text: v('description') })),
      h('div', { className: 'dialog-actions' }, [
        h('button', { type: 'button', className: 'secondary', text: T('cancel'), onclick: () => { view = 'list'; render(); } }),
        h('button', { type: 'submit', className: 'primary', text: T('save') })
      ])
    ]);
    form.addEventListener('submit', event => { event.preventDefault(); submitForm(form, m); });
    return [form];
  }
  function aiView() {
    const promptBox = h('textarea', { className: 'lm-prompt', rows: 8, readonly: true, text: aiPrompt() });
    const paste = h('textarea', { className: 'lm-paste', rows: 8, placeholder: T('pastePlaceholder') });
    const children = [
      h('h3', { text: T('aiTitle') }),
      h('p', { className: 'lm-note', text: T('aiStep1') }),
      promptBox,
      h('div', { className: 'lm-toolbar' }, [h('button', { type: 'button', className: 'secondary', text: T('copy'), onclick: async () => {
        try { await navigator.clipboard.writeText(aiPrompt()); } catch (e) { promptBox.select(); document.execCommand('copy'); }
        setMessage(T('copied'));
      } })]),
      h('p', { className: 'lm-note', text: T('aiStep2') }),
      paste
    ];
    if (pendingImport) {
      paste.value = pendingImport.text;
      children.push(h('p', { className: 'lm-note', text: T('previewInfo', { ok: pendingImport.ok.length, skip: pendingImport.skip }) }));
      children.push(h('div', { className: 'lm-preview' }, pendingImport.ok.map(m => h('div', { text: whenText(m) + ' · ' + m.title }))));
    }
    children.push(h('div', { className: 'dialog-actions' }, [
      h('button', { type: 'button', className: 'secondary', text: T('back'), onclick: () => { pendingImport = null; view = 'list'; render(); } }),
      h('button', { type: 'button', className: 'secondary', text: T('preview'), onclick: () => {
        try { pendingImport = Object.assign({ text: paste.value }, parseImport(paste.value)); message = ''; render(); }
        catch (e) { pendingImport = null; setMessage(e.message, true); }
      } }),
      pendingImport && pendingImport.ok.length ? h('button', { type: 'button', className: 'primary', text: T('importConfirm', { n: pendingImport.ok.length }), onclick: importPending }) : null
    ]));
    return children;
  }
  function render() {
    if (!root) return;
    const t = $('learning-meetings-title'); if (t) t.textContent = T('title');
    const sub = $('learning-meetings-subtitle'); if (sub) sub.textContent = T('subtitle');
    const closeBtn = $('learning-meetings-close'); if (closeBtn) closeBtn.setAttribute('aria-label', T('close'));
    const parts = [];
    if (message) parts.push(h('p', { className: 'lm-message' + (messageDanger ? ' lm-danger-text' : ''), role: 'status', text: message }));
    if (loaded) parts.push(...(view === 'form' ? formView() : view === 'ai' ? aiView() : listView()));
    root.replaceChildren(...parts.filter(Boolean));
  }

  // ---------- actions ----------
  async function submitForm(form, existing) {
    const data = Object.fromEntries(new FormData(form).entries());
    if (!String(data.title || '').trim()) { setMessage(T('errTitle'), true); return; }
    if (!data.startDate) { setMessage(T('errStart'), true); return; }
    if (data.endDate && data.endDate < data.startDate) { setMessage(T('errEnd'), true); return; }
    if (data.endTime && !data.startTime) { setMessage(T('errEndTime'), true); return; }
    data.reminderMinutes = Number(data.reminderMinutes);
    const m = normalize(data, existing);
    if (!m) { setMessage(T('errStart'), true); return; }
    const next = existing ? meetings.map(x => (x.id === existing.id ? m : x)) : meetings.concat(m);
    if (await persist(next, T('saved'))) { view = 'list'; editingId = null; render(); }
  }
  async function removeMeeting(m) {
    if (!confirm(T('confirmDelete', { t: m.title }))) return;
    await persist(meetings.filter(x => x.id !== m.id), T('deleted'));
  }
  async function importPending() {
    if (!pendingImport || !pendingImport.ok.length) { setMessage(T('errNothing'), true); return; }
    const n = pendingImport.ok.length;
    if (await persist(meetings.concat(pendingImport.ok), T('imported', { n }))) { pendingImport = null; view = 'list'; render(); }
  }

  async function openDialog() {
    view = 'list'; editingId = null; pendingImport = null;
    if (!dialog.open) dialog.showModal();
    render();
    await load();
    render();
  }

  $('open-learning-meetings')?.addEventListener('click', openDialog);
  $('learning-meetings-close')?.addEventListener('click', () => dialog.close());
  window.addEventListener('planner-auth-change', () => { loaded = false; meetings = []; message = ''; if (dialog.open) dialog.close(); });
  window.addEventListener('planner-language-change', () => { if (dialog.open) render(); });

  window.PlannerLearningMeetings = Object.freeze({ toIcs, normalize, parseImport, aiPrompt });
})();
