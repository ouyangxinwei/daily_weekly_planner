# V10.58 Complete company record reads — 2026-11-21

- Fixed related projects, tasks and follow-ups on customer cards and project details being limited to the first 100 records (an `Array.map` index was passed as the record limit).
- Task due-date filters, follow-up/project relation filters and customer/project choices in editors now read complete data. Incomplete pagination (empty page, short page, changing total, count mismatch) shows an error instead of silently using partial data.
- Added a short-lived cache: changing filters or pages no longer repeats requests; opening a page reuses data up to 15 seconds old; Refresh reads again; any create/edit/delete clears the cache. This reduces the chance of hitting the company-api limit of 30 requests per minute.
- Too many requests (429) now shows a clear message; a failed related-information read shows "unavailable" instead of 0.
- Project & customer overview: the follow-up count on customer rows is now labelled "Follow-ups"; clicking "Overdue projects" opens the project list filtered to overdue projects (new "Overdue only" project filter).
- company-api internal task and attachment scans also verify pagination completeness (takes effect after redeploying company-api).
- Attachments: the server checks that file content matches its type (a renamed .exe is rejected); if registering an uploaded file fails, the browser asks the server to delete it so no orphaned file is left.
- Transaction amounts: the server also rejects more than 6 decimal places.
- Aligned phase statuses and version numbers across the company website docs.
- No database, RLS or record format changes.

# V10.57 Development Diary V1 — 2026-11-21

- Added a standalone Development Diary module, separate from plans and tasks, with no completion state or due date.
- Supports activity date, title, details, fixed category, up to five tags and optional duration; entries can be backdated, edited and deleted.
- The default weekly view shows all seven days, including empty days; also supports day view, previous/next week navigation and return to the current week.
- Search historical titles, details and tags (up to 50 results), with fixed-category filtering.
- Reuses the existing custom account login. Every diary RPC validates the username/password and scopes operations to that user. Passwords remain in runtime memory only and are not persisted in browser storage.
- Uses an isolated `diary_entries` table and is excluded from planner JSON backups and cloud snapshots. Plans, company data, weather and stock data are not modified.
- Supports Chinese, English, Japanese, dark theme and mobile layouts; diary errors are contained within the diary area.

# V10.56 Company workspace: transactions, business documents and private attachments — 2026-11-21

- Added Transactions: income/expense, amount, currency (JPY/CNY/USD), status, date and category, optionally linked to a customer and project. Totals are calculated per currency (completed income/expense, net, planned) with no exchange-rate conversion.
- Added Business documents: quotes, contracts, invoices, orders and receipts with number, status, date and validity, optionally linked to a customer and project.
- Transactions and documents can hold private attachments (up to 10 MB; PDF, images, TXT/CSV, Office files), uploaded and downloaded through short-lived signed URLs issued by company-api and stored in private Storage.
- company-api v6 adds /files endpoints plus transaction/document validation; new migration for the private `company-documents` bucket. **Attachments work only after the migration and Edge Function are deployed.**
- Chinese, English and Japanese labels with responsive layouts; existing customer, project, task, follow-up and Phase 2 views are unchanged.

# V10.55 Magnificent Seven stock dashboard — 2026-11-21

- Added a Magnificent Seven stock dashboard directly below the homepage weather section for AAPL, MSFT, NVDA, AMZN, GOOGL, META and TSLA.
- Shows daily closes, daily and weekly changes for the latest trading week in US Eastern dates, with expandable OHLCV details; dates follow returned market data rather than assuming weekend or holiday sessions.
- Added a dedicated Supabase `stock-market-api` Edge Function proxy. No provider key is exposed in the frontend. The current source is Yahoo Finance's unofficial public Chart endpoint; possible delays and availability limitations are disclosed.
- Added 10-minute server cache, 15-minute browser cache, manual refresh and cached-data fallback; supports Chinese, English, Japanese, dark theme and responsive layouts.
- Does not modify company-api, business database, RLS, authentication or planner cloud-sync data.

# V10.54 Company workspace: business trends and period review — 2026-11-20

