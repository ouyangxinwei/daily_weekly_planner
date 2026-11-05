## V10.21 · Plan-to-Module Move — 2026-11-05

- Added a one-way move action when editing an existing item in Plan. Items can move to Work, Organize or Foreign Language Learning.
- After a successful move, the original Plan record is removed and a new item is created in the destination module. Title, notes, reference URL and priority are retained.
- The destination item starts incomplete / pending and uses the destination module's default category. Plan period, reminder date, temporary-cycle metadata and completion state are not carried over.
- Only Plan → one of the other three modules is supported. No reverse-move action is exposed in Work, Organize or Foreign Language Learning.
- Cross-module persistence writes the destination first and then removes the source. If source persistence fails, the destination write is rolled back to avoid losing the original plan on an ordinary save failure.
- Updated Chinese, English and Japanese UI text, static acceptance checks and the Service Worker cache. No business storage keys, schemaVersion, JSON backup format or Supabase database schema changed.

## V10.20 · Full JSON Backup and Module Colors — 2026-11-04

- Added a single full JSON export for Plan, Work, Foreign Language Learning and Organize, including all business data supported by each module's existing backup format: categories, records, completion state, archives and Trash.
- The full backup has its own `backupType: full`, format version and export timestamp; each module retains its `moduleType`. Export is cancelled if any module cannot be read or validated, preventing incomplete files.
- Existing per-module JSON export and import remain unchanged. No full import, runtime-log/system-settings export, or cloud access was added.
- Added distinct soft blue, green, purple and orange backgrounds to the four module buttons without changing their actions, order, dimensions or other UI.
- Updated Chinese/English/Japanese translations and the Service Worker cache. No business LocalStorage keys, data schema, single-module backup format, Supabase RPC or database schema changed.

## V10.19 · Data, Cloud Tracing and Health Check — 2026-11-04

- Added START / END / FAILED tracing for Supabase RPC requests. Only endpoint path, HTTP method and status are logged; credentials, request bodies and cloud business data are excluded.
- Added step tracing for whole-module upload snapshots, whole-cloud download validation, local persistence and rollback. Single-module and whole-cloud sync failures now emit explicit ERROR events.
- Added an in-app System Health Check for all four local data partitions, runtime-log IndexedDB read/write, core initialization, Service Worker, Supabase read-only connectivity and the Pages deployment corresponding to the current main commit.
- Health checks only read business data. Signed-out and network/API-unavailable states are reported as Not Checked rather than failures. Results and timestamps are shown in the app and recorded locally.
- No changes to business LocalStorage keys, schemaVersion, JSON backup format, Supabase RPC/database contract or sign-in flow. Runtime logs remain local-only.
- Updated the Service Worker cache and added Phase 4 acceptance documentation.

## V10.18 · Business Operation Tracing — 2026-11-04

- Added important-operation tracing across Plan, Work, Language and Organizer; each trace is tagged with the active module.
- Covered module switching, local initialization/read, state persistence, shared state commits, quick add, create/edit dialogs, delete/bulk delete, archive, completion/work-status changes, Trash restore/cleanup, undo, category create/update/delete and related-item migration, JSON backup export/validation, and notification permission requests.
- Added START → END SUCCESS/NO_CHANGE or FAILED records. Nested synchronous operations share an Execution ID and include span/parent-span relationships and duration.
- Instrumentation wraps existing functions without changing their business logic, return values, data schema, confirmation flow or failure handling. If the logger is unavailable, original functions run normally.
- DEBUG remains off by default. Function arguments, full business records, passwords and cloud credentials are not logged. Dedicated cloud data-transfer tracing remains in Phase 4.
- Updated the Service Worker cache version.

## V10.17 · Runtime Log Viewer — 2026-11-04

- Added an in-app Runtime Logs entry so users can inspect locally stored logs without browser developer tools.
- Added overview counts for total logs, ERROR, WARN, latest error time, and IndexedDB/in-memory storage status.
- Added filters for level, module and date range, plus keyword search across feature, function, message and error text.
- Added a detail view with redacted fields, error information, Execution ID, span relationships, duration and the complete trace for the selected execution.
- Added JSON/CSV export of the current filtered result, manual refresh, clear-all with confirmation, and a DEBUG toggle (off by default).
- Added Chinese, English and Japanese UI translations and responsive mobile layout. Logs remain local to IndexedDB, are retained for 30 days, and are never uploaded.
- No changes to four-module business data, JSON backup format, Supabase RPC or database schema.

