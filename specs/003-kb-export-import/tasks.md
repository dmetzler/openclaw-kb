# Tasks: Knowledge Base Export & Import

**Input**: Design documents from `/specs/003-kb-export-import/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/cli-api.md ✅, quickstart.md ✅

**Tests**: Tests ARE included — the plan explicitly defines test files and the spec references vitest as the test framework.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization — directory structure and shared utility module

- [X] T001 Create directory structure: `tests/unit/` and `tests/integration/` directories
- [X] T002 [P] Implement CSV serialization helper `csvEscapeField(value)` in `src/csv.mjs` — handles null/undefined → empty string, numbers → unquoted, strings → quoted if containing commas/quotes/newlines, objects → JSON.stringify then CSV-escape (RFC 4180)
- [X] T003 [P] Implement `csvStringify(headers, rows)` in `src/csv.mjs` — produces complete CSV string with header row, CRLF line endings, using `csvEscapeField` per field
- [X] T004 [P] Implement `csvParse(text)` in `src/csv.mjs` — state-machine parser handling quoted fields, embedded newlines, escaped double quotes; returns `{ headers, rows }`

**Checkpoint**: CSV module complete with serialize/parse/escape — foundation for CSV export/import

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: db.mjs API additions that MUST be complete before export or import scripts can be built

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Add `getAllEntities()` to `src/db.mjs` — `SELECT * FROM entities ORDER BY id ASC`, parse `metadata` from JSON string to object
- [X] T006 [P] Add `getAllRelations()` to `src/db.mjs` — `SELECT * FROM relations ORDER BY id ASC`, parse `metadata` from JSON string to object
- [X] T007 [P] Add `getAllDataSources()` to `src/db.mjs` — `SELECT * FROM data_sources ORDER BY id ASC`, parse `config` from JSON string to object
- [X] T008 [P] Add `getAllHealthMetrics()` to `src/db.mjs` — `SELECT * FROM health_metrics ORDER BY id ASC`, parse `metadata` from JSON string to object
- [X] T009 [P] Add `getAllActivities()` to `src/db.mjs` — `SELECT * FROM activities ORDER BY id ASC`, parse `metadata` from JSON string to object
- [X] T010 [P] Add `getAllGrades()` to `src/db.mjs` — `SELECT * FROM grades ORDER BY id ASC`, parse `metadata` from JSON string to object
- [X] T011 [P] Add `getAllMeals()` to `src/db.mjs` — `SELECT * FROM meals ORDER BY id ASC`, parse `items`/`nutrition`/`metadata` from JSON strings to objects
- [X] T012 [P] Add `getAllEmbeddings()` to `src/db.mjs` — `SELECT entity_id, embedding FROM vec_embeddings ORDER BY entity_id ASC`, convert Buffer to Float32Array
- [X] T013 [P] Add `getRecordCounts()` to `src/db.mjs` — returns `{ data_sources, entities, relations, health_metrics, activities, grades, meals, embeddings }` with `SELECT COUNT(*) FROM <table>` for each
- [X] T014 [P] Add `importEntity(row)` to `src/db.mjs` — `INSERT INTO entities (id, name, type, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`, serialize `metadata` object to JSON string
- [X] T015 [P] Add `importRelation(row)` to `src/db.mjs` — `INSERT INTO relations (id, source_id, target_id, type, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)`, serialize `metadata` object to JSON string
- [X] T016 [P] Add `importDataSource(row)` to `src/db.mjs` — `INSERT INTO data_sources (id, name, type, config, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, serialize `config` object to JSON string
- [X] T017 [P] Add `importHealthMetric(row)` to `src/db.mjs` — `INSERT INTO health_metrics (id, source_id, metric_type, value, unit, metadata, recorded_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, serialize `metadata` to JSON string
- [X] T018 [P] Add `importActivity(row)` to `src/db.mjs` — `INSERT INTO activities (id, source_id, activity_type, duration_minutes, intensity, metadata, recorded_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, serialize `metadata` to JSON string
- [X] T019 [P] Add `importGrade(row)` to `src/db.mjs` — `INSERT INTO grades (id, source_id, subject, score, scale, metadata, recorded_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, serialize `metadata` to JSON string
- [X] T020 [P] Add `importMeal(row)` to `src/db.mjs` — `INSERT INTO meals (id, source_id, meal_type, items, nutrition, metadata, recorded_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, serialize `items`/`nutrition`/`metadata` to JSON strings

**Checkpoint**: All db.mjs getAll*/import* functions available — export and import scripts can now be built

---

## Phase 3: User Story 1 — Export the Entire Knowledge Base to Flat Files (Priority: P1) 🎯 MVP

**Goal**: An operator can run `node src/kb-export.mjs <dir>` and get a complete, deterministic, Git-diff-friendly flat-file snapshot of the entire SQLite knowledge base.

**Independent Test**: Populate a test database with known data across all tables, run export, verify each output file contains expected records in the correct format (JSONL/CSV) with deterministic ordering.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T021 [P] [US1] Unit tests for CSV helpers in `tests/unit/csv.test.mjs` — test `csvEscapeField` with null, numbers, strings with commas/quotes/newlines, JSON objects; test `csvStringify` end-to-end with header + rows; test `csvParse` with simple and complex CSV including embedded newlines and escaped quotes
- [X] T022 [P] [US1] Unit tests for JSONL/metadata serialization in `tests/unit/export-import.test.mjs` — test JSONL line generation for entities/relations/data_sources/embeddings, test metadata.json structure (schema_version, exported_at, record_counts), test JSON metadata field deserialization (string → object)
- [X] T023 [P] [US1] Integration test for full export in `tests/integration/export.test.mjs` — create temp database with known seed data across all 8 tables, run export, verify: all 9 files created, JSONL files have correct JSON per line, CSV files have header + correct rows, metadata.json has correct counts and schema version, embeddings have correct float precision, empty-table export produces correct empty files

### Implementation for User Story 1

- [X] T024 [US1] Implement CLI argument parsing in `src/kb-export.mjs` — parse `<output-directory>` (required) and `--db <path>` (default: `jarvis.db`), exit code 1 if no directory, exit code 2 if database not found, print usage on error
- [X] T025 [US1] Implement JSONL export helpers in `src/kb-export.mjs` — function to serialize one row to a JSONL line (JSON.stringify with keys in schema column order), function to write all rows to a `.jsonl` file (one line per row, no trailing newline). Handle metadata/config fields: parse from JSON string to object for nested output (FR-022)
- [X] T026 [US1] Implement CSV export helper in `src/kb-export.mjs` — function that takes table rows and column definitions, calls `csvStringify` from `csv.mjs`, writes result to `.csv` file. Handle JSON fields (metadata, items, nutrition): serialize objects to JSON strings for CSV field values (FR-023)
- [X] T027 [US1] Implement embedding export in `src/kb-export.mjs` — call `getAllEmbeddings()`, convert each Float32Array to regular array via `Array.from()`, write JSONL with `{ entity_id, embedding }` per line
- [X] T028 [US1] Implement metadata.json generation in `src/kb-export.mjs` — call `getSchemaVersion()` and `getRecordCounts()`, write pretty-printed JSON (2-space indent) with keys in fixed order: `schema_version`, `exported_at` (ISO 8601), `record_counts` (alphabetical keys)
- [X] T029 [US1] Implement main export orchestration in `src/kb-export.mjs` — open database, create output directory (recursive), export tables in order (data_sources → entities → relations → health_metrics → activities → grades → meals → embeddings → metadata.json), print progress per table (`  <table>: N records`), print summary, close database, exit 0
- [X] T030 [US1] Verify export integration test passes in `tests/integration/export.test.mjs`

**Checkpoint**: Export script fully functional — operator can snapshot the entire KB to flat files

---

## Phase 4: User Story 2 — Import a Flat Export into a Fresh Database (Priority: P1)

**Goal**: An operator can run `node src/kb-import.mjs <dir>` and restore a complete, fully-indexed database from a previously exported directory.

**Independent Test**: Export a known database, import into fresh DB, query all tables to verify data matches, test FTS5 search returns results, test KNN vector search returns results.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T031 [P] [US2] Integration test for full import in `tests/integration/import.test.mjs` — export seed database, import into fresh temp DB, verify: all tables have correct row counts, entity/relation data matches, data lake records match, embeddings queryable via KNN, FTS5 search returns results, schema_migrations reflects correct version. Also test error cases: missing files (exit 3), existing target DB (exit 4), schema version mismatch (exit 5), malformed JSONL (exit 6)

### Implementation for User Story 2

- [X] T032 [US2] Implement CLI argument parsing in `src/kb-import.mjs` — parse `<export-directory>` (required) and `--db <path>` (default: `jarvis.db`), exit code 1 if no directory argument
- [X] T033 [US2] Implement pre-import validation in `src/kb-import.mjs` — verify export directory exists (exit 2), verify all 9 required files present (exit 3), verify target DB does not exist (exit 4), parse and validate metadata.json, check schema version compatibility: export version ≤ current version (exit 5)
- [X] T034 [US2] Implement JSONL import helpers in `src/kb-import.mjs` — read file line-by-line, parse each line as JSON, call the appropriate `import*()` function from db.mjs, report file:line on parse error. Handle metadata/config fields: they arrive as objects from JSONL, pass directly to import functions which serialize to JSON strings
- [X] T035 [US2] Implement CSV import helpers in `src/kb-import.mjs` — read file content, call `csvParse()` from `csv.mjs`, map headers to column names, parse JSON fields (metadata, items, nutrition) from CSV strings back to objects, call the appropriate `import*()` function from db.mjs for each row
- [X] T036 [US2] Implement embedding import in `src/kb-import.mjs` — read `embeddings.jsonl` line-by-line, parse JSON array to `new Float32Array(array)`, call `upsertEmbedding(entityId, float32Array)` from db.mjs
- [X] T037 [US2] Implement main import orchestration in `src/kb-import.mjs` — run validation, create fresh DB via `initDatabase(dbPath)`, wrap all inserts in single transaction (dependency order: data_sources → entities → relations → health_metrics → activities → grades → meals → embeddings), on failure: rollback, close DB, delete DB file, print error to stderr, exit with appropriate code. On success: print progress per table, print summary, close DB, exit 0
- [X] T038 [US2] Verify import integration test passes in `tests/integration/import.test.mjs`

**Checkpoint**: Import script fully functional — operator can restore a complete KB from flat files

---

## Phase 5: User Story 3 — Round-Trip Integrity Verification (Priority: P2)

**Goal**: Prove zero data loss by demonstrating that export → import → re-export produces byte-identical output files.

**Independent Test**: Run the full export → import → export cycle on a populated database and diff the two export directories file-by-file.

### Tests for User Story 3

- [X] T039 [US3] Integration test for round-trip in `tests/integration/round-trip.test.mjs` — seed database with complex data (entities with nested metadata arrays/objects/special characters, relations, all data lake tables, embeddings), export to dir A, import dir A into fresh DB, export to dir B, assert every file in dir A is byte-identical to corresponding file in dir B. Test edge cases: empty tables, metadata with special chars, float precision in embeddings

### Implementation for User Story 3

- [X] T040 [US3] Fix any round-trip issues discovered by `tests/integration/round-trip.test.mjs` — this task exists to address any serialization inconsistencies (key ordering, whitespace, float precision, JSON field ordering) that prevent byte-identical round-trip output. If the round-trip test passes immediately with no fixes, mark this task as complete with a note.

**Checkpoint**: Round-trip identity proven — export and import are demonstrably lossless

---

## Phase 6: User Story 4 — Version-Control the Export Directory (Priority: P3)

**Goal**: Exported files produce meaningful, line-level Git diffs when the knowledge base changes between exports.

**Independent Test**: Export, modify database, re-export, verify `git diff` shows only the changed/added/removed records as individual line changes.

### Implementation for User Story 4

- [X] T041 [US4] Verify Git-diff friendliness — this is a design validation task, not a code task. The deterministic ordering (by PK ASC) and one-record-per-line format from US1 should already produce clean diffs. Manually test or write a script: export, modify one entity, re-export, confirm `git diff` shows exactly one changed line in `entities.jsonl`. If the output is not diff-friendly, fix ordering or formatting in `src/kb-export.mjs`.

**Checkpoint**: Exported files are Git-diff-friendly with line-level change visibility

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass across all stories

- [X] T042 [P] Add JSDoc documentation to all exported functions in `src/csv.mjs`, `src/kb-export.mjs`, `src/kb-import.mjs`, and new functions in `src/db.mjs`
- [X] T043 [P] Verify all tests pass: `npx vitest run`
- [X] T044 Run quickstart.md validation — execute the commands from `specs/003-kb-export-import/quickstart.md` (export, import, round-trip diff) against a real populated database and verify expected behavior

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup for csv.mjs (T002–T004) — BLOCKS all user stories
- **US1 Export (Phase 3)**: Depends on Foundational (Phase 2) — needs all `getAll*()` and `getRecordCounts()` functions
- **US2 Import (Phase 4)**: Depends on Foundational (Phase 2) — needs all `import*()` functions. Also depends on US1 for test data (export needed to test import)
- **US3 Round-Trip (Phase 5)**: Depends on US1 + US2 being complete
- **US4 Git Diff (Phase 6)**: Depends on US1 being complete
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — integration test needs export capability from US1, but implementation is independent
- **User Story 3 (P2)**: Requires both US1 and US2 complete
- **User Story 4 (P3)**: Requires US1 complete — validation only, no code changes expected

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Helper functions before orchestration
- CLI parsing before main logic
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T003, T004 (csv.mjs functions) can run in parallel within Phase 1
- All T005–T020 (db.mjs additions) can run in parallel within Phase 2
- T021, T022, T023 (US1 tests) can run in parallel
- T005–T013 (getAll* functions) can run in parallel with T014–T020 (import* functions)
- US1 implementation and US2 test-writing can overlap once Phase 2 is done
- US4 validation can run in parallel with US3 round-trip testing

---

## Parallel Example: Phase 2 (Foundational)

```bash
# All db.mjs additions are independent — different functions, same file but no conflicts:
Task: "Add getAllEntities() to src/db.mjs"
Task: "Add getAllRelations() to src/db.mjs"
Task: "Add getAllDataSources() to src/db.mjs"
Task: "Add getAllHealthMetrics() to src/db.mjs"
Task: "Add getAllActivities() to src/db.mjs"
Task: "Add getAllGrades() to src/db.mjs"
Task: "Add getAllMeals() to src/db.mjs"
Task: "Add getAllEmbeddings() to src/db.mjs"
Task: "Add getRecordCounts() to src/db.mjs"
# (In practice, these will be added sequentially to the same file, but the design work is parallel)
```

## Parallel Example: User Story 1 Tests

```bash
# All US1 tests are in different files:
Task: "Unit tests for CSV helpers in tests/unit/csv.test.mjs"
Task: "Unit tests for JSONL/metadata serialization in tests/unit/export-import.test.mjs"
Task: "Integration test for full export in tests/integration/export.test.mjs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (csv.mjs)
2. Complete Phase 2: Foundational (db.mjs getAll* functions only — skip import* for MVP)
3. Complete Phase 3: User Story 1 (export)
4. **STOP and VALIDATE**: Run export on a real database, inspect output files
5. Export is usable on its own for backups and inspection

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Export) → Test independently → Usable for backups (MVP!)
3. Add User Story 2 (Import) → Test independently → Full portability cycle
4. Add User Story 3 (Round-Trip) → Proves correctness → Confidence for production use
5. Add User Story 4 (Git Diff) → Validates design → Knowledge evolution tracking
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No new npm dependencies — csv.mjs is hand-rolled per research decision R1
- All db.mjs functions follow existing patterns in the file
- JSON metadata fields: parsed to objects on export (FR-022), serialized back to strings on import
