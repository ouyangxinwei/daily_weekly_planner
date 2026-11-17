# Language Learning Workspace V1.0.0

An independent language-learning workspace inside Daily Weekly Planner. It borrows interaction ideas from TOEIC Study System without reusing its source code, database, or data model.

- Create, edit, and delete learning content; deleting content preserves existing learning records.

## Navigation
Select the existing Language module to enter. Sections: Dashboard, Content, Practice, Mistakes, Learning Records, and Data Management. Selecting another module returns to its original interface.

## Included
- Create and edit content in English, Japanese, German, Russian, or Other.
- Types: Vocabulary, Grammar, Reading, Listening, Questions, and Other.
- Search and filter by language/type.
- Random practice from items not marked mastered; reveal/hide answer and notes.
- Mark mastered or needing review; each action creates a learning record.
- Dedicated mistake list and JSON export/import with validation and confirmation.
- Separate LocalStorage key; no access to legacy language data or Supabase.

## Data and safety
The key personal-language-study-workspace:v1 stores schemaVersion, items, records, and settings. Existing module keys, backups, and Supabase partitions are unchanged. Legacy personal-language:v1 data is not deleted. V1 data stays in the current browser; use JSON backup to move devices. Import limit: 5 MB.

## Limitations
This is flashcard/self-review, not a full mock-exam engine. Automatic scoring, test sets, audio upload, spaced repetition, and cloud sync are not included. Workspace copy is primarily Chinese.

## Manual acceptance
1. Enter Language and verify planner content is replaced.
2. Add English vocabulary and Japanese grammar; refresh and verify persistence.
3. Search/filter content.
4. Reveal answers and mark mastered / needing review.
5. Verify Mistakes and Learning Records.
6. Edit an item; verify status/history remain.
7. Export and re-import JSON.
8. Switch modules and back; verify isolation.
9. Check mobile layout.
