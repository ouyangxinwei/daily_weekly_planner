// V10.58: strict "read every page" helper for company-api internal scans.
// Only erasable TypeScript syntax is used so that Node (type stripping) can
// import this file in scripts/validate-v10.58.mjs.
//
// Rules (same as the front-end loader):
// - every page must report the same non-negative integer `total`;
// - an empty or short page before `total` is reached is an error;
// - the final item count must equal `total`.

export const LIST_PAGE_SIZE = 100;
export const LIST_MAX_OFFSET = 1_000_000;

export type ListPage = { items?: unknown; total?: unknown };

export class IncompleteListError extends Error {
  reason: string;
  constructor(reason: string) {
    super("INCOMPLETE_LIST: " + reason);
    this.name = "IncompleteListError";
    this.reason = reason;
  }
}

export async function collectAllPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<ListPage>,
  pageSize: number = LIST_PAGE_SIZE,
  maxOffset: number = LIST_MAX_OFFSET,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  let expectedTotal: number | null = null;
  while (true) {
    if (offset > maxOffset) throw new IncompleteListError("offset-limit");
    const page = await fetchPage(offset, pageSize);
    const items = Array.isArray(page?.items) ? page.items as T[] : null;
    if (!items) throw new IncompleteListError("invalid-page");
    const rawTotal = page?.total;
    const total = typeof rawTotal === "number" ? rawTotal : (typeof rawTotal === "string" && rawTotal.trim() !== "" ? Number(rawTotal) : NaN);
    if (!Number.isInteger(total) || total < 0) throw new IncompleteListError("invalid-total");
    if (expectedTotal === null) expectedTotal = total;
    else if (total !== expectedTotal) throw new IncompleteListError("total-changed");
    if (!items.length && offset < expectedTotal) throw new IncompleteListError("empty-page");
    all.push(...items);
    offset += items.length;
    if (offset >= expectedTotal) break;
    if (items.length < pageSize) throw new IncompleteListError("short-page");
  }
  if (all.length !== expectedTotal) throw new IncompleteListError("count-mismatch");
  return all;
}