- Added weekly (last 8 weeks) and monthly (last 6 months) business trend views.
- Summarizes new/completed projects, new/completed tasks and customer follow-up records, with absolute change versus the previous period.
- Reads complete paginated project, task and follow-up records from company-api v5; switching period does not refetch data.
- Clearly labels completion timing as an updated_at proxy for records currently marked completed; no exact completion timestamp or historical status snapshots are implied.
- Added Chinese, English and Japanese labels with responsive layouts.
- No database, RLS, Edge Function, authentication or production business data changes.

# V10.53 Company workspace: project and customer overview — 2026-11-20

- Added a dedicated project and customer overview with project status distribution, average progress, completed/overdue projects, customer project coverage and recent activity.
- Project rows show customer, status, progress and task completion; customer rows summarize project counts and follow-ups.
- Metrics are calculated from complete paginated customer, project, task and follow-up records. Items link to existing details and editing workflows.
- Added Chinese, English and Japanese labels with responsive layouts; retained the business overview, to-do center and existing CRUD.
- Reuses company-api v5 and public.company_records. No database, RLS, Edge Function, authentication or production business data changes.

# V10.52 Company workspace: unified to-do center — 2026-11-20

- Add a unified to-do center for overdue tasks, tasks due today, tasks due in the next 7 days, open tasks without due dates, and pending customer follow-ups.
- The next-seven-day task group covers the seven calendar days after today and does not overlap with the today group.
- Group items by type and show task project/status/due date plus follow-up customer/project links and next-follow-up date state.
- Open the existing task or follow-up editor directly from each item, reusing current CRUD rather than creating duplicate records.
- Load complete paginated task, follow-up, project, and customer records; API or pagination failures display an error instead of a misleading empty list.
- Add Simplified Chinese, English, Japanese, and responsive layouts while preserving the overview, CRUD, project progress linkage, and relationship navigation.
- Reuse company-api v5 and public.company_records. No database, RLS, Edge Function, or production business-data changes.

# V10.51 Company workspace: business overview dashboard — 2026-11-20

- Add a business overview entry with customer, active project, open task, and pending follow-up KPIs.
- Show overdue tasks, tasks due today, tasks due within the next 7 calendar days, and overdue pending follow-ups; each item opens the corresponding filtered workspace.
- Show recently updated projects, recent tasks, and recent customer follow-ups with shortcuts to project details or record editing.
- Read all four record types through paginated API requests and verify stable totals and complete page counts. Failed or incomplete reads show an error instead of misleading zero values.
- Add Simplified Chinese, English, Japanese, and responsive layouts while preserving existing CRUD, project progress linkage, and cross-module navigation.
- Reuse company-api v5 and existing company_records. No database, RLS, Edge Function, or production business-data changes.

# V10.50 Company workspace: task due-date quick filters — 2026-11-20

- Add quick task filters for overdue, due today, the next 7 calendar days (including today), and tasks without a due date.
- Combine due-date filtering with task-name search, task status, and project filters.
- Fetch the complete task set before applying filters and calculating the matching total/pagination, so matching tasks are not missed on other server pages; clamp the page when the result set shrinks.
- Overdue means a due date before the browser's local today and a status other than completed. Other date filters continue to respect the selected status filter.
- Add Simplified Chinese, English, and Japanese labels while preserving task CRUD, automatic project progress linkage, and relationship navigation.
- Reuse the existing due_date and status fields. Frontend, styles, tests, version metadata, and docs only; no database schema, migrations, RLS, company-api v5, or production business-data changes.

# V10.49 Company workspace: direct editing from relationship previews — 2026-11-20

- Customer-card previews for projects, tasks, and follow-ups are now actionable and open the selected record in its editor.
- Project-detail previews for related tasks and follow-ups also open the corresponding editor directly, without requiring a trip through the full list.
- Preserve customer/project associations when editing related records; close the project-details dialog before opening the editor to avoid nested modal dialogs.
- Add keyboard focus and hover affordances while retaining existing navigation, CRUD, and filters across Chinese, English, and Japanese.
- Frontend, styles, tests, version metadata, and docs only. No database, company-api v5, authentication, or production business-data changes.

# V10.48 Company workspace: relationship filter context — 2026-11-20

- Clearly show the customer or project that scopes a list after cross-module navigation, so filtered results are not mistaken for missing records.
- Add a consistent Clear relationship filter action to return to the full list; changing the follow-up project filter clears the previous customer scope.
- Cover customer-to-project, customer/project-to-follow-up, and project-to-task contexts while preserving search, status filters, pagination, and CRUD.
- Frontend, styles, version metadata, and documentation only. No database, company-api v5, authentication, or production business-data changes.

