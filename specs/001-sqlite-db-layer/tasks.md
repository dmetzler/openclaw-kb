# Tasks: SQLite Unified Schema & Database Abstraction Layer

**Input**: Design documents from `/specs/001-sqlite-db-layer/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/db-api.md ✅, quickstart.md ✅

**Tests**: Included — plan.md specifies vitest test suite with unit and integration tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and base file structure

- [x] T001 Initialize Node.js project with ES module support (`package.json` with `"type": "module"`)
- [x] T002 Install runtime dependencies: `better-sqlite3`, `sqlite-vec`
- [x] T003 Install dev dependencies: `vitest`
- [x] T004 [P] Create directory structure: `src/`, `src/migrations/`, `tests/unit/`, `tests/integration/`
- [x] T005 [P] Create `src/migrations/.gitkeep` placeholder
- [x] T006 [P] Configure vitest in `package.json` or `vitest.config.mjs` (ES module mode)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, database initialization, and migration system — MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create `src/schema.sql` with all tables, indexes, constraints, triggers, and virtual tables per data-model.md:
  - Tier 1: `entities` table with CHECK constraints, indexes (`idx_entities_type`, `idx_entities_name`), and `entities_updated_at` trigger
  - Tier 1: `relations` table with CHECK constraints (`source_id != target_id`, `length(type) > 0`), UNIQUE constraint on `(source_id, target_id, type)`, indexes (`idx_relations_source`, `idx_relations_target`, `idx_relations_type`), and FK CASCADE
  - Tier 2: `data_sources` table with UNIQUE `name`, `data_sources_updated_at` trigger, `idx_data_sources_active` index
  - Tier 2: `health_metrics` table with FK to `data_sources`, indexes (`idx_health_metrics_time`, `idx_health_metrics_source`, `idx_health_metrics_type`)
  - Tier 2: `activities` table with FK to `data_sources`, indexes (`idx_activities_time`, `idx_activities_source`, `idx_activities_type`)
  - Tier 2: `grades` table with FK to `data_sources`, indexes (`idx_grades_time`, `idx_grades_source`, `idx_grades_subject`)
  - Tier 2: `meals` table with FK to `data_sources`, indexes (`idx_meals_time`, `idx_meals_source`, `idx_meals_type`)
  - Tier 3: `search_index` FTS5 virtual table (standalone, `prefix='2 3'`, columns: `name`, `content_text`, `source_table`, `source_id UNINDEXED`)
  - Tier 3: FTS5 sync triggers for all 5 source tables (entities, health_metrics, activities, grades, meals) — INSERT/UPDATE/DELETE triggers per trigger mapping in data-model.md
  - Tier 3: `vec_embeddings` vec0 virtual table (`entity_id INTEGER PRIMARY KEY`, `embedding float[768] distance_metric=cosine`)
  - Infrastructure: `schema_migrations` table (`version TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `applied_at`)
- [x] T008 Implement `src/db.mjs` core initialization and lifecycle functions per contracts/db-api.md:
  - Export `EMBEDDING_DIMENSIONS = 768` constant
  - `initDatabase(dbPath?)`: open database, set pragmas (WAL, FK, busy_timeout=5000, synchronous=NORMAL), load sqlite-vec extension via `sqliteVec.load(db)`, read and apply `schema.sql` if no tables exist, run pending migrations, register process exit handlers (exit, SIGHUP, SIGINT, SIGTERM)
  - `closeDatabase()`: close connection safely (idempotent)
  - Internal: migration runner — read `migrations/` directory, filter by `^\d{3}-.+\.sql$`, sort, skip applied, apply each in `db.transaction()` with INSERT into `schema_migrations`
  - `getSchemaVersion()`: return latest applied migration version or `null`
  - `getMigrationHistory()`: return all applied migrations in order

**Checkpoint**: Database can be created, schema applied, and migrations run. All subsequent user stories build on this.

---

## Phase 3: User Story 1 — Store and Retrieve Knowledge Graph Data (Priority: P1) 🎯 MVP

**Goal**: Developers can create entities and relationships, then traverse the knowledge graph recursively with cycle detection.

