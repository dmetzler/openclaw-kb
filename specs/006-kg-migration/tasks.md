# Tasks: KG Migration Tool

**Input**: Design documents from `/specs/006-kg-migration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/cli-contract.md

**Tests**: Integration tests ARE included — the plan explicitly specifies `tests/integration/kg-migrate.test.mjs` and the constitution mandates testing standards.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify existing project structure and reference files are in place

- [X] T001 Verify `src/db.mjs` exports required functions (`initDatabase`, `createEntity`, `createRelation`, `getAllEntities`, `runTransaction`) and review their signatures
- [X] T002 [P] Review `src/kb-import.mjs` for CLI conventions (argv parsing, `isMainModule` guard, exit codes, stdout/stderr usage)
- [X] T003 [P] Review `src/schema.sql` to confirm `entities` and `relations` table schemas match data-model.md expectations (UNIQUE constraint, CHECK constraint on self-referential relations)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the migration script skeleton with CLI interface and programmatic API — MUST be complete before any user story work begins

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create `src/kg-migrate.mjs` with ES module structure: imports (`fs`, `path`, `url`, `process`, `db.mjs`), `isMainModule` guard, `migrateKnowledgeGraph(filePath, dbPath, options)` export, and CLI argv parsing matching `kb-import.mjs` conventions
- [X] T005 Implement CLI argument parsing in `src/kg-migrate.mjs`: positional `FILE` argument (default `kg-store.json`), `--dry-run` flag, `--db <path>` option (default `jarvis.db`), exit code 1 on invalid args
- [X] T006 Implement JSON file loading in `src/kg-migrate.mjs`: read file with `fs.readFileSync`, parse JSON, exit code 2 on file not found, exit code 3 on parse error, error messages to stderr per cli-contract.md
- [X] T007 Implement `buildMetadata(legacyEntity)` helper in `src/kg-migrate.mjs` per data-model.md algorithm: pack `category`, `tags`, `parent`, `confidence`, `wikiPage` into metadata object, merge `attrs` at top level (FR-005), skip absent/null/empty fields (FR-006)
- [X] T008 Implement stats tracking object in `src/kg-migrate.mjs`: `{ entities: { migrated: 0, skipped: 0, errors: 0 }, relations: { migrated: 0, skipped: 0, errors: 0 } }` and summary report printer to stdout per cli-contract.md format
- [X] T009 Create `tests/integration/kg-migrate.test.mjs` test scaffold with vitest, `:memory:` SQLite database setup/teardown using `initDatabase()`, and helper to create sample `kg-store.json` temp files

**Checkpoint**: Script skeleton exists with CLI interface, file loading, metadata builder, and test scaffold ready

---

## Phase 3: User Story 1 — Migrate All Entities (Priority: P1) MVP

**Goal**: Read `kg-store.json` entities object, map fields (label→name, type→type, remaining→metadata), create each entity via `createEntity()`, build legacy-string-ID→SQLite-integer-ID mapping

**Independent Test**: Create a `kg-store.json` with sample entities, run migration, verify each entity exists in SQLite with correct `name`, `type`, and `metadata` fields

### Tests for User Story 1

- [X] T010 [P] [US1] Write test in `tests/integration/kg-migrate.test.mjs`: migrate 5 entities of various types, verify all 5 exist in SQLite with correct name and type
- [X] T011 [P] [US1] Write test in `tests/integration/kg-migrate.test.mjs`: migrate entity with all optional fields (category, tags, parent, confidence, wikiPage, attrs with role), verify metadata contains all fields with attrs.role merged at top level
- [X] T012 [P] [US1] Write test in `tests/integration/kg-migrate.test.mjs`: migrate entity with empty attrs and no optional fields, verify metadata omits absent fields
- [X] T013 [P] [US1] Write test in `tests/integration/kg-migrate.test.mjs`: migrate entity with `type: "credential"`, verify type is preserved as-is

### Implementation for User Story 1

- [X] T014 [US1] Implement `migrateEntities(kgData, db, options)` function in `src/kg-migrate.mjs`: iterate `Object.entries(kgData.entities)`, validate `label` and `type` exist (skip+error if missing), build metadata via `buildMetadata()`, call `createEntity(name, type, metadata)`, populate `idMap` with legacy-string-ID→new-SQLite-integer-ID
- [X] T015 [US1] Implement existing-entity pre-loading in `src/kg-migrate.mjs`: call `getAllEntities()` before migration, build `Set<string>` keyed by `"${name}\0${type}"` for O(1) duplicate detection per research.md R1
- [X] T016 [US1] Wire entity migration into `migrateKnowledgeGraph()` in `src/kg-migrate.mjs`: call `initDatabase()`, handle missing `entities` key (treat as empty object), call `migrateEntities()`, return stats
- [X] T017 [US1] Handle edge cases in entity migration in `src/kg-migrate.mjs`: skip entities with missing/empty `label` (log warning to stderr, increment errors), skip entities with missing/empty `type` (log warning to stderr, increment errors), treat `attrs: null` as empty object

**Checkpoint**: Entity migration works end-to-end. Running `node src/kg-migrate.mjs kg-store.json` imports all valid entities. Tests pass.

---

## Phase 4: User Story 2 — Migrate All Relations (Priority: P2)

**Goal**: After entity migration, read relations array, resolve `from`/`to` string IDs to SQLite integer IDs via the ID mapping, create each relation via `createRelation()`

**Independent Test**: Migrate entities first, then verify relations are created with correct source_id, target_id, type, and metadata

### Tests for User Story 2

- [X] T018 [P] [US2] Write test in `tests/integration/kg-migrate.test.mjs`: migrate entities "alice" and "bob" with relation `{ from: "alice", to: "bob", rel: "knows", attrs: {} }`, verify relation exists with correct source_id, target_id, and type
- [X] T019 [P] [US2] Write test in `tests/integration/kg-migrate.test.mjs`: migrate relation with `attrs: { since: "2024" }`, verify metadata contains `{ since: "2024" }`
- [X] T020 [P] [US2] Write test in `tests/integration/kg-migrate.test.mjs`: relation referencing non-existent entity ID is skipped, logged as error, migration continues
- [X] T021 [P] [US2] Write test in `tests/integration/kg-migrate.test.mjs`: self-referential relation (`from === to`) is skipped and counted as error

### Implementation for User Story 2

- [X] T022 [US2] Implement `migrateRelations(kgData, idMap, db, options)` function in `src/kg-migrate.mjs`: iterate relations array, resolve `from`→`source_id` and `to`→`target_id` via idMap, map `rel`→`type`, map `attrs`→`metadata` (null→{}), call `createRelation(source_id, target_id, type, metadata)`
- [X] T023 [US2] Implement relation error handling in `src/kg-migrate.mjs`: skip relations with unresolvable `from`/`to` (log warning with entity ID, increment errors), catch `createRelation()` duplicate errors (increment skipped), catch self-referential errors (increment errors), handle missing `relations` key (treat as empty array)
- [X] T024 [US2] Wire relation migration into `migrateKnowledgeGraph()` in `src/kg-migrate.mjs`: call `migrateRelations()` after `migrateEntities()`, wrap both in `runTransaction()` for atomicity per research.md R3

**Checkpoint**: Full entity+relation migration works. Relations correctly reference SQLite integer IDs. Tests pass.

---

## Phase 5: User Story 3 — Dry-Run Mode (Priority: P3)

**Goal**: When `--dry-run` is passed, run full parsing and validation logic but skip all database writes. Report what *would* happen.

**Independent Test**: Run with `--dry-run`, verify database is unchanged, verify console output shows expected counts

### Tests for User Story 3

- [X] T025 [P] [US3] Write test in `tests/integration/kg-migrate.test.mjs`: dry-run with 10 entities and 5 relations, verify output shows "would be migrated" counts and database has no new rows
- [X] T026 [P] [US3] Write test in `tests/integration/kg-migrate.test.mjs`: dry-run with existing duplicate entity, verify output reports "would be skipped"
- [X] T027 [P] [US3] Write test in `tests/integration/kg-migrate.test.mjs`: dry-run with relation referencing missing entity, verify output reports "would fail"

### Implementation for User Story 3

- [X] T028 [US3] Implement dry-run mode in `src/kg-migrate.mjs`: when `options.dryRun` is true, skip `createEntity()`/`createRelation()` calls, assign optimistic sequential fake IDs to idMap for relation validation per research.md R4
- [X] T029 [US3] Implement dry-run output format in `src/kg-migrate.mjs`: use "would be migrated"/"would be skipped" wording per cli-contract.md dry-run output format, print "Dry run complete. No changes written." footer

**Checkpoint**: Dry-run produces identical counts to real migration but leaves database unchanged. Tests pass.

---

## Phase 6: User Story 4 — Idempotent Re-Runs (Priority: P4)

**Goal**: Running migration twice on the same data produces no duplicates and no errors. Existing entities are skipped by name+type match.

**Independent Test**: Run migration once, run again with same file, verify 0 new entities created and skipped count matches previously-migrated count

### Tests for User Story 4

- [X] T030 [P] [US4] Write test in `tests/integration/kg-migrate.test.mjs`: run migration twice with same data, verify second run has 0 migrated and N skipped for entities
- [X] T031 [P] [US4] Write test in `tests/integration/kg-migrate.test.mjs`: run migration, add 2 new entities to JSON, re-run, verify only 2 new entities created
- [X] T032 [P] [US4] Write test in `tests/integration/kg-migrate.test.mjs`: re-run does NOT update existing entity data (existing metadata unchanged)

### Implementation for User Story 4

- [X] T033 [US4] Verify idempotency logic in `src/kg-migrate.mjs`: ensure duplicate detection (from T015) correctly handles re-runs — existing entities populate idMap from DB query results so relations still resolve on re-run
- [X] T034 [US4] Handle idempotent relation re-runs in `src/kg-migrate.mjs`: catch UNIQUE constraint violations from `createRelation()` on duplicate (source_id, target_id, type), count as skipped not error

**Checkpoint**: Migration is safe to re-run any number of times. Tests pass.

---

## Phase 7: User Story 5 — Migration Summary Report (Priority: P5)

**Goal**: Print a clear summary at the end of migration showing entities/relations migrated, skipped, and errored

**Independent Test**: Run migration and verify stdout output contains expected counts matching actual database state

### Tests for User Story 5

- [X] T035 [P] [US5] Write test in `tests/integration/kg-migrate.test.mjs`: migrate 20 entities and 15 relations (all new), verify output includes "Entities: 20 migrated, 0 skipped, 0 errors" and "Relations: 15 migrated, 0 skipped, 0 errors"
- [X] T036 [P] [US5] Write test in `tests/integration/kg-migrate.test.mjs`: migrate with 5 existing entities and 2 relations referencing missing entities, verify output shows correct skipped and error counts
- [X] T037 [P] [US5] Write test in `tests/integration/kg-migrate.test.mjs`: file not found produces "File not found: <path>" to stderr and exit code 2 (or thrown error in programmatic mode)

### Implementation for User Story 5

- [X] T038 [US5] Refine summary report formatting in `src/kg-migrate.mjs`: ensure report matches cli-contract.md format exactly, including header line "Migrating knowledge graph from X to Y" and footer "Migration complete."
- [X] T039 [US5] Implement `silent` option in `src/kg-migrate.mjs`: when `options.silent` is true, suppress all stdout output (for programmatic use from tests) per quickstart.md API

**Checkpoint**: Summary report displays correct stats for all scenarios. Tests pass.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, final validation, documentation

- [X] T040 [P] Write edge-case tests in `tests/integration/kg-migrate.test.mjs`: empty kg-store.json (`{}`), entities-only (no `relations` key), entity with `attrs: null`, malformed JSON input
- [X] T041 [P] Add JSDoc documentation to all exported functions in `src/kg-migrate.mjs` per constitution I (Code Quality)
- [X] T042 Run full test suite (`npm test`) and verify all tests pass with no regressions
- [X] T043 Run quickstart.md validation: manually test all commands from quickstart.md against a sample `kg-store.json`
- [X] T044 [P] Verify performance: create a test fixture with 1,000 entities and 5,000 relations, confirm migration completes within 10 seconds (SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational phase completion
  - US1 (entities) must complete before US2 (relations) — relations depend on entity ID mapping
  - US3 (dry-run) can start after US1 — needs entity migration logic to exist
  - US4 (idempotency) can start after US2 — tests re-running full migration
  - US5 (reporting) can start after US1 — refines output formatting
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2) — no story dependencies
- **US2 (P2)**: Depends on US1 — needs entity ID mapping (idMap) built during entity migration
- **US3 (P3)**: Depends on US1 — needs entity migration logic to apply dry-run wrapper
- **US4 (P4)**: Depends on US2 — tests full migration re-runs including relations
- **US5 (P5)**: Depends on US1 — refines reporting already partially built in Phase 2

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Validation/edge-case handling after core implementation
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel
- **Phase 2**: T004→T005→T006 are sequential; T007, T008, T009 can each run in parallel once T004 exists
- **Phase 3 (US1)**: All tests (T010–T013) can run in parallel; T014 and T015 can start in parallel
- **Phase 4 (US2)**: All tests (T018–T021) can run in parallel
- **Phase 5 (US3)**: All tests (T025–T027) can run in parallel
- **Phase 6 (US4)**: All tests (T030–T032) can run in parallel
- **Phase 7 (US5)**: All tests (T035–T037) can run in parallel
- **Phase 8**: T040, T041, T044 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for US1 together:
Task: "Write test: migrate 5 entities of various types" (T010)
Task: "Write test: entity with all optional fields and attrs" (T011)
Task: "Write test: entity with empty attrs and no optional fields" (T012)
Task: "Write test: entity with type credential preserved" (T013)

# After tests fail, launch parallel implementation:
Task: "Implement migrateEntities function" (T014)
Task: "Implement existing-entity pre-loading" (T015)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (review existing code)
2. Complete Phase 2: Foundational (script skeleton + CLI + test scaffold)
3. Complete Phase 3: User Story 1 (entity migration)
4. **STOP and VALIDATE**: Test entity migration independently
5. You now have a working migration script for entities

### Incremental Delivery

1. Complete Setup + Foundational → Script skeleton ready
2. Add US1 (entities) → Test independently → Entity migration works (MVP!)
3. Add US2 (relations) → Test independently → Full graph migration works
4. Add US3 (dry-run) → Test independently → Safe preview available
5. Add US4 (idempotency) → Test independently → Safe re-runs
6. Add US5 (reporting) → Test independently → Polished output
7. Polish phase → Edge cases, docs, performance validation

### Single Developer Strategy

Follow priority order strictly: US1 → US2 → US3 → US4 → US5. Each story builds on the previous one's implementation. Validate at each checkpoint before proceeding.

---

## Notes

- All source code goes in a single file: `src/kg-migrate.mjs`
- All tests go in a single file: `tests/integration/kg-migrate.test.mjs`
- [P] tasks = different files or independent functions, no dependencies
- [Story] label maps task to specific user story for traceability
- The script uses ONLY the existing `db.mjs` API — no raw SQL, no new db exports
- Transaction wrapping (T024) is critical for atomicity — test carefully
- Exit codes: 0=success, 1=arg error, 2=file not found, 3=parse error