# V10.47 Company workspace: related information overview — 2026-11-20

- Customer cards now summarize related project, task, and follow-up counts, with up to three records previewed in each group.
- Project details now preview related tasks and follow-ups, including status, dates, task descriptions, and follow-up outcomes; up to six records per group are shown, with existing navigation retained for full lists.
- Relationships use existing customer/project IDs and parent-record links. No database schema or company-api changes.
- Added Chinese, English, and Japanese labels, responsive layouts, and Playwright mock-API assertions. Existing CRUD, cross-module navigation, and project progress linkage remain unchanged.

# V10.46 Company workspace: cross-module navigation — 2026-11-20

- Added customer-card shortcuts to view the customer's projects and follow-ups.
- Customer names in project cards link back to the customer; project details now link to the customer, project tasks, and project follow-ups.
- Task cards open their parent project details; follow-up cards link to the related customer and project.
- Customer/project navigation applies relationship-ID filters and reads across list pages so linked records are not limited to the currently visible page.
- Customer navigation focuses the selected customer record while preserving existing CRUD, progress linkage, and authentication behavior.
- Added Playwright mock-API coverage for cross-module navigation. No database schema or company-api changes.

# V10.45 Project task and progress linkage — 2026-11-20

- Added Manual and Automatic from tasks project progress modes.
- Automatic mode calculates completed tasks ÷ all project tasks, rounded to a whole percentage; projects with no tasks show 0%.
- Manual progress is stored separately. Automatic calculations never overwrite it, and switching back to Manual restores the last manual value.
- A database trigger recalculates affected projects when tasks are created, deleted, completed/uncompleted, or reassigned.
- Project cards and details show the active progress mode; Automatic mode also shows completed/total task counts.
- Existing projects remain compatible: missing mode fields default to Manual and their current progress is preserved as the manual value.
- Added a database migration, Edge Function validation for progress fields, Chinese/English/Japanese copy, and Playwright coverage for both modes.

# V10.44 Company workspace: project task management — 2026-11-20

- Added a Project Tasks workspace with project, title, and status filters plus pagination.
- Tasks can be created, edited, and deleted. Every task must belong to a project and supports To do, In progress, Blocked, and Completed statuses, an optional due date, and a description.
- Tasks reuse the existing `task` record type in `company_records`; `parent_record_id` points to the project and `due_date` stores the deadline. No new database table or authentication change.
- Added a Manage Tasks entry in project details. Projects referenced by tasks or follow-ups remain protected from deletion.
- Extended `company-api` with project task listing and server-side project/status validation; added Chinese, English, and Japanese UI plus Playwright mock-API CRUD coverage.

# V10.43 Company workspace: project details and progress — 2026-11-20

- Added a project details dialog showing its customer, status, start date, target date, and description.
- Added manually managed progress as an integer percentage from 0 to 100, displayed on project cards and in the details view. Legacy projects without a progress value display 0%.
- Stores progress in the existing `company_records` project JSONB field `data.progress_percent` and reuses `company-api`; no database table, auth, RLS, RPC, or cloud-sync changes.
- Added Chinese, English and Japanese labels, responsive details layout, and Playwright mock-API coverage for creating, viewing, and updating progress.

# V10.42 Company workspace: projects and follow-ups — 2026-11-20

- Added dedicated Projects and Business Follow-ups views alongside customer management.
- Projects support customer links, create/edit/delete, status, start and target dates, and descriptions.
- Follow-ups support customer and optional project links, contact method, follow-up time, outcome, next follow-up date, notes, and completion status.
- Reuses the existing generic `/records` API and `company_records`; no database migration, schema change, or change to planner authentication/sync.
- Added Chinese, English and Japanese UI, responsive layouts, and Playwright mock-API CRUD coverage. Automated tests do not write to production business data.

# V10.41 · Company Website Customer Workspace — 2026-11-20

