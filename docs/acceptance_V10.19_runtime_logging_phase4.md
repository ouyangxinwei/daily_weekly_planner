# V10.19 Phase 4 — Data, Cloud Tracing and Health Check Acceptance

- [ ] Open System Health Check and verify app version / entry status.
- [ ] Verify all four local module partitions are readable and schema-checked without writes.
- [ ] Verify absent local module data is reported as a valid empty/default state.
- [ ] Verify malformed JSON or schema is reported as an error without repair or overwrite.
- [ ] Verify IndexedDB diagnostic write/read and log entry visibility.
- [ ] Verify Service Worker registration status.
- [ ] While signed in, verify Supabase planner_get_data read-only check; while signed out, verify Not Checked.
- [ ] Verify GitHub Pages status matches the current main commit; API/network unavailability is Not Checked, not deployment failure.
- [ ] Verify single-module and whole-cloud RPC requests create START and terminal records with method/path/status only.
- [ ] Verify whole-upload local snapshot, whole-download cloud validation, local persistence and rollback have execution traces.
- [ ] Trigger a controlled request failure and verify ERROR records while existing user-facing error handling remains intact.
- [ ] Confirm no passwords, session tokens, apikey values, request bodies or full business records appear in logs.
- [ ] Confirm health check does not modify any of the four business LocalStorage values.
- [ ] Confirm JSON backup format, schemaVersion, Supabase RPC/database contract and login flow are unchanged.
- [ ] Verify mobile layout and Chinese / English / Japanese labels.
