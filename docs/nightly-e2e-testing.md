# Nightly Playwright E2E and Stability Testing

## Purpose

This project is a static HTML application. The browser suite verifies real user-visible behavior without changing the production application or its data format.

## Safety boundary

- Every test uses a fresh Playwright browser context and its isolated LocalStorage.
- The test intercepts the Supabase login RPC and returns a synthetic success response.
- Every other request under `/rest/v1/` is blocked by Playwright.
- No real Supabase account, password, snapshot, upload, or download is used.
- The tests do not open cloud-sync dialogs or invoke cloud synchronization.
- Test records exist only in the temporary browser context created by the test runner.

## Test coverage

- All seven module navigation buttons.
- Independent LocalStorage partitions for Plan, Work, Language, Organize, Results, Future, and Memo.
- Create/save behavior in each module.
- Persistence after a browser reload.
- Plan completion-state persistence.
- Long-running repeated module navigation and LocalStorage JSON/schema audits.
- Uncaught browser JavaScript errors.

## Run locally

Requirements: Node.js 24, Python 3, and npm.

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

Run only the normal browser regression tests:

```bash
npm run test:e2e:smoke
```

Run a shorter stability test while developing:

```bash
STABILITY_DURATION_MINUTES=2 npm run test:stability
```

## GitHub Actions

- Daily schedule: removed in V10.35 to keep maintenance light for a personal project.
- Push and pull-request validation: 1-minute stability smoke duration plus all functional tests.
- Manual run: Actions → Nightly Playwright E2E and Stability → Run workflow; default stability duration 10 minutes, can be changed.
- Job timeout: 60 minutes.
- HTML report, JSON results, screenshots, traces, and stability summary are uploaded as an artifact for 30 days.

There is no scheduled run. Re-add a `schedule` trigger to the workflow if nightly runs are needed again.

## Interpreting results

A green workflow means the browser scenarios and the configured soak duration completed without detected failures. It is not a proof that every possible application state is defect-free. A failed run should be inspected through the HTML report and any attached screenshot/trace.