- Added a separate Company Website workspace alongside the Planner and Language Study workspaces, without changing the existing seven planner modules or their sync partitions.
- Added the first customer-management workflow: search by customer name, filter by trade/software/ecommerce and status, paginate, create, edit, and delete customers.
- Customer records use the `customer` record type in `company_records`; contact, email, phone, website, address, and notes are stored in the record's JSONB `data` field.
- Reuses the existing Manman Planner account session. Credentials remain in memory and are sent to `company-api` over HTTPS Basic Authorization; no password is stored in LocalStorage and no service-role/secret key is exposed to the browser.
- Added an isolated frontend script and stylesheet, Chinese/English/Japanese labels, PWA cache entries, version updates, and a minimal Playwright test with a mocked API.
- Real customer CRUD still requires one browser-side verification with the existing account after Pages deployment; automated tests use a mock API and do not touch real customer data.

# V10.40 · Weekly Weather at the Bottom — 2026-11-20

- Moved the weather dashboard from the main home content to the bottom of the planner page, keeping plans and tasks as the primary focus.
- Shows seven days for Tokyo and Yokohama, including weekday/date, conditions, high/low temperatures, precipitation probability/amount, and maximum wind speed.
- Sorts each city's days by outdoor suitability: clear, dry, and calm days first; mostly dry moderate days next; rainy or windy days remain visible but appear later.
- Keeps a compact current-weather summary, 10-minute cache, manual refresh, and offline-cache fallback. Weather remains separate from planner data and Supabase sync.
- Updated Open-Meteo daily fields, acceptance coverage, app version, and Service Worker cache.

# V10.39 Homepage Weather Dashboard — 2026-11-20

- Added Tokyo and Yokohama weather using the free Open-Meteo API, Asia/Tokyo timezone and a two-day hourly forecast.
- Shows current conditions and rain/wind alerts for the next 12 hours.
- Added a 10-minute local cache, forced manual refresh and offline-cache fallback. Weather data is separate from planner data and Supabase sync.
- Added documentation and automated validation; bumped app and Service Worker versions.

# V10.38 · Language Workspace: TOEIC Question Bank — 2026-11-19

- Added a "TOEIC question bank" page to the language workspace, browsed as Set → Test → Part with breadcrumbs at each level, plus answered and correct counts and progress bars.
- Each Pt3/Pt4 group (3 questions) is shown on one page, with group chips and previous/next buttons; Pt1 shows 6 questions per page and Pt2 shows 5.
- Conversation and talk scripts are collapsed by default (answer first, then read the script), and the question is shown separately; content-card previews show only the question.
- Options can be picked directly. When a correct answer is filled in (starting with A–D, e.g. "C" or "C) …"), right and wrong are marked and the explanation is shown; without an answer, only the pick is recorded. Picks are stored in settings.toeic.picks and travel with JSON export and import; picks for the current group or page can be cleared. The first pick sets the item to "Learning".
- Placeholder options "[待补充 …]" are shown in a muted style, and questions that need a graphic are flagged. TOEIC items use the same layout on the detail page and in the practice centre.
- Items gain an optional exam field (set, test, part, number, group). Older data without it is recognised from the id (e.g. toeic-s06-t1-pt3-q044); anything else stays a plain item. The storage key and schemaVersion 2 are unchanged.
- Added tools/toeic_tool.py, which turns listening-test text into importable JSON (Pt1–Pt4 only) with a to-do list and a validation report. Question content is copyrighted, so import data stays local and is excluded in .gitignore.
- Language workspace is now V2.1.0. Updated app version and Service Worker cache; added V10.38 validation and TOEIC E2E tests; fixed an E2E selector that matched two buttons.

# V10.37 · No Extra Refresh After Updates — 2026-11-18

- Fixed: after a new release, the first page load still showed the old version and needed another refresh. The Service Worker was cache-first, serving the old cache before updating in the background.
- The Service Worker is now network-first: while online it checks the server for changes every time (unchanged files return a small 304), and uses the cache only when offline. Offline navigation to an uncached page falls back to the home page.
- Cross-origin requests such as Supabase no longer pass through the Service Worker; behavior is unchanged.
- This update itself still needs one refresh (the old Service Worker serves its cache one last time); from the next release on, opening the app shows the latest version.
- No changes to data, storage keys, or sync logic. Updated app version and Service Worker cache; added V10.37 validation.

# V10.36 · Sync Time Comparison Fix (Memo) — 2026-11-18

