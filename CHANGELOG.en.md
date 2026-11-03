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
