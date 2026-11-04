# V10.18 Phase 3 — Operation Tracing Acceptance

- [ ] Open the app and verify initial local load / migration operations create START and END records.
- [ ] Switch between Plan, Work, Language and Organizer; verify module tags are correct.
- [ ] Quick-add and create a record in each module; verify operation label and commitState child trace.
- [ ] Edit a record and change category; verify START/END and elapsed time.
- [ ] Toggle completion and, in Work, change work status; verify distinct operation labels.
- [ ] Archive, move to Trash, restore, bulk restore/delete, undo and clean expired Trash; verify traces.
- [ ] Add, rename and delete a category with associated records; verify category operation traces.
- [ ] Export JSON backup and validate/import a backup; verify backup traces without logging file contents.
- [ ] Cause a controlled test exception in a wrapped operation; verify FAILED is recorded and original failure behavior remains.
- [ ] Verify nested synchronous calls share Execution ID and have distinct Span/Parent Span IDs.
- [ ] Confirm log details do not contain passwords, tokens, function arguments or full task records.
- [ ] Confirm DEBUG remains off by default and logs persist after reload.
- [ ] Confirm existing four-module data, backup, cloud sync, PWA and Phase 2 viewer remain functional.