- Fixed: after a successful whole upload, a whole download still reported "local newer, cloud older". The cloud function planner_get_data rebuilds sync times for six modules only and omits Memo (added in V10.29), so the cloud's latest time was underestimated.
- Uploads (single module and whole) now also store all seven module times in the snapshot field _clientSyncMeta. Comparisons prefer server times and fall back to _clientSyncMeta, so Memo shows a time when synced on its own as well.
- No changes to the database, RPCs, tables, LocalStorage keys, or data formats. Upload once after updating so the cloud stores the new time information.
- Updated app version and Service Worker cache; added V10.36 validation.

# V10.35 · Language Learning Workspace V2 — 2026-11-18

- Added a Planner Workspace / Language Study Workspace switch in the top bar. The language workspace hides the module bar and planner area while keeping theme, interface language, account, and system tools. The last workspace is restored after refresh; switching never reloads module data, and Plan search, filters, and pagination are preserved.
- The Language module in the Planner Workspace shows its original task list again, renamed "Language Tasks", for planner tasks such as "study English for 30 minutes". Its data (personal-language:v1), categories, star statistics, move target, backups, and cloud partition are unchanged; during V10.34 the data was untouched but had no entry point.
- Learning status now has five states: Not started, Learning, Completed, Needs review, Mastered. Status changes only through study actions (open, complete session, needs review, mastered, relearn), each creating a learning record; editing content keeps its status.
- Added unit and level fields, unit/status filters, four sort orders, and 10-per-page pagination for Content, Mistakes, and Learning Records.
- Added a content detail view showing prompt/source, options, answer/meaning, and explanation by content type, plus editable personal notes. The former "explanation and notes" field is now labelled "Explanation"; its content is unchanged.
- Practice prefers items needing review and skips mastered items.
- Workspace data is upgraded to schemaVersion 2 under the same key. Before the first upgrade the original data is saved to personal-language-study-workspace:v1:pre-v2-backup. Unreadable data opens read-only and is never overwritten. Imports accept V1 and V2 backups.
- Rollback note: V10.34 cannot read V2 data and will overwrite it with empty data after any action. Export a JSON backup before rolling back.
- Updated release notes and maintenance docs in three languages, app version, and Service Worker cache; added V10.35 validation and E2E tests.
- GitHub automated tests no longer run the daily 90-minute stability test; they run functional tests with a 1-minute stability check on push to main or pull requests. Manual runs default to 10 minutes.

# V10.34 · Independent Language Learning Workspace — 2026-11-18

- Upgraded the existing Language entry into an independent learning workspace, replacing the planner content area while preserving the shared toolbar and module switching.
- Added Dashboard, Content, Practice, Mistakes, Learning Records, and Data Management.
- Supports English, Japanese, German, Russian, and Other; content types include vocabulary, grammar, reading, listening, questions, and other.
- Added create/edit/delete, search, language/type filters, answer reveal, mastered/mistake marking, and learning records. Deleting content preserves its learning history.
- Uses dedicated LocalStorage key personal-language-study-workspace:v1. It does not read legacy Language module data, access Supabase, or modify other modules.
- Added independent JSON import/export and Chinese/English/Japanese maintenance documentation. Imports are validated and confirmed, with a 5 MB limit.
- Added dedicated workspace JS/CSS and updated app version and Service Worker cache. TOEIC Study System is a design reference only; its code and data model are not reused.
- Known limits: self-review cards only; no automatic scoring, test sets, audio upload, spaced repetition, or cloud sync yet.

# V10.33 · Module Isolation and Memo Migration Stop — 2026-11-15

- Disabled automatic migration of one-star tasks into Memo during application startup. Data already in Memo remains untouched; nothing is deleted or moved back.
- Disabled automatic migration during login, single-module cloud synchronization, and whole-cloud synchronization. Whole-cloud downloads now restore each of the seven module partitions as-is.
- The Plan editor can move plans only to Work, Language, Organize, Results, and Future. Memo is no longer a selectable target, and the underlying move function rejects it as well.
- All other modules remain independent, with no cross-module move entry points. Global search, in-module management, backup, and synchronization remain available.
- No business data structure, LocalStorage key, JSON backup format, or Supabase database schema changes. Existing migration markers and source metadata are left intact.
- Updated all three changelogs, module-isolation validation, app version, and Service Worker cache.

