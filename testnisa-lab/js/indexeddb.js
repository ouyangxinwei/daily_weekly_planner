export const LAB_DB_NAME = "testnisa-technical-lab";
export const LAB_DB_VERSION = 2;
export const LAB_STORES = Object.freeze({ records: "records", settings: "settings", meta: "schema_meta" });

const STORE_NAMES = new Set([LAB_STORES.records, LAB_STORES.settings]);

export function validateRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("record must be an object");
  }
  if (!(typeof record.id === "string" || (typeof record.id === "number" && Number.isFinite(record.id)))) {
    throw new TypeError("record.id must be a non-empty string or finite number");
  }
  if (typeof record.id === "string" && record.id.trim() === "") {
    throw new TypeError("record.id must not be empty");
  }
  if (typeof record.type !== "string" || record.type.trim() === "" || record.type.length > 80) {
    throw new TypeError("record.type must be a non-empty string up to 80 characters");
  }
  if (typeof record.name !== "string" || record.name.trim() === "" || record.name.length > 200) {
    throw new TypeError("record.name must be a non-empty string up to 200 characters");
  }
  if (record.notes !== undefined && (typeof record.notes !== "string" || record.notes.length > 4000)) {
    throw new TypeError("record.notes must be text up to 4000 characters");
  }
  return {
    id: record.id,
    type: record.type.trim(),
    name: record.name.trim(),
    notes: record.notes ?? "",
    updatedAt: Number.isFinite(record.updatedAt) ? record.updatedAt : Date.now()
  };
}

export function validateSetting(key, value) {
  if (typeof key !== "string" || key.trim() === "" || key.length > 120) {
    throw new TypeError("setting key must be a non-empty string up to 120 characters");
  }
  if (typeof structuredClone !== "function") {
    throw new Error("This browser does not support structuredClone");
  }
  let cloned;
  try {
    cloned = structuredClone(value);
  } catch {
    throw new TypeError("setting value must be structured-cloneable");
  }
  return { key: key.trim(), value: cloned, updatedAt: Date.now() };
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionResult(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

function ensureIndex(store, name, keyPath, options = { unique: false }) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, options);
}

export function upgradeLabSchema(db, transaction, oldVersion, newVersion, now = () => Date.now()) {
  if (!db || typeof db.createObjectStore !== "function") throw new TypeError("A valid upgrade database is required");
  if (!Number.isInteger(oldVersion) || !Number.isInteger(newVersion) || oldVersion < 0 || newVersion > LAB_DB_VERSION || newVersion < oldVersion) {
    throw new RangeError("Unsupported IndexedDB schema version transition");
  }
  let version = oldVersion;
  while (version < newVersion) {
    const next = version + 1;
    if (version === 0 && next === 1) {
      if (!db.objectStoreNames.contains(LAB_STORES.records)) {
        const records = db.createObjectStore(LAB_STORES.records, { keyPath: "id" });
        ensureIndex(records, "by_type", "type");
        ensureIndex(records, "by_updated_at", "updatedAt");
      }
      if (!db.objectStoreNames.contains(LAB_STORES.settings)) {
        const settings = db.createObjectStore(LAB_STORES.settings, { keyPath: "key" });
        ensureIndex(settings, "by_updated_at", "updatedAt");
      }
    } else if (version === 1 && next === 2) {
      if (!db.objectStoreNames.contains(LAB_STORES.records)) throw new Error("Cannot migrate schema v1: records store is missing");
      ensureIndex(transaction.objectStore(LAB_STORES.records), "by_name", "name");
      if (!db.objectStoreNames.contains(LAB_STORES.meta)) {
        db.createObjectStore(LAB_STORES.meta, { keyPath: "key" });
      }
      const metadata = transaction.objectStore(LAB_STORES.meta);
      metadata.put({ key: "schema", version: 2, updatedAt: now() });
      metadata.put({ key: "migration:1-2", fromVersion: 1, toVersion: 2, appliedAt: now(), changes: ["records.by_name index", "schema_meta store"] });
    } else {
      throw new Error("No migration is registered for schema version " + version);
    }
    version = next;
  }
}