**Independent Test**: Insert entities and relations, run recursive traversal, verify subgraph matches expected connections.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Write unit tests for entity CRUD in `tests/unit/db.test.mjs` — cover `createEntity`, `getEntity`, `updateEntity`, `deleteEntity` per acceptance scenarios 1 and 4 (create with name/type/metadata, retrieve by ID, update metadata, verify returned objects have parsed JSON metadata and ISO timestamps)
- [x] T010 [P] [US1] Write unit tests for relation CRUD in `tests/unit/db.test.mjs` — cover `createRelation`, `getRelationsFrom`, `getRelationsTo`, `deleteRelation` per acceptance scenario 2 (two entities linked, verify both source/target reflect connection)
- [x] T011 [P] [US1] Write integration tests in `tests/integration/knowledge-graph.test.mjs` — cover recursive traversal per acceptance scenario 3 (multi-hop graph, verify entities reachable within N hops), cycle detection (A→B→C→A), depth limiting, cascade delete of relations when entity deleted

### Implementation for User Story 1

- [x] T012 [US1] Implement entity CRUD functions in `src/db.mjs` per contracts/db-api.md:
  - `createEntity({ name, type, metadata? })` → validate non-empty name/type, serialize metadata to JSON, INSERT, return with parsed metadata
  - `getEntity(id)` → SELECT, parse metadata JSON, return entity or `null`
  - `updateEntity(id, { name?, type?, metadata? })` → validate, UPDATE only provided fields, throw if not found, return updated entity
  - `deleteEntity(id)` → DELETE (FK CASCADE handles relations), return boolean
- [x] T013 [US1] Implement relation CRUD functions in `src/db.mjs` per contracts/db-api.md:
  - `createRelation({ source_id, target_id, type, metadata? })` → validate source_id ≠ target_id, validate type non-empty, validate entities exist, serialize metadata, INSERT, return with parsed metadata
  - `getRelationsFrom(entityId)` → SELECT WHERE source_id, parse metadata
  - `getRelationsTo(entityId)` → SELECT WHERE target_id, parse metadata
  - `deleteRelation(id)` → DELETE, return boolean
- [x] T014 [US1] Implement `traverseGraph(startEntityId, maxDepth)` in `src/db.mjs` per contracts/db-api.md:
  - Use recursive CTE per research.md R5 pattern (WITH RECURSIVE, cycle detection via `INSTR(path, CAST(id AS TEXT))`, depth counter, comma-separated path)
  - Validate starting entity exists (throw if not)
  - Return array of `{ id, name, type, depth, path }` ordered by depth then ID
- [x] T015 [US1] Run US1 tests — verify all pass: `npx vitest run tests/unit/db.test.mjs tests/integration/knowledge-graph.test.mjs`

**Checkpoint**: Knowledge graph CRUD and recursive traversal fully functional. Entity/relation operations work end-to-end.

---

## Phase 4: User Story 2 — Ingest and Query Structured Life Data (Priority: P2)

**Goal**: Developers can register data sources and insert/query structured records (health metrics, activities, grades, meals) with time-range and source filtering.

**Independent Test**: Insert sample records across all data tables, query by time range and source, verify correct filtering and ordering.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T016 [P] [US2] Write unit tests for data source CRUD in `tests/unit/db.test.mjs` — cover `createDataSource`, `getDataSource`, `updateDataSource` (including `is_active` toggle) per acceptance scenario 4
- [x] T017 [P] [US2] Write integration tests in `tests/integration/data-lake.test.mjs` — cover all 4 data lake tables:
  - `insertHealthMetric` / `queryHealthMetrics` — insert records, query by source_id, by metric_type, by time range, verify chronological ordering (acceptance scenarios 1–3)
  - `insertActivity` / `queryActivities` — same patterns with activity_type filter
  - `insertGrade` / `queryGrades` — same patterns with subject filter
  - `insertMeal` / `queryMeals` — same patterns with meal_type filter
  - Pagination via limit/offset
  - Verify deactivated source records remain accessible (acceptance scenario 4)

### Implementation for User Story 2

- [x] T018 [US2] Implement data source functions in `src/db.mjs` per contracts/db-api.md:
  - `createDataSource({ name, type, config? })` → validate non-empty name, validate unique name, serialize config, INSERT, return with is_active=true
  - `getDataSource(id)` → SELECT, parse config JSON, return or null
  - `updateDataSource(id, { name?, type?, config?, is_active? })` → validate, UPDATE, throw if not found, return updated
- [x] T019 [P] [US2] Implement `insertHealthMetric(record)` and `queryHealthMetrics(filters)` in `src/db.mjs`:
  - Insert: validate required fields (source_id, metric_type, value, unit, recorded_at), serialize metadata, INSERT, return with id/created_at
  - Query: build dynamic WHERE clause from optional filters (source_id, metric_type, from, to), ORDER BY recorded_at ASC, apply limit/offset (defaults: 100/0)
