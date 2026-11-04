# V10.17 Runtime Log Viewer — Phase 2 Acceptance

- [ ] Main screen shows the Runtime Logs entry after login.
- [ ] Viewer opens and displays total, ERROR, WARN, latest error and storage status.
- [ ] Level, module, date range and keyword filters work together.
- [ ] Entries are ordered newest first; empty results are explained.
- [ ] Selecting a row shows redacted fields, error details, IDs, span relationships and duration.
- [ ] Execution trace loads all records for the selected Execution ID even when list filters are active.
- [ ] JSON and CSV exports contain the current filtered result and valid escaping.
- [ ] DEBUG is off by default; toggling it persists locally and updates Logger settings.
- [ ] Clear-all requires confirmation and clears only the runtime-log database.
- [ ] Viewer is usable at desktop and mobile widths.
- [ ] Chinese, English and Japanese UI labels are available.
- [ ] Reloading the app preserves IndexedDB logs; no log upload request is introduced.
- [ ] Existing four-module, backup, cloud sync, release history and PWA checks pass.
