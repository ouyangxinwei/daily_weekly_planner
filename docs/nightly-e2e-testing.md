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

## GitHub Actions workflow operations

### Current operating decision

- The Nightly Playwright workflow is **disabled manually in GitHub Actions** to avoid slowing down normal development.
- This is a repository Actions setting, not a change to the workflow YAML. The workflow file and Playwright tests remain in the repository.
- While disabled, new pushes and pull-request updates do not automatically start this workflow. Code Validation and other independent workflows continue to run normally.
- Disabling a workflow does **not** reliably cancel a run that is already in progress. Open that run and use **Cancel workflow** separately if it should stop.
- Do not treat the disabled state as evidence that browser tests passed. Report browser validation as not run unless a specific run has completed successfully.

### Disable Nightly Playwright

1. Open the repository on GitHub and select **Actions**.
2. In the workflow list, select **Nightly Playwright E2E and Stability**.
3. Open the workflow's `...` menu and select **Disable workflow**.
4. Confirm the disabled state on the workflow page.
5. If a run is already active, open its run page and select **Cancel workflow** separately.

### Re-enable Nightly Playwright

1. Open **Actions** in the repository.
2. Select **Nightly Playwright E2E and Stability**.
3. Open the workflow's `...` menu and select **Enable workflow**.
4. After enabling, pushes and pull requests targeting `main` can trigger it again according to the workflow YAML.

### Run manually when needed

1. Re-enable the workflow first if GitHub does not offer the manual run action while it is disabled.
2. Open **Actions → Nightly Playwright E2E and Stability → Run workflow**.
3. Select the branch and stability duration, then start the run.
4. Inspect the focused company navigation step and the full browser regression step separately in the run summary.

The workflow has no daily schedule. The YAML currently defines push and pull-request triggers for `main`, plus `workflow_dispatch`. GitHub's disabled/enabled state is managed in the Actions UI and is not represented by a Git commit.

## Interpreting results

A green workflow means the browser scenarios and the configured soak duration completed without detected failures. It is not a proof that every possible application state is defect-free. A failed run should be inspected through the HTML report and any attached screenshot/trace.
