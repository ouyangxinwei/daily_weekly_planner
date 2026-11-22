import { validateRecord, validateSetting, LAB_STORES } from "./indexeddb.js";

export const BACKUP_FORMAT = "testnisa-lab-backup";
export const BACKUP_VERSION = 1;
export const BACKUP_MAX_BYTES = 2 * 1024 * 1024;
const MAX_ENTRIES = 1000;

/**
 * A format-version adapter converts a serialized backup payload into the
 * canonical in-memory snapshot consumed by preview and restore.
 *
 * The IndexedDB schema version is deliberately not consulted here:
 * backup format versions and database schema versions evolve independently.
 * Add a new adapter when a new serialized backup format is introduced.
 */
const BACKUP_VERSION_ADAPTERS = new Map([
  [1, normalizeSnapshot]
]);

function byteLength(text) {
  return new TextEncoder().encode(text).byteLength;
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("Backup payload must be an object");
  }
  if (!Array.isArray(snapshot.records) || !Array.isArray(snapshot.settings)) {
    throw new TypeError("Backup must contain records and settings arrays");
  }
  if (snapshot.records.length > MAX_ENTRIES || snapshot.settings.length > MAX_ENTRIES) {
    throw new RangeError(`Backup entries must not exceed ${MAX_ENTRIES} per collection`);
  }
  const records = snapshot.records.map(validateRecord);
  const settings = snapshot.settings.map(item => {
    if (!item || typeof item !== "object") throw new TypeError("Invalid setting entry");
    const normalized = validateSetting(item.key, item.value);
    normalized.updatedAt = Number.isFinite(item.updatedAt) ? item.updatedAt : normalized.updatedAt;
    return normalized;
  });
  const recordIds = new Set();
  for (const record of records) {
    if (recordIds.has(record.id)) throw new TypeError("Backup contains duplicate record IDs");
    recordIds.add(record.id);
  }
  const settingKeys = new Set();
  for (const setting of settings) {
    if (settingKeys.has(setting.key)) throw new TypeError("Backup contains duplicate setting keys");
    settingKeys.add(setting.key);
  }
  return { records, settings };
}

/**
 * Convert a serialized payload of a supported backup format into the
 * canonical snapshot. Adapters must be pure and must not mutate input.
 */
export function adaptBackupPayload(version, payload) {
  if (!Number.isInteger(version) || version < 1) {
    throw new TypeError("Backup version must be a positive integer");
  }
  const adapter = BACKUP_VERSION_ADAPTERS.get(version);
  if (!adapter) throw new TypeError(`Unsupported backup version: ${version}`);
  return adapter(payload);
}

export function createBackupText(snapshot, exportedAt = new Date().toISOString()) {
  if (typeof exportedAt !== "string" || !Number.isFinite(Date.parse(exportedAt))) {
    throw new TypeError("exportedAt must be a valid date string");
  }
  const payload = adaptBackupPayload(BACKUP_VERSION, snapshot);
  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    payload
  };
  const text = JSON.stringify(backup, null, 2);
  if (byteLength(text) > BACKUP_MAX_BYTES) throw new RangeError("Backup file exceeds the 2 MiB limit");
  return text;
}

export function parseBackupText(text) {
  if (typeof text !== "string" || text.length === 0) throw new TypeError("Backup file is empty or invalid");
  if (byteLength(text) > BACKUP_MAX_BYTES) throw new RangeError("Backup file exceeds the 2 MiB limit");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SyntaxError("Backup file is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("Backup root must be an object");
  }
  if (parsed.format !== BACKUP_FORMAT) throw new TypeError("Unsupported backup format");
  if (!Number.isInteger(parsed.version) || parsed.version < 1) {
    throw new TypeError("Backup version must be a positive integer");
  }
  if (typeof parsed.exportedAt !== "string" || !Number.isFinite(Date.parse(parsed.exportedAt))) {
    throw new TypeError("Backup exportedAt is missing or invalid");
  }
  const payload = adaptBackupPayload(parsed.version, parsed.payload);
  return {
    format: BACKUP_FORMAT,
    version: parsed.version,
    exportedAt: parsed.exportedAt,
    payload
  };
}

export function previewBackup(backup) {
  if (!backup || backup.format !== BACKUP_FORMAT || !Number.isInteger(backup.version)) {
    throw new TypeError("A validated testNisa backup is required");
  }
  const { records, settings } = adaptBackupPayload(backup.version, backup.payload);
  const byType = {};
  for (const record of records) byType[record.type] = (byType[record.type] ?? 0) + 1;
  return {
    format: backup.format,
    backupFormatVersion: backup.version,
    exportedAt: backup.exportedAt,
    recordCount: records.length,
    settingCount: settings.length,
    recordTypes: byType,
    restoreMode: "replace"
  };
}

function transactionResult(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("Restore transaction aborted"));
    transaction.onerror = () => {
      // IndexedDB request errors normally bubble and abort the transaction.
      // Wait for onabort so callers only treat a committed transaction as success.
    };
  });
}

/**
 * Atomically replace records/settings. All requests are queued synchronously
 * in one readwrite transaction so no await can allow the transaction to
 * become inactive between clear/put operations.
 */
export async function restoreBackup(db, backup) {
  if (!db || typeof db.transaction !== "function") {
    throw new TypeError("A valid IndexedDB database is required");
  }
  if (!backup || backup.format !== BACKUP_FORMAT || !Number.isInteger(backup.version)) {
    throw new TypeError("A validated testNisa backup is required");
  }

  // Validate and adapt the complete payload before opening a write transaction.
  const { records, settings } = adaptBackupPayload(backup.version, backup.payload);
  const transaction = db.transaction([LAB_STORES.records, LAB_STORES.settings], "readwrite");
  const done = transactionResult(transaction);

  try {
    const recordStore = transaction.objectStore(LAB_STORES.records);
    const settingStore = transaction.objectStore(LAB_STORES.settings);
    recordStore.clear();
    settingStore.clear();
    for (const record of records) recordStore.put(record);
    for (const setting of settings) settingStore.put(setting);
    await done;
    return {
      recordsRestored: records.length,
      settingsRestored: settings.length,
      backupFormatVersion: backup.version,
      databaseSchemaVersion: db.version
    };
  } catch (error) {
    try { transaction.abort(); } catch { /* already aborted or inactive */ }
    await done.catch(() => {});
    throw error;
  }
}
