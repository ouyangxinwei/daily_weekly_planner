import { validateWikiEntry } from "./wiki.js";

export const WIKI_BACKUP_FORMAT = "testnisa-wiki-backup";
export const WIKI_BACKUP_FORMAT_VERSION = 1;
export const WIKI_BACKUP_MAX_BYTES = 5 * 1024 * 1024;
export const WIKI_BACKUP_MAX_ENTRIES = 5000;

const adapters = new Map();

function registerAdapter(version, adapter) {
  if (!Number.isInteger(version) || version < 1 || typeof adapter !== "function") {
    throw new TypeError("Invalid Wiki backup adapter");
  }
  adapters.set(version, adapter);
}

registerAdapter(1, payload => {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.entries)) {
    throw new TypeError("备份文件缺少 entries 数组");
  }
  if (payload.entries.length > WIKI_BACKUP_MAX_ENTRIES) {
    throw new RangeError("备份条目数量超过上限");
  }
  return payload.entries;
});

function normalizedTitle(value) {
  return String(value ?? "").normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
}

function comparableEntry(entry) {
  return JSON.stringify({
    id: entry.id, title: entry.title, body: entry.body, summary: entry.summary,
    category: entry.category, status: entry.status, tags: entry.tags,
    aliases: entry.aliases, createdAt: entry.createdAt, updatedAt: entry.updatedAt,
    formatVersion: entry.formatVersion
  });
}

export function createWikiBackupText(entries, { exportedAt = new Date().toISOString() } = {}) {
  if (!Array.isArray(entries)) throw new TypeError("Wiki entries must be an array");
  if (entries.length > WIKI_BACKUP_MAX_ENTRIES) throw new RangeError("Wiki 条目数量超过备份上限");
  const seen = new Set();
  const normalized = entries.map(entry => {
    const valid = validateWikiEntry(entry);
    if (seen.has(valid.id)) throw new TypeError("备份中存在重复条目 ID：" + valid.id);
    seen.add(valid.id);
    return valid;
  });
  const payload = {
    format: WIKI_BACKUP_FORMAT,
    formatVersion: WIKI_BACKUP_FORMAT_VERSION,
    exportedAt,
    entryCount: normalized.length,
    entries: normalized
  };
  return JSON.stringify(payload, null, 2);
}

export function parseWikiBackupText(input) {
  if (typeof input !== "string") throw new TypeError("备份文件必须是文本");
  if (new TextEncoder().encode(input).byteLength > WIKI_BACKUP_MAX_BYTES) {
    throw new RangeError("备份文件不能超过 5 MiB");
  }
  const text = input.replace(/^\uFEFF/u, "").trim();
  if (!text) throw new TypeError("备份文件为空");
  let payload;
  try { payload = JSON.parse(text); }
  catch { throw new TypeError("JSON 格式无效，未修改本地数据"); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("备份根节点必须是 JSON 对象");
  }
  if (payload.format !== WIKI_BACKUP_FORMAT) throw new TypeError("不是受支持的 Wiki 备份文件");
  if (!Number.isInteger(payload.formatVersion)) throw new TypeError("备份格式版本缺失或无效");
  const adapter = adapters.get(payload.formatVersion);
  if (!adapter) throw new TypeError("不支持的 Wiki 备份格式版本：" + payload.formatVersion);
  const rawEntries = adapter(payload);
  const entries = [];
  const invalid = [];
  const ids = new Set();
  rawEntries.forEach((raw, index) => {
    try {
      const entry = validateWikiEntry(raw);
      if (ids.has(entry.id)) throw new TypeError("备份文件内条目 ID 重复");
      ids.add(entry.id);
      entries.push(entry);
    } catch (error) {
      invalid.push({ index, reason: error.message });
    }
  });
  return {
    formatVersion: payload.formatVersion,
    exportedAt: typeof payload.exportedAt === "string" ? payload.exportedAt : "",
    declaredEntryCount: Number.isInteger(payload.entryCount) ? payload.entryCount : rawEntries.length,
    entries,
    invalid
  };
}

export function planWikiBackupImport(snapshot, existingEntries) {
  if (!snapshot || !Array.isArray(snapshot.entries) || !Array.isArray(snapshot.invalid)) {
    throw new TypeError("Invalid parsed Wiki backup");
  }
  if (!Array.isArray(existingEntries)) throw new TypeError("Existing entries must be an array");
  const byId = new Map(existingEntries.map(entry => [entry.id, entry]));
  const byTitle = new Map(existingEntries.map(entry => [normalizedTitle(entry.title), entry]).filter(([title]) => title));
  const newEntries = [];
  const duplicates = [];
  const conflicts = [];
  for (const entry of snapshot.entries) {
    const sameId = byId.get(entry.id);
    if (sameId) {
      if (comparableEntry(sameId) === comparableEntry(entry)) duplicates.push({ entry, reason: "ID 与内容均相同" });
      else conflicts.push({ entry, reason: "条目 ID 已存在，但内容不同" });
      continue;
    }
    const sameTitle = byTitle.get(normalizedTitle(entry.title));
    if (sameTitle) {
      conflicts.push({ entry, reason: "标题与现有条目重复（现有 ID：" + sameTitle.id + "）" });
      continue;
    }
    newEntries.push(entry);
    byId.set(entry.id, entry);
    if (normalizedTitle(entry.title)) byTitle.set(normalizedTitle(entry.title), entry);
  }
  return {
    newEntries, duplicates, conflicts, invalid: snapshot.invalid,
    counts: {
      new: newEntries.length,
      duplicate: duplicates.length,
      conflict: conflicts.length,
      invalid: snapshot.invalid.length
    }
  };
}

export function applyWikiBackupImport(db, snapshot) {
  if (!db || typeof db.transaction !== "function") return Promise.reject(new TypeError("A valid Wiki database is required"));
  return new Promise((resolve, reject) => {
    let settled = false;
    let summary;
    let tx;
    try {
      tx = db.transaction("entries", "readwrite");
      const store = tx.objectStore("entries");
      const request = store.getAll();
      request.onsuccess = () => {
        try {
          const plan = planWikiBackupImport(snapshot, request.result);
          summary = plan.counts;
          for (const entry of plan.newEntries) store.add(entry);
        } catch (error) {
          try { tx.abort(); } catch {}
          if (!settled) { settled = true; reject(error); }
        }
      };
      request.onerror = () => {
        try { tx.abort(); } catch {}
        if (!settled) { settled = true; reject(request.error ?? new Error("读取本地 Wiki 数据失败")); }
      };
      tx.oncomplete = () => {
        if (!settled) { settled = true; resolve(summary ?? { new: 0, duplicate: 0, conflict: 0, invalid: 0 }); }
      };
      tx.onabort = () => {
        if (!settled) { settled = true; reject(tx.error ?? new Error("导入事务已回滚，原数据保持不变")); }
      };
      tx.onerror = () => {
        if (!settled) { settled = true; reject(tx.error ?? new Error("导入事务失败，原数据保持不变")); }
      };
    } catch (error) {
      reject(error);
    }
  });
}