# V10.32 · More Editing Space for Plan Notes — 2026-11-15

- Moved the optional Notes field between Plan Name and Plan Period, matching the workflow where the plan structure is stable and its internal content is updated over time.
- The note editor now starts at approximately 10 lines and has more vertical space. Longer forms can scroll within the dialog, and the textarea remains manually resizable.
- Preserved the existing note field, 500-character limit, save/load behavior, synchronization, and backup compatibility. No business data structure, LocalStorage key, or Supabase database schema changes.
- Updated Chinese, English, and Japanese changelogs, static acceptance checks, app version, and Service Worker cache.

# V10.31 · Plan Star Navigation Order Fix — 2026-11-12

- Plan star statistics now include all seven periods: Daily, Daily Random, Weekly, Weekly Random, Monthly, Monthly Random, and Yearly.
- Selecting a star searches periods strictly in that order. Within the first period containing a matching open task, it selects the first match according to the current sort order; it does not choose randomly.
- Search and category filters are cleared, the matching period and page are opened, and the target task is highlighted. A clear notice appears if no match is found.
- Star statistics and navigation in the other five modules remain unchanged. No business data, LocalStorage keys, JSON backup format, or Supabase database schema is changed.
- Updated Chinese, English, and Japanese changelogs, regression tests, app version, and Service Worker cache.

# V10.30 · Star Statistics for Five Modules — 2026-11-12

- Added independent one-to-five-star statistics to Work, Foreign Language Learning, Organize, Results, and Future. Each module shows task counts and each priority's share of that module's open tasks.
- Selecting a star clears the current search and category filters, adjusts pagination, and locates a matching open task within the same module. Statistics never mix records across modules.
- Statistics refresh after task creation, deletion, priority changes, completion, and archiving. The existing Plan statistics remain unchanged; completed, archived, and Trash records are excluded; Memo has no star statistics.
- Updated multilingual copy, static acceptance checks, app version, and Service Worker cache. No business data structure, LocalStorage key, JSON backup format, or Supabase database schema changed.

# V10.29 · Memo Module and Automatic One-Star Migration — 2026-11-12

- Added an independent Memo module with its own categories, local storage, pagination, search/filter/sort, archive, trash, JSON backup, PDF export, and Supabase sync.
- On first upgrade, all 1-star records in the six existing modules are moved automatically to Memo, including archived records. Titles, notes, reference URLs, priority, reminders, completion state, archive state, categories, and source module are preserved. Original Plan periods are retained as source metadata.
- Successfully moved records and their completion entries are removed from the source modules. 2–5-star records remain unchanged. Trash items are neither restored nor migrated. Local and cloud migration markers prevent repeated moves.
- Existing cloud JSON snapshots are migrated automatically after sign-in through the existing Supabase RPC. No SQL table or RPC schema changes are required. Full backup and seven-module sync now include Memo.
- Added migration regression tests and updated Chinese, English, Japanese copy and the Service Worker cache.

# V10.28 · Pagination Across All Modules — 2026-11-11

- Added consistent pagination to all six modules: Plan, Work, Foreign Language Learning, Organize, Results, and Future.
- Each page displays 10 records with Previous, Next, and numbered page controls. Up to five nearby page numbers are shown at a time.
- Each Plan period (Daily, Daily Random, Weekly, Weekly Random, Monthly, Monthly Random, Yearly) keeps its own page position. Other modules keep page positions independently by category.
- Search, category filtering, and sorting return the current view to page 1. Page numbers are automatically clamped when the result count decreases.
- Progress statistics, search, filtering, sorting, PDF export, and existing data storage remain unchanged. Pagination only changes which records are rendered in the list.

# V10.27 · Move Plans to Results and Future — 2026-11-10

- Added **Results** and **Future** as destinations in “Move to another module”; existing Work, Organize, and Foreign Language Learning destinations remain unchanged.
- Moving remains one-way from Plan to the other five modules. The source plan is removed, and the destination receives an incomplete item using that module’s own default category.
- Updated English and Japanese translations. No module data structure, LocalStorage key, JSON backup format, or cloud-sync rule changed.

# V10.26 · Clear Sync Status When Cancelled — 2026-11-09

