# Language Learning Workspace V2.0.0 (app V10.35)

An independent language-learning workspace inside Daily Weekly Planner. It borrows interaction ideas from TOEIC Study System without reusing its source code, database, or data model. See the V10.35 requirements, impact analysis, and acceptance documents in this folder (Chinese).

## Navigation
- Use the Planner Workspace / Language Study Workspace switch in the top bar. The language workspace hides the module bar and planner area; theme, interface language, account, and system tools stay available.
- The active workspace is stored in `personal-planner:active-workspace:v1` and restored after refresh. A small `<script data-workspace-boot>` in `index.html` sets `html[data-workspace]` early to avoid a flash of planner content.
- Sections: Dashboard, Content, Practice, Mistakes, Learning Records, Data Management. "Study" on a card opens the detail view.
- The "Language Tasks" module in the Planner Workspace is the original language task list (`personal-language:v1`) and is fully separate from this workspace.

## Learning status
Not started → (open) Learning → Completed / Needs review / Mastered; Mastered → (relearn) Learning. Status changes only through study actions, each creating a learning record and updating `lastStudiedAt`. Editing keeps the status. Practice skips mastered items and prefers items needing review.

## Data (schemaVersion 2)
Key `personal-language-study-workspace:v1` holds `items` (with unit, level, status, lastStudiedAt), `records` (action, resulting status), `notes` (personal notes, ≤ 3000 chars), and `settings`. Deleting content keeps its records and notes.

## V1 migration
V1 data is migrated automatically; the original string is first saved to `personal-language-study-workspace:v1:pre-v2-backup` (never overwritten). Status mapping: new→not_started, mistake→review, mastered→mastered. Unreadable data opens read-only and is never written back; its raw data can be exported from Data Management.

## Import / export
Exports schemaVersion 2 with `moduleType: "language-workspace"`. Imports accept V1 and V2 (5 MB limit, validated and confirmed). The workspace makes no network requests and is not part of cloud sync.

## Rollback
V10.34 cannot read V2 data and overwrites it with empty data after any action. Export JSON before rolling back; restore from the pre-v2 backup key or the export afterwards.

## Limitations
Vocabulary and grammar pages, statistics, study time, spaced repetition, audio, cloud sync, and a fully translated workspace UI are planned for later versions.
