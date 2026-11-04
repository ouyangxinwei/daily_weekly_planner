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
