# Tasks: Generic Data Records Table

**Input**: Design documents from `/specs/004-generic-data-records/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/db-api.md, quickstart.md

**Tests**: Tests are included because the spec (FR-014) explicitly requires updating all affected test files (9 test files).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root

---

## Phase 1: Setup

**Purpose**: Schema changes and migration file creation

- [ ] T001 Update `src/schema.sql` to remove 4 legacy table definitions (`health_metrics`, `activities`, `grades`, `meals`), remove 12 legacy FTS5 triggers, add `data_records` table with columns (`id`, `source_id`, `record_type`, `data`, `recorded_at`, `created_at`), add composite index `idx_data_records_type_time ON data_records(record_type, recorded_at)`, and add 3 FTS5 triggers (`data_records_search_index_insert`, `data_records_search_index_update`, `data_records_search_index_delete`)
- [ ] T002 Create migration file `src/migrations/001-generic-data-records.sql` that creates `data_records` table, migrates data from 4 legacy tables using `INSERT INTO ... SELECT` with `json_object()` (omitting `id` column to let AUTOINCREMENT assign new IDs), drops 4 legacy tables, drops 12 legacy FTS5 triggers, and creates 3 new FTS5 triggers on `data_records`

**Checkpoint**: Schema and migration ready. All subsequent phases depend on this.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core generic API functions in `db.mjs` that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Implement `insertRecord(recordType, data)` in `src/db.mjs` per contract: validate `recordType` non-empty, validate `data.source_id` exists in `data_sources`, validate `data.recorded_at` present, extract `source_id` and `recorded_at` to top-level columns, store full `data` as JSON, return inserted row with `data` parsed to object
- [ ] T004 Implement `queryRecords(recordType, filters)` in `src/db.mjs` per contract: support `source_id`, `from`, `to`, `limit` (default 100), `offset` (default 0), `jsonFilters` via `json_extract()`, order by `recorded_at DESC`, return array with `data` parsed from JSON
- [ ] T005 [P] Implement `getAllDataRecords()` in `src/db.mjs`: return all records ordered by `id ASC` with `data` parsed to object (used by export)
- [ ] T006 [P] Implement `importDataRecord(row)` in `src/db.mjs`: insert record with explicit `id` and timestamps, bypass validation (used during import)
- [ ] T007 Update `getRecordCounts()` in `src/db.mjs` to query `data_records` grouped by `record_type`, return `{ data_records: { health_metric: N, ... }, data_sources: N, entities: N, relations: N, embeddings: N }`, remove 4 legacy hardcoded keys
- [ ] T008 Remove 16 legacy functions from `src/db.mjs`: `insertHealthMetric`, `queryHealthMetrics`, `insertActivity`, `queryActivities`, `insertGrade`, `queryGrades`, `insertMeal`, `queryMeals`, `getAllHealthMetrics`, `getAllActivities`, `getAllGrades`, `getAllMeals`, `importHealthMetric`, `importActivity`, `importGrade`, `importMeal`
- [ ] T009 Update exports in `src/db.mjs` to export `insertRecord`, `queryRecords`, `getAllDataRecords`, `importDataRecord` and remove exports of the 16 legacy functions

**Checkpoint**: Foundation ready. Generic API functions available; legacy functions removed.

---

## Phase 3: User Story 1 - Store and retrieve any record type through a single generic API (Priority: P1) MVP

**Goal**: An AI agent can store any `record_type` without code changes, and query records with flexible filtering (source, date range, pagination, JSON field filters).

**Independent Test**: Insert records of various types (including novel types like "finance", "sleep"), query them back with different filter combinations. All 6 acceptance scenarios from spec pass.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add unit tests for `insertRecord` in `tests/unit/db.test.mjs`: test valid insertion returns correct shape, test empty `recordType` throws, test missing `source_id` throws, test non-existent `source_id` throws, test missing `recorded_at` throws, test novel record types ("finance", "sleep") succeed
- [ ] T011 [P] [US1] Add unit tests for `queryRecords` in `tests/unit/db.test.mjs`: test filtering by `record_type`, `source_id`, date range (`from`/`to`), `limit`/`offset` pagination, `jsonFilters` with top-level key matching, test empty result returns `[]` not error, test `recorded_at DESC` ordering
- [ ] T012 [P] [US1] Update `tests/integration/data-lake.test.mjs` to use `insertRecord`/`queryRecords` instead of legacy functions: replace all `insertHealthMetric`/`queryHealthMetrics`/etc calls with generic API calls
- [ ] T013 [US1] Update `tests/integration/benchmark.test.mjs` to benchmark `insertRecord` (< 5ms single insert) and `queryRecords` (< 10ms for 1000-row table with index hit) using generic API

**Checkpoint**: User Story 1 fully functional and tested. Novel record types can be stored and queried without code changes.

---

## Phase 4: User Story 2 - Migrate existing data from legacy tables without data loss (Priority: P2)

**Goal**: SQL migration moves all existing records from 4 legacy tables into `data_records`, preserving all data fields. Legacy tables dropped after migration.

**Independent Test**: Populate 4 legacy tables with known data, run migration SQL, verify every record exists in `data_records` with correct `record_type` and all original fields in `data` JSON. Legacy tables no longer exist.

### Tests for User Story 2

- [ ] T014 [P] [US2] Add migration tests in `tests/unit/migrations.test.mjs`: set up legacy tables with known data, run `001-generic-data-records.sql`, verify row counts per `record_type` match legacy counts, verify `data` JSON contains all original fields (e.g. `metric_type`, `value`, `unit`, `metadata` for `health_metric`), verify legacy tables no longer exist, test migration on empty legacy tables succeeds
- [ ] T015 [P] [US2] Update `tests/integration/schema-init.test.mjs` to verify fresh database has `data_records` table and no legacy tables (`health_metrics`, `activities`, `grades`, `meals`)

**Checkpoint**: Migration tested. Existing data preserved, legacy tables removed.

---

## Phase 5: User Story 3 - Full-text search across all record types via FTS5 (Priority: P3)

**Goal**: Data records are indexed in FTS5 search with `record_type` as name and `data` as searchable content. Insert/update/delete triggers keep index in sync.

**Independent Test**: Insert data records, perform FTS5 searches, verify records appear in results with `source_table = 'data_records'`. Update and delete records, verify index reflects changes.

### Tests for User Story 3

- [ ] T016 [US3] Update `tests/integration/search.test.mjs` to verify FTS5 indexes `data_records`: insert a record with searchable `data` content, search for that content, verify result has `source_table = 'data_records'` and correct `source_id`, test update triggers update index, test delete triggers remove from index

**Checkpoint**: FTS5 search works for all data record types.

---

## Phase 6: User Story 4 - Export and import all records as a single JSONL file (Priority: P4)

**Goal**: Export writes `data_records.jsonl` (one JSON line per record). Import reads `data_records.jsonl`. Round-trip preserves all data. Legacy CSV files no longer expected.

**Independent Test**: Insert records of multiple types, export to backup dir, clear database, import from backup, verify all records match originals (counts and content).

### Implementation for User Story 4

- [ ] T017 [US4] Update `src/kb-export.mjs` to replace 4 CSV export calls (`health_metrics.csv`, `activities.csv`, `grades.csv`, `meals.csv`) with single JSONL export: call `getAllDataRecords()`, write to `data_records.jsonl` using existing JSONL writing pattern, remove legacy CSV export code for 4 tables
- [ ] T018 [US4] Update `src/kb-import.mjs` to replace 4 CSV import calls with single JSONL import: update `REQUIRED_FILES` array from 9 files to 6 files (replace 4 CSV entries with `data_records.jsonl`), read `data_records.jsonl`, call `importDataRecord(row)` for each line, remove legacy CSV import code for 4 tables

### Tests for User Story 4

- [ ] T019 [P] [US4] Update `tests/unit/export-import.test.mjs` to test JSONL export/import for data records instead of CSV: verify `getAllDataRecords` output is written as JSONL, verify `importDataRecord` is called for each JSONL line
- [ ] T020 [P] [US4] Update `tests/integration/export.test.mjs` to verify `data_records.jsonl` output: insert records of multiple types, export, verify JSONL file contains correct records with all fields
- [ ] T021 [P] [US4] Update `tests/integration/import.test.mjs` to verify JSONL import: verify `REQUIRED_FILES` no longer includes legacy CSV names, verify import of `data_records.jsonl` restores all records correctly
- [ ] T022 [US4] Update `tests/integration/round-trip.test.mjs` to verify JSONL round-trip: export records, import into fresh database, compare record counts and content before/after

**Checkpoint**: Export/import fully functional with JSONL. Round-trip preserves 100% of data.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and edge case coverage

- [ ] T023 [P] Update `tests/integration/quickstart-validation.test.mjs` if it references any legacy functions — replace with generic API calls
- [ ] T024 [P] Verify `tests/integration/knowledge-graph.test.mjs` still passes unchanged (entities/relations only, no data record references)
- [ ] T025 [P] Verify `tests/unit/csv.test.mjs` still passes unchanged (csv module not modified)
- [ ] T026 Run full test suite (`vitest run`) and verify 0 regressions — all tests pass
- [ ] T027 Verify no remaining references to the 16 legacy function names or 4 legacy table names in `src/` (excluding migration file and comments)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (schema must be finalized before implementing DB functions)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (generic API must exist)
- **User Story 2 (Phase 4)**: Depends on Phase 1 (migration file created in T002) — can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Phase 1 (FTS5 triggers defined in schema) and Phase 2 (needs `insertRecord` to create records for testing)
- **User Story 4 (Phase 6)**: Depends on Phase 2 (needs `getAllDataRecords`/`importDataRecord`)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Start after Foundational (Phase 2) — no cross-story dependencies
- **US2 (P2)**: Start after Setup (Phase 1) — tests use migration SQL directly, independent of US1
- **US3 (P3)**: Start after Foundational (Phase 2) — needs `insertRecord` for test setup
- **US4 (P4)**: Start after Foundational (Phase 2) — needs export/import functions

### Within Each User Story

- Tests can be written alongside implementation (spec requires test updates, not TDD)
- Core function implementation before integration tests
- Story complete before Polish phase

### Parallel Opportunities

- T005 and T006 can run in parallel (different functions, no dependencies)
- T010, T011, T012, T013 (US1 tests) — T010, T011, T012 can run in parallel
- T014, T015 (US2 tests) can run in parallel
- T019, T020, T021 (US4 tests) can run in parallel
- T023, T024, T025 (Polish) can all run in parallel
- US2 and US1 can potentially run in parallel (US2 tests migration SQL directly)

---

## Parallel Example: Phase 2 (Foundational)

```
# Sequential: T003 and T004 first (core insert/query, may share validation patterns)
# Then parallel:
Task: "Implement getAllDataRecords() in src/db.mjs"          # T005
Task: "Implement importDataRecord(row) in src/db.mjs"       # T006
# Then sequential: T007 (getRecordCounts), T008 (remove legacy), T009 (update exports)
```

## Parallel Example: User Story 4

```
# Implementation sequential (same files):
Task: "Update src/kb-export.mjs for JSONL"     # T017
Task: "Update src/kb-import.mjs for JSONL"     # T018