export async function getDatabaseSchemaInfo(db) {
  if (!db || typeof db.transaction !== "function") throw new TypeError("A valid IndexedDB database is required");
  const transaction = db.transaction(LAB_STORES.meta, "readonly");
  const done = transactionResult(transaction);
  const entries = await requestResult(transaction.objectStore(LAB_STORES.meta).getAll());
  await done;
  const schema = entries.find(entry => entry.key === "schema") ?? null;
  const migrations = entries.filter(entry => typeof entry.key === "string" && entry.key.startsWith("migration:"))
    .sort((a, b) => a.appliedAt - b.appliedAt);
  return { databaseVersion: db.version, schema, migrations };
}

export function openLabDatabase(indexedDBImpl = globalThis.indexedDB, onBlocked = () => {}) {
  if (!indexedDBImpl || typeof indexedDBImpl.open !== "function") {
    return Promise.reject(new Error("IndexedDB is unavailable in this browser context"));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(LAB_DB_NAME, LAB_DB_VERSION);
    let settled = false;
    let upgradeError = null;
    request.onupgradeneeded = event => {
      try {
        upgradeLabSchema(request.result, request.transaction, event.oldVersion, event.newVersion);
      } catch (error) {
        upgradeError = error;
        try { request.transaction.abort(); } catch { /* browser may already have aborted */ }
      }
    };
    request.onblocked = () => {
      onBlocked();
      if (!settled) {
        settled = true;
        reject(new Error("Database upgrade is blocked by another open tab. Close other experiment tabs and retry."));
      }
    };
    request.onerror = () => {
      if (!settled) {
        settled = true;
        reject(upgradeError ?? request.error ?? new Error("Unable to open IndexedDB"));
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (settled) { db.close(); return; }
      settled = true;
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

function assertStoreName(storeName) {
  if (!STORE_NAMES.has(storeName)) throw new TypeError("Unknown IndexedDB store");
}

export function createLabStorage(db) {
  if (!db || typeof db.transaction !== "function") throw new TypeError("A valid IndexedDB database is required");

  async function run(storeName, mode, action) {
    assertStoreName(storeName);
    const transaction = db.transaction(storeName, mode);
    const done = transactionResult(transaction);
    try {
      const result = await action(transaction.objectStore(storeName));
      await done;
      return result;
    } catch (error) {
      try { transaction.abort(); } catch { /* transaction may already be inactive */ }
      await done.catch(() => {});
      throw error;
    }
  }

  return Object.freeze({
    async putRecord(input) {
      const record = validateRecord(input);
      return run(LAB_STORES.records, "readwrite", store => requestResult(store.put(record))).then(() => record);
    },
    async getRecord(id) {
      return run(LAB_STORES.records, "readonly", store => requestResult(store.get(id)));
    },
    async getAllRecords(type) {
      return run(LAB_STORES.records, "readonly", store => {
        const request = type
          ? store.index("by_type").getAll(type)
          : store.getAll();
        return requestResult(request);
      });
    },
    async deleteRecord(id) {
      return run(LAB_STORES.records, "readwrite", store => requestResult(store.delete(id)));
    },
    async clearRecords() {
      return run(LAB_STORES.records, "readwrite", store => requestResult(store.clear()));
    },
    async putSetting(key, value) {
      const setting = validateSetting(key, value);
      return run(LAB_STORES.settings, "readwrite", store => requestResult(store.put(setting))).then(() => setting);
    },
    async getSetting(key) {
      return run(LAB_STORES.settings, "readonly", store => requestResult(store.get(key)));
    },
    async getAllSettings() {
      return run(LAB_STORES.settings, "readonly", store => requestResult(store.getAll()));
    },
    async atomicPutRecords(inputs) {
      if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 100) {
        throw new RangeError("atomicPutRecords requires between 1 and 100 records");
      }
      const records = inputs.map(validateRecord);
      return run(LAB_STORES.records, "readwrite", async store => {
        for (const record of records) await requestResult(store.put(record));
        return records;
      });
    },
    async atomicCreateRecords(inputs) {
      if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 100) {
        throw new RangeError("atomicCreateRecords requires between 1 and 100 records");
      }
      const records = inputs.map(validateRecord);
      return run(LAB_STORES.records, "readwrite", async store => {
        for (const record of records) await requestResult(store.add(record));
        return records;
      });
    }
  });
}
