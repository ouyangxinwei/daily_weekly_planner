# V10.22 Global Search — Acceptance Checklist

## Search order
- [ ] Plan: daily → daily_random → weekly → weekly_random → monthly → monthly_random → yearly.
- [ ] If no Plan item matches, search Work → Foreign Language Learning → Organize.
- [ ] Stop at the first matching item; do not show a result list or next/previous controls.

## Matching rules
- [ ] Search title, note and reference URL, case-insensitively.
- [ ] Include completed items.
- [ ] Exclude archived items and Trash.
- [ ] Ignore the currently selected category filter.
- [ ] Within a period/module, respect the current sort order and stable original order for ties.
- [ ] Expired random-cycle items are not searchable.

## Navigation and UI
- [ ] Enter and the Search button both execute global search.
- [ ] Switch to the matched module and, for Plan, the matched period.
- [ ] Keep the keyword visible, clear the category filter, scroll to the first match and briefly highlight it.
- [ ] No match: show a localized message and keep the current module, period and scroll position.
- [ ] Chinese, English and Japanese labels are correct.
- [ ] Mobile layout keeps the search input and button usable without horizontal overflow.

## Regression protection
- [ ] Existing CRUD, completion, sorting, category filtering, archive, Trash and Plan-to-module move remain functional.
- [ ] No business LocalStorage keys, schemaVersion, JSON backup format, Supabase RPC or database schema changes.
- [ ] Service Worker cache version is updated.