- [x] T020 [P] [US2] Implement `insertActivity(record)` and `queryActivities(filters)` in `src/db.mjs`:
  - Same pattern as health metrics with fields: source_id, activity_type, duration_minutes, intensity, metadata, recorded_at
  - Query filters: source_id, activity_type, from, to, limit, offset
- [x] T021 [P] [US2] Implement `insertGrade(record)` and `queryGrades(filters)` in `src/db.mjs`:
  - Same pattern with fields: source_id, subject, score, scale, metadata, recorded_at
  - Query filters: source_id, subject, from, to, limit, offset
- [x] T022 [P] [US2] Implement `insertMeal(record)` and `queryMeals(filters)` in `src/db.mjs`:
  - Same pattern with fields: source_id, meal_type, items (serialize array to JSON), nutrition, metadata, recorded_at
  - Query filters: source_id, meal_type, from, to, limit, offset
- [x] T023 [US2] Run US2 tests — verify all pass: `npx vitest run tests/unit/db.test.mjs tests/integration/data-lake.test.mjs`

**Checkpoint**: All data lake CRUD operations work. Records can be inserted and queried with filtering and ordering across all 4 tables.

---

## Phase 5: User Story 3 — Full-Text Search Across Knowledge (Priority: P2)

**Goal**: Developers can search across entity names, descriptions, and data lake content using keyword queries, with results ranked by relevance and auto-synced via triggers.

**Independent Test**: Insert entities and data records with known text, run keyword searches, verify result relevance and completeness. Verify auto-sync by inserting/updating/deleting and immediately searching.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T024 [P] [US3] Write integration tests in `tests/integration/search.test.mjs` (FTS section) — cover:
  - Search for keyword in entity name → entity returned (acceptance scenario 1)
  - Insert entity then immediately search → found without re-index (acceptance scenario 2)
  - Update entity description → old term not found, new term found (acceptance scenario 3)
  - Delete entity → no longer in search results
  - Multiple matches ranked by relevance (acceptance scenario 4)
  - Search with `source_table` filter (e.g., only entities)
  - Search across data lake tables (health_metrics, activities, grades, meals indexed via triggers)

### Implementation for User Story 3

- [x] T025 [US3] Implement `search(query, options?)` in `src/db.mjs` per contracts/db-api.md:
  - Validate query non-empty
  - Escape special FTS5 characters in query to prevent syntax errors
  - Build FTS5 MATCH query with optional `source_table` filter
  - Use `snippet(search_index, 1, '<b>', '</b>', '...', 20)` for highlighted excerpts
  - Order by `rank`, apply `limit` (default: 20)
  - Return array of `{ source_table, source_id, name, snippet, rank }`
