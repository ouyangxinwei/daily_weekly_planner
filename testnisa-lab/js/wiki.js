import { validateText, validateEnum } from "./security.js";

export const WIKI_DB_NAME = "testnisa-wiki-lab";
export const WIKI_DB_VERSION = 1;
export const WIKI_STORE = "entries";
export const WIKI_STATUSES = Object.freeze(["draft", "verified", "needs_update", "disputed"]);

function normalizeStringList(value, field, maxItems = 30, maxLength = 60) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError(field + " must be an array");
  if (value.length > maxItems) throw new RangeError(field + " has too many items");
  const normalized = value.map(item => validateText(item, { required: true, maxLength }));
  return [...new Set(normalized)];
}

export function validateWikiEntry(input, { now = Date.now() } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Wiki entry must be an object");
  }
  const id = validateText(input.id, { required: true, maxLength: 100 });
  const title = validateText(input.title, { required: true, maxLength: 200 });
  const body = validateText(input.body ?? "", { maxLength: 50000, trim: false, allowEmpty: true });
  const summary = validateText(input.summary ?? "", { maxLength: 500, allowEmpty: true });
  const category = validateText(input.category ?? "", { maxLength: 80, allowEmpty: true });
  const status = validateEnum(input.status ?? "draft", WIKI_STATUSES);
  const createdAt = Number.isFinite(input.createdAt) ? input.createdAt : now;
  const updatedAt = Number.isFinite(input.updatedAt) ? input.updatedAt : now;
  return {
    id, title, body, summary, category, status,
    tags: normalizeStringList(input.tags, "tags"),
    aliases: normalizeStringList(input.aliases, "aliases"),
    createdAt, updatedAt, formatVersion: 1
  };
}

function createId() {
  const random = globalThis.crypto?.randomUUID?.();
  return "wiki-" + (random ?? (Date.now() + "-" + Math.random().toString(36).slice(2, 12)));
}

export function createWikiEntry(input, { now = Date.now(), idFactory = createId } = {}) {
  return validateWikiEntry({
    ...input,
    id: input?.id ?? idFactory(),
    createdAt: input?.createdAt ?? now,
    updatedAt: now
  }, { now });
}

export function searchWikiEntries(entries, query = "", { category = "", status = "" } = {}) {
  if (!Array.isArray(entries)) throw new TypeError("entries must be an array");
  const needle = String(query).trim().toLocaleLowerCase();
  return entries.filter(entry => {
    if (category && entry.category !== category) return false;
    if (status && entry.status !== status) return false;
    if (!needle) return true;
    const searchable = [
      entry.title, entry.body, entry.summary, entry.category,
      ...(entry.tags ?? []), ...(entry.aliases ?? [])
    ].join("\n").toLocaleLowerCase();
    return searchable.includes(needle);
  }).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.title.localeCompare(b.title));
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Wiki IndexedDB request failed"));
  });
}

function transactionResult(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("Wiki transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("Wiki transaction failed"));
  });
}

export function openWikiDatabase(indexedDBImpl = globalThis.indexedDB, onBlocked = () => {}) {
  if (!indexedDBImpl || typeof indexedDBImpl.open !== "function") {
    return Promise.reject(new Error("IndexedDB is unavailable in this browser context"));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(WIKI_DB_NAME, WIKI_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WIKI_STORE)) {
        const store = db.createObjectStore(WIKI_STORE, { keyPath: "id" });
        store.createIndex("by_updated_at", "updatedAt");
        store.createIndex("by_category", "category");
        store.createIndex("by_status", "status");
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Unable to open Wiki database"));
    request.onblocked = () => {
      onBlocked();
      reject(new Error("Wiki database upgrade is blocked by another open tab"));
    };
  });
}

export function createWikiRepository(db) {
  if (!db || typeof db.transaction !== "function") throw new TypeError("A valid Wiki database is required");
  return {
    async list() {
      const tx = db.transaction(WIKI_STORE, "readonly");
      const done = transactionResult(tx);
      const rows = await requestResult(tx.objectStore(WIKI_STORE).getAll());
      await done;
      return rows.map(row => validateWikiEntry(row));
    },
    async get(id) {
      const tx = db.transaction(WIKI_STORE, "readonly");
      const done = transactionResult(tx);
      const row = await requestResult(tx.objectStore(WIKI_STORE).get(id));
      await done;
      return row ? validateWikiEntry(row) : null;
    },
    async save(input) {
      const entry = validateWikiEntry(input);
      const tx = db.transaction(WIKI_STORE, "readwrite");
      const done = transactionResult(tx);
      tx.objectStore(WIKI_STORE).put(entry);
      await done;
      return entry;
    },
    async remove(id) {
      const tx = db.transaction(WIKI_STORE, "readwrite");
      const done = transactionResult(tx);
      tx.objectStore(WIKI_STORE).delete(id);
      await done;
      return true;
    }
  };
}