- For single-module and six-module uploads/downloads, choosing **No** in the timestamp confirmation immediately clears the status text generated by that operation. No stale “reading/checking” or duplicate status remains.
- Choosing **Yes** preserves the existing sync flow, second cloud-snapshot check, and success/error messages.
- UI-only change; business data, LocalStorage keys, JSON backup format, Supabase RPCs, and database schema are unchanged.

# V10.25 · Cloud Sync Overwrite Protection — 2026-11-09

- Added pre-sync timestamp checks to single-module and six-module uploads/downloads. The confirmation prompt shows the latest local and cloud timestamps and which side is newer.
- Upload/download proceeds only after explicit confirmation. Cancelling leaves business data unchanged; missing timestamps are clearly reported as inconclusive.
- Re-fetches the cloud snapshot after confirmation. If cloud data changed while the prompt was open, the operation is cancelled and the user is asked to review the latest timestamps.
- Added a separate local sync metadata key, `personal-planner:sync-meta:v1`. Cloud metadata is stored in the snapshot's reserved `_syncMeta` field; `planner_get_data` returns the database update time and per-module timestamps.
- Preserves all six business storage keys, `schemaVersion: 1`, JSON backup formats, module partitions, and existing RPC parameters. The database update replaces only the existing `planner_get_data` function; no table schema changes.
- Updated Chinese, English, and Japanese text, the Service Worker cache, and V10.25 acceptance documentation.

## V10.24 · results_and_future_modules — 2026-11-09
- Added **Results** and **Future** after the original Plan, Work, Language Learning, and Organize modules. The six-module order is fixed.
- Both modules reuse the existing record-management features: quick add, edit, completion status, priority, search, filtering, sorting, category management, archive, trash, undo, PDF export, and independent JSON backup/restore.
- Results categories: Exam Results, Certifications, Learning Achievements, Other. Future categories: Short-term Goals, Mid-term Goals, Long-term Goals, Life Aspirations, Other. Categories remain user-manageable.
- Added independent local storage keys `personal-results:v1` and `personal-future:v1`. Existing four keys, `schemaVersion: 1`, existing module data, and backup formats remain unchanged.
- Added `results` and `future` Supabase partitions. Whole-cloud sync now covers six modules. Legacy four-module cloud snapshots remain downloadable; absent new partitions initialize as empty data without overwriting other modules.
- Global search now includes all six modules. Added Chinese, English, and Japanese UI text and coordinated module colors. Updated the Service Worker cache.
- No SQL migration is required. Validate local isolation, backup isolation, cloud partition compatibility, and responsive navigation before deployment.

## V10.23 · Dark Theme and Period Colors — 2026-11-05

- Distinguished Plan periods by color: Daily, Weekly, Monthly and Yearly use blue; Daily Random, Weekly Random and Monthly Random use orange. Period order, navigation behavior and business data remain unchanged.
- Added a global black/white theme switch. Dark theme is the default; the light theme preserves the existing appearance. Dark mode adjusts the main backgrounds, text, cards, dialogs, inputs, buttons, borders and module navigation.
- The theme switch is available in the shared top area across all four modules. The selection is stored separately under `personal-planner:theme:v1` and restored on the next visit.
- Updated Chinese, English and Japanese labels, the Service Worker cache and static acceptance checks.
- No changes to the four business storage keys, `schemaVersion`, plan data structure, JSON backup format or Supabase RPC/database schema.

## V10.22 · Global Search — 2026-11-05

- Upgraded search to a global search across Plan, Work, Foreign Language Learning and Organize, available from any module.
- Plan search order is Daily → Daily Random → Weekly → Weekly Random → Monthly → Monthly Random → Yearly, followed by Work, Foreign Language Learning and Organize.
- Searches item titles, notes and reference websites. Completed items are included; archived and Trash items are excluded. The current category filter does not restrict global search.
- On a match, switches to the target module and plan period, then scrolls to and briefly highlights the first match according to the current sort order. No result list or previous/next navigation is added.
- Search runs with Enter or the Search button. If no item matches, a message is shown and the current page position is retained. Updated Chinese, English and Japanese text and the Service Worker cache.
- No business LocalStorage keys, schemaVersion, JSON backup format, Supabase RPC or database schema changes.

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