- [x] T026 [US3] Verify FTS5 trigger sync works end-to-end — insert/update/delete across entities and all data lake tables, confirm `search_index` content stays in sync (this is a validation step, triggers were created in T007's schema.sql)
- [x] T027 [US3] Run US3 tests — verify all pass: `npx vitest run tests/integration/search.test.mjs`

**Checkpoint**: Full-text search works across all tables. Auto-sync via triggers confirmed. Keyword queries return ranked results.

---

## Phase 6: User Story 4 — Semantic Similarity Search via Embeddings (Priority: P3)

**Goal**: Developers can store vector embeddings alongside entities and perform K-nearest-neighbor searches for semantic similarity.

**Independent Test**: Insert entities with known embedding vectors, query with a target vector, verify K-nearest results match expected distances.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T028 [P] [US4] Write integration tests in `tests/integration/search.test.mjs` (vector section) — cover:
  - Insert embedding, query KNN with k=5, verify results ordered by ascending distance (acceptance scenario 1)
  - Entity without embedding does not appear in vector results (acceptance scenario 2)
  - Update embedding, query with vector close to new embedding → correct distance (acceptance scenario 3)
  - Delete embedding via `deleteEmbedding`, verify removed from results
  - Reject vector with wrong dimensions (throw Error)
  - `upsertEmbedding` replaces existing embedding

### Implementation for User Story 4

- [x] T029 [US4] Implement `upsertEmbedding(entityId, vector)` in `src/db.mjs` per contracts/db-api.md:
  - Validate entity exists (throw if not)
  - Validate vector dimensions match `EMBEDDING_DIMENSIONS` (throw if mismatch)
  - Convert to `Float32Array` if needed
  - DELETE existing + INSERT (upsert pattern for vec0)
  - Use `BigInt(entityId)` for rowid per research.md R2 pattern
- [x] T030 [US4] Implement `deleteEmbedding(entityId)` in `src/db.mjs`:
  - DELETE FROM vec_embeddings WHERE rowid = ?
  - Return boolean (true if existed)
- [x] T031 [US4] Implement `findNearestVectors(queryVector, k?)` in `src/db.mjs` per contracts/db-api.md:
  - Validate vector dimensions match `EMBEDDING_DIMENSIONS`
  - Convert to `Float32Array`
  - Use `WHERE embedding MATCH ? ORDER BY distance LIMIT ?` per research.md R2
  - Default k=5
  - Return array of `{ entity_id, distance }`
- [x] T032 [US4] Run US4 tests — verify all pass: `npx vitest run tests/integration/search.test.mjs`

**Checkpoint**: Vector similarity search works. Embeddings can be stored, updated, deleted, and queried by distance.

---

## Phase 7: User Story 5 — Centralized Database Access with Swappable Engine (Priority: P2)

**Goal**: Confirm the abstraction module is the sole entry point — all CRUD and search operations work without consumers writing SQL or importing the driver.

**Independent Test**: Import the module, call public functions for CRUD across all tiers, verify correct data persistence without any direct SQL.

### Tests for User Story 5

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T033 [P] [US5] Write integration tests in `tests/integration/schema-init.test.mjs` — cover:
  - `initDatabase()` with no existing file → creates DB, applies schema, WAL mode, FK enforcement (acceptance scenario 2)
  - Verify `PRAGMA journal_mode` = WAL, `PRAGMA foreign_keys` = ON
  - `initDatabase()` with existing DB → does not re-apply schema
  - `initDatabase(':memory:')` for test isolation
  - Verify all public exports exist and are functions (acceptance scenario 1)
  - `closeDatabase()` is idempotent

### Implementation for User Story 5

- [x] T034 [US5] Verify and harden `initDatabase` in `src/db.mjs`:
  - Confirm schema detection logic (check if tables exist before applying schema.sql)
  - Confirm pragma verification (WAL mode, FK, busy_timeout, synchronous)
  - Confirm sqlite-vec loads without error
  - Confirm process exit handlers are registered exactly once
  - Ensure `:memory:` and custom path both work
- [x] T035 [US5] Run US5 tests — verify all pass: `npx vitest run tests/integration/schema-init.test.mjs`

**Checkpoint**: Abstraction module confirmed as sole entry point. Schema initialization, pragma setup, and extension loading verified.

---

## Phase 8: User Story 6 — Schema Versioning and Migration (Priority: P3)

**Goal**: Schema can evolve via numbered SQL migration files, applied automatically, tracked individually, with transactional rollback on failure.

**Independent Test**: Create a DB at version 0, add multiple migration files, run migration system, verify each applied exactly once in order.

### Tests for User Story 6

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T036 [P] [US6] Write unit tests for migration system in `tests/unit/migrations.test.mjs` — cover:
  - No migration history → migrations 001–003 exist → all applied in sequence, version reflects 003 (acceptance scenario 1)
  - DB at version 002 → migration 003 added → only 003 applied (acceptance scenario 2)
  - Invalid SQL in migration → rolled back, version unchanged, error thrown with descriptive message (acceptance scenario 3)
  - Files outside naming pattern (`^\d{3}-.+\.sql$`) → ignored (acceptance scenario 4)
  - `getSchemaVersion()` returns latest version or null
  - `getMigrationHistory()` returns all applied migrations in order

### Implementation for User Story 6

- [x] T037 [US6] Verify and harden migration runner in `src/db.mjs` (initially implemented in T008):
  - Confirm file filtering regex: `^\d{3}-.+\.sql$`
  - Confirm skip-applied logic (compare against `schema_migrations` table)
  - Confirm each migration wrapped in `db.transaction()` — auto-rollback on throw
  - Confirm `schema_migrations` INSERT only on success
  - Confirm descriptive error message on failure (include filename)
- [x] T038 [US6] Run US6 tests — verify all pass: `npx vitest run tests/unit/migrations.test.mjs`

**Checkpoint**: Migration system confirmed. Sequential application, skip-applied, transactional rollback, and bad-file filtering verified.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, edge cases, performance benchmarks, and documentation

- [x] T039 [P] Add JSDoc documentation to all exported functions in `src/db.mjs` per constitution principle I (Code Quality)
- [x] T040 [P] Add error handling for edge cases in `src/db.mjs`:
  - Corrupted/inaccessible database file at startup → descriptive error
  - FTS5 special characters in search queries → escape properly
  - Disk-full during write → surface underlying error with context
- [x] T041 [P] Add performance benchmark tests to `tests/integration/` — verify:
  - SC-002: Recursive traversal <500ms for 1,000+ entities / 5,000+ relations
  - SC-003: Full-text search <100ms for 10,000+ indexed records
  - SC-004: Vector KNN search <200ms for 10,000+ embeddings
- [x] T042 Run full test suite: `npx vitest run` — verify all tests pass across all files
- [x] T043 Run quickstart.md validation — verify all code examples in `specs/001-sqlite-db-layer/quickstart.md` work correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001–T006) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (T007–T008)
- **US2 (Phase 4)**: Depends on Foundational (T007–T008) — independent of US1
- **US3 (Phase 5)**: Depends on Foundational (T007–T008) — depends on FTS5 triggers from schema.sql; benefits from US1+US2 data for cross-table search testing
- **US4 (Phase 6)**: Depends on Foundational (T007–T008) + US1 entity functions (T012) for entity validation
- **US5 (Phase 7)**: Depends on Foundational (T007–T008) — tests schema init directly
- **US6 (Phase 8)**: Depends on Foundational (T007–T008) — tests migration runner directly
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no other story dependencies
- **US2 (P2)**: Can start after Foundational — independent of US1
- **US3 (P2)**: Can start after Foundational — FTS sync uses triggers from schema.sql; testing benefits from US1+US2 insert functions
- **US4 (P3)**: Requires US1 entity functions (`createEntity`) for entity validation in embeddings
- **US5 (P2)**: Can start after Foundational — tests init/lifecycle directly
- **US6 (P3)**: Can start after Foundational — tests migration system directly

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Validation/error handling within implementation tasks (not separate)
- Run story-specific tests after implementation to confirm green