# Tests in parallel (different files):
Task: "Update tests/unit/export-import.test.mjs"           # T019
Task: "Update tests/integration/export.test.mjs"           # T020
Task: "Update tests/integration/import.test.mjs"           # T021
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schema + migration file)
2. Complete Phase 2: Foundational (generic API in db.mjs)
3. Complete Phase 3: User Story 1 (insert/query any record type + tests)
4. **STOP and VALIDATE**: Run `vitest run` — verify novel record types work
5. This alone delivers the core extensibility value

### Incremental Delivery

1. Setup + Foundational -> Foundation ready
2. Add User Story 1 -> Test independently -> Core extensibility works (MVP!)
3. Add User Story 2 -> Test independently -> Legacy data preserved
4. Add User Story 3 -> Test independently -> FTS5 search works across all types
5. Add User Story 4 -> Test independently -> Export/import works with JSONL
6. Polish -> Full test suite green, no legacy references remain

### Single Developer Strategy

Execute phases sequentially in priority order:
1. Phase 1 (Setup) + Phase 2 (Foundational) — ~core changes
2. Phase 3 (US1) — validate MVP
3. Phase 4 (US2) — migration correctness
4. Phase 5 (US3) — FTS5 integration
5. Phase 6 (US4) — export/import
6. Phase 7 (Polish) — final sweep

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each phase completion
- The migration file (T002) handles both data migration AND trigger replacement
- `csv.mjs` is intentionally left unchanged (removal is out of scope per spec assumptions)
- All tests use in-memory SQLite (`:memory:`); migration tests must set up legacy tables explicitly