## V10.16 · runtime_logging_foundation — 2026-11-04

- Added a standalone runtime logger module using IndexedDB, isolated from the four business modules' LocalStorage data.
- Added ERROR, WARN, INFO and DEBUG levels; DEBUG is disabled by default.
- Added a unified record format and START / END / FAILED / CANCELLED tracing API with Execution IDs, spans, duration and parent-call linkage.
- Added 30-day retention cleanup, an approximately 10,000-entry capacity guard, sensitive-field redaction and bounded in-memory fallback. Logging failures do not block app startup.
- Added baseline capture for uncaught window errors and unhandled Promise rejections.
- Added the final specification at `docs/runtime_logging_V1.0_final_spec.md`.
- This phase delivers the logging foundation. The in-app viewer, business-function instrumentation, health checks and dedicated acceptance tests are scheduled for later phases.
- Updated the Service Worker cache version. No changes to business data schemas, backup formats or Supabase database structure.

## V10.15 · Whole-Module Cloud Sync — 2026-11-04

- Added one-click upload and download for all four modules: Plan, Work, Foreign Language Learning, and Organize. Existing per-module sync remains unchanged.
- Whole upload validates all four local storage partitions and submits one complete JSONB snapshot through the existing `planner_put_data` RPC; no database migration is required.
- Whole download reads and validates all four cloud partitions before asking for confirmation, then fully replaces the corresponding local partitions without merging. Missing or invalid partitions abort before local writes.
- If local writes fail, the app attempts to restore the four previous storage values. Successful restore refreshes the active module and clears its undo snapshot.
- Updated the service-worker cache version.

## V10.14 · Four-Module Management — 2026-11-04

- Added executable regression tests for legacy Plan category migration, covering active/archived/Trash records, field preservation, category order, idempotence and source immutability; failed persistence does not commit the migrated state.

- Fixed home-module order: Plans → Work → Foreign Language Learning → Organize. All modules reuse the existing UI and management actions while keeping their data independent.
- Work categories: To Do, In Progress, Completed, Work Log, Meetings, Other. Categories remain separate from the Work task-status field (To Do / In Progress / Completed), which stays synchronized with the completion control.
- Foreign Language Learning categories: English, German, Russian, Japanese, Other. Norwegian is intentionally excluded. The first release uses the existing general record workflow, not a dedicated flashcard or spaced-repetition system.
- Removed Work from Plan categories. Existing Plan records in the Work category—including archived and Trash records—are moved to the fixed, non-editable/non-deletable Uncategorized category without changing other fields.
- Added independent local storage, categories, archive, Trash, and JSON `moduleType` backups for all four modules. Legacy Plan backups without `moduleType` remain supported.
- Extended the existing Supabase JSON snapshot with `work` and `language` partitions while preserving the legacy `organizer` partition. Module-specific upload/download does not overwrite other modules; no SQL migration is required.
- Retained Chinese, English, Japanese, PDF export, undo, category management, and PWA support. The app remembers the last active module and updates its service-worker cache.

## V10.13 · Independent Organization Module — 2026-11-03

- Added an **Organize** entry beside **Plans** on the home screen. Both modules run in the same app and reuse the existing UI and business logic.
- Reused create, edit, delete, quick add, search, filtering, sorting, category management, archive, Trash, undo, JSON backup/restore and PWA behavior.
- Added five initial organization categories in order: Books, Electronics, Software/Apps, Websites and Other. New items default to Books. Categories remain user-manageable; deleting a used category requires moving its items first.
- Organization content, categories, completion state, archive and Trash use the separate local storage key `personal-organizer:v1`. Plans retain `personal-planner:v1`; the two modules do not overwrite each other's local business data.
- Organization uses one flat list rather than plan periods. Shared item fields include title, notes, reference URL, priority, reminder and category.
- JSON exports include `moduleType`; backups are module-specific and cannot be imported into the other module by mistake.
- Added an `organizer` partition to the existing Supabase JSON snapshot. Upload reads and merges the cloud snapshot before updating only the active module; download restores only the active module. Legacy plan-only snapshots remain supported.
- Existing Supabase RPC and database schema are unchanged; the root planner fields continue to satisfy current validation. No SQL migration; planner schemaVersion remains 1.
- Updated Chinese, English and Japanese UI strings, PWA cache and V10.13 requirements, acceptance, impact, technical, deployment and delivery documentation.