### Parallel Opportunities

- **Phase 1**: T004, T005, T006 can all run in parallel
- **Phase 3 (US1)**: T009, T010, T011 (tests) in parallel; T012, T013 can start after tests written
- **Phase 4 (US2)**: T016, T017 (tests) in parallel; T019, T020, T021, T022 (per-table implementations) in parallel
- **Phase 5 (US3)**: T024 (test) then T025 (implementation)
- **Phase 6 (US4)**: T028 (test) then T029, T030, T031 in parallel (different functions)
- **Phase 7 (US5)**: T033 (test) then T034 (hardening)
- **Phase 8 (US6)**: T036 (test) then T037 (hardening)
- **Phase 9**: T039, T040, T041 all in parallel (different concerns)

---

## Parallel Example: User Story 2

```bash
# Launch all tests for US2 together:
Task T016: "Unit tests for data source CRUD in tests/unit/db.test.mjs"
Task T017: "Integration tests for data lake in tests/integration/data-lake.test.mjs"

# After tests written, launch all per-table implementations in parallel:
Task T019: "Implement insertHealthMetric / queryHealthMetrics in src/db.mjs"
Task T020: "Implement insertActivity / queryActivities in src/db.mjs"
Task T021: "Implement insertGrade / queryGrades in src/db.mjs"
Task T022: "Implement insertMeal / queryMeals in src/db.mjs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (schema.sql + db.mjs init + migration runner)
3. Complete Phase 3: User Story 1 (Knowledge Graph CRUD + traversal)
4. **STOP and VALIDATE**: Test US1 independently — entities, relations, recursive traversal all working
5. This is a functional knowledge graph — usable immediately

### Incremental Delivery

1. Setup + Foundational → Database layer exists
2. Add US1 → Knowledge graph operational (MVP!)
3. Add US2 → Data lake ingestion/querying works
4. Add US3 → Full-text search across all content
5. Add US4 → Semantic similarity search
6. Add US5 → Confirm abstraction is solid
7. Add US6 → Confirm migration system is solid
8. Polish → Docs, edge cases, benchmarks

### Single Developer Strategy (Recommended)

Since this is a single-developer project:
1. Complete Setup + Foundational sequentially
2. Implement US1 → US2 → US3 → US4 in priority order
3. US5 and US6 are verification phases — run after US1–US4
4. Polish phase after all stories confirmed

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All functions go in single file `src/db.mjs` — parallel [P] marks indicate functions that can be written simultaneously since they don't depend on each other
- Schema goes in single file `src/schema.sql` — T007 is one large task by design
- Test isolation: use `:memory:` databases or temp files per test
- Commit after each phase or logical group
- Stop at any checkpoint to validate story independently
