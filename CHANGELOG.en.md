# V10.71 Startup entry selection and administrator monitoring — 2026-11-26 (development only; not merged or deployed)

- Added two choices on the startup screen: “Personal entry” and “Administrator entry”.
- Personal entry reuses the existing database sign-in and opens the existing personal planning, work, study and task workspace. Signing out returns to the entry chooser.
- Administrator entry requires no sign-in and opens a separate read-only monitoring view for system health, local runtime logs, app version / Pages deployment and GitHub Actions test status.
- The monitoring view does not expose personal plans, account sync, repository lists or company-business editing. Health checks skip Supabase data reads that require account credentials when signed out.
- No permission system, role authentication, database migration, RPC, RLS or API changes. “Administrator” is a public learning-stage monitoring entry, not a security boundary.
- Updated PWA cache, version and Chinese/English/Japanese documentation. Browser acceptance checklist is in docs/user-role-mode.md. No new automated tests or E2E run for this change.
- Changes are on development only; main was not merged and Pages was not deployed.