## V10.12 · Custom Category Management — 2026-11-03

- Added category management for adding, renaming and deleting categories while retaining the original seven categories and order.
- New and quick-added plans default to the first category. Forms and filters refresh when categories change.
- Names must be non-empty, no longer than 30 characters, and unique case-insensitively. At least one category must remain.
- Renaming updates active, archived and Trash plans.
- Deleting a category in use requires a destination. Plans are moved in one transaction before deletion; cancellation or save failure leaves data unchanged, and deletion can be undone.
- Categories sync through local storage, JSON backup/restore and Supabase snapshots. Older data uses the original categories. schemaVersion: 1 remains unchanged; no SQL migration.
- Updated Chinese, English and Japanese UI, PWA cache and V10.12 specifications, acceptance, impact and delivery documents.

## V10.11 · Multilingual UI — 2026-11-03
- Added a standalone i18n module for Simplified Chinese, English and Japanese. Chinese is the first-use default; language changes apply immediately and persist in a separate browser setting.
- Added language selectors to the sign-in screen and app header. System UI, dialogs, feedback, sync, date/time, notifications, PDF export and release history follow the selected language.
- User-entered plan titles, notes, URLs and usernames remain unchanged. Internal category and period values remain compatible.
- Added localized release history files while preserving all historical version entries.
- No change to plan schema, JSON backup format, Supabase structure or save logic; no database migration required.

## V10.10 · Star Dashboard and Task Jump — 2026-11-03
- Added a home summary of incomplete tasks by 1–5 stars across daily, weekly, monthly and yearly plans.
- Selecting a non-zero star opens the period with the most matching tasks, clears search/category filters, and highlights the first matching task.
- Completed, archived and random temporary plans are excluded. No task data is modified.

## V10.9 · Priority Sorting — 2026-11-03
- Made priority sorting the default: incomplete tasks first, then 5 to 1 stars, with stable order for ties.
- Preserved other sort modes and stored the user's sort preference separately in the browser.

## V10.8 · Release History and Deployment Status — 2026-11-03
- Added a version history dialog and GitHub Pages deployment status check against the current main commit SHA.

## V10.7 · Quick Add Plan — 2026-11-02
- Added quick creation of today's plan with transactional save behavior.

## V10.6 · Save Consistency — 2026-11-02
- Persist candidate state before updating UI; save failures retain the original state.

## V10.5 · Five-Star Priority — 2026-11-02
- Expanded priorities to five levels while preserving existing values and backups.

## V10.4 · PDF Export — 2026-11-01
- Added print-ready PDF export for the currently visible plans.

## V10.3 · Reference Website — 2026-11-01
- Added an optional reference URL to plans.

## V10.2 · Remove Login Lockout — 2026-11-01
- Removed the app-level login lockout behavior.

## V10.1 · Trash, Undo and Archive Fixes — 2026-11-01
- Fixed trash, undo and archive workflows.

## V10 · Trash, Undo and Archive — 2026-11-01
- Added trash retention, restore, undo and archive management.

## V9 · Database Authentication — 2026-10-29
- Added database-backed account authentication.

## V8 · Access Gate — 2026-10-29
- Added the sign-in gate.

## V7 · Cloud Sync — 2026-10-29
- Added manual cloud upload and download.

## V6 · Reminders — 2026-10-28
- Added browser reminders for plans.

## V5 · Bulk Clear Controls — 2026-10-28
- Added bulk clearing controls for the current period.

## V4 · Random Temporary Plans — 2026-10-28
- Added daily, weekly and monthly temporary plans.

## V3 · Priority Stars — 2026-10-28
- Added priority star ratings.

## V2 · Categories, Search and Sort — 2026-10-28
- Added categories, keyword search and sorting.

## V1 · JSON Backup — 2026-10-28
- Added JSON export and import.

## V0 · First Version — 2026-10-28
- Initial planner release.
