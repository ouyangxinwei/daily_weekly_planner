// V10.58: strict full reads of company-api list endpoints plus a short-lived
// in-memory cache. Pure module (no DOM) so Node validation scripts can import it.
//
// Completeness rules (same as the Phase 2-A ~ 2-D requirements):
// - every page must report the same non-negative integer `total`;
// - an empty or short page before `total` is reached is an error;
// - the final item count must equal `total`.
// Incomplete data is never returned as if it were complete.
//
// Cache rules (company-api allows 30 requests per IP per 60 seconds):
// - identical reads that are already in flight are shared;
// - a finished read is reused while it is younger than the caller's `maxAgeMs`;
// - `invalidate()` drops everything (call it after any write);
// - failed reads are never cached.

export const PAGE_SIZE = 100;
export const MAX_OFFSET = 1000000;

export class IncompleteDataError extends Error {
  constructor(label, reason) {
    super('Incomplete company records: ' + label + ' (' + reason + ')');
    this.name = 'IncompleteDataError';
    this.code = 'INCOMPLETE_DATA';
    this.label = label;
    this.reason = reason;
  }
}

export async function fetchCompleteList(request, path, { label = path, pageSize = PAGE_SIZE, maxOffset = MAX_OFFSET } = {}) {
  const all = [];
  let offset = 0, expectedTotal = null;
  while (true) {
    if (offset > maxOffset) throw new IncompleteDataError(label, 'offset-limit');
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    const result = await request(path + (path.includes('?') ? '&' : '?') + params.toString());
    const page = Array.isArray(result?.items) ? result.items : null;
    if (!page) throw new IncompleteDataError(label, 'invalid-page');
    const reportedTotal = Number(result?.total);
    if (!Number.isInteger(reportedTotal) || reportedTotal < 0) throw new IncompleteDataError(label, 'invalid-total');
    if (expectedTotal === null) expectedTotal = reportedTotal;
    else if (reportedTotal !== expectedTotal) throw new IncompleteDataError(label, 'total-changed');
    if (!page.length && offset < expectedTotal) throw new IncompleteDataError(label, 'empty-page');
    all.push(...page);
    offset += page.length;
    if (offset >= expectedTotal) break;
    if (page.length < pageSize) throw new IncompleteDataError(label, 'short-page');
  }
  if (all.length !== expectedTotal) throw new IncompleteDataError(label, 'count-mismatch');
  return all;
}

export function createRecordCache({ request, now = () => Date.now(), pageSize = PAGE_SIZE } = {}) {
  if (typeof request !== 'function') throw new TypeError('request must be a function');
  const entries = new Map();
  function load(path, { label = path, maxAgeMs = 0 } = {}) {
    const cached = entries.get(path);
    if (cached && (cached.pending || now() - cached.loadedAt < maxAgeMs)) return cached.promise.then(items => items.slice());
    const entry = { pending: true, loadedAt: 0, promise: null };
    entry.promise = fetchCompleteList(request, path, { label, pageSize }).then(items => {
      entry.pending = false;
      entry.loadedAt = now();
      return items;
    }, error => {
      if (entries.get(path) === entry) entries.delete(path);
      throw error;
    });
    entries.set(path, entry);
    return entry.promise.then(items => items.slice());
  }
  // Reads still in flight finish for their callers but are no longer reused.
  function invalidate() { entries.clear(); }
  return Object.freeze({ load, invalidate, get size() { return entries.size; } });
}
