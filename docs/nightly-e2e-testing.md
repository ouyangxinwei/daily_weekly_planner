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
- Long-running repeated module navigation and LocalStorage JSON/schema audits (10 minutes on the scheduled run).
- Uncaught browser JavaScript errors.
- Failure-only screenshots and retained-on-failure Playwright traces, uploaded with the HTML/JSON reports and stability summary.

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

- The Nightly Playwright workflow was previously **disabled manually in GitHub Actions**. The workflow now includes a daily 02:00 JST schedule; it will run only after the workflow is re-enabled in GitHub Actions.
- This is a repository Actions setting, not a change to the workflow YAML. The workflow file and Playwright tests remain in the repository.
- The scheduled run executes the complete Playwright E2E suite, including all module smoke/user-journey checks and the stability soak test (10 minutes). Push and pull-request runs retain the shorter 1-minute stability duration.
- The workflow's enabled/disabled state is a GitHub Actions setting, not a Git commit. If it remains disabled, the schedule will not execute. Code Validation and other independent workflows continue to run normally.
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

The workflow runs daily at 02:00 Japan Standard Time using `0 17 * * *` (UTC). GitHub scheduled workflows can be delayed during periods of high load, so this is a target start time rather than a guaranteed exact start. The YAML also defines push and pull-request triggers for `main`, plus `workflow_dispatch`. GitHub's disabled/enabled state is managed in the Actions UI and is not represented by a Git commit.

## Interpreting results

A green workflow means the browser scenarios and the configured soak duration completed without detected failures. It is not a proof that every possible application state is defect-free. A failed run should be inspected through the HTML report and any attached screenshot/trace.


## Unified MVP testing principles

Use these principles as the default for new feature development and module coverage:

1. Reuse one shared mocked-auth Playwright Fixture.
2. For each new module, begin with the most basic user-operation test.
3. Prioritize create, edit, complete, reload, and data-retention behavior where those operations apply.
4. Avoid large numbers of repetitive tests for simple features; reuse existing helpers and smoke coverage.
5. Isolate cloud requests by default. Tests must not access or modify production data.
6. Add dedicated tests only when a feature has complex business rules or a relevant history of defects.

### Authentication and cloud boundary

The shared Fixture simulates a successful frontend login for browser-flow testing. It is not a verification of real Supabase authentication, authorization, or RLS policies. The login RPC is mocked and other Supabase REST requests are blocked. Real backend authentication and cloud-permission checks, when needed, must be handled separately in a dedicated non-production test environment.

### Default development workflow

For a routine module or feature change, add the smallest useful Playwright scenario using the shared Fixture, run the relevant validation workflow, and report exactly which checks ran. Expand coverage only when risk or observed failures justify it.
