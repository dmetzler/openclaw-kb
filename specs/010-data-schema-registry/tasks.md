# Tasks: Data Schema Registry

**Input**: Design documents from `/specs/010-data-schema-registry/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are included — the spec requires comprehensive testing per Constitution II.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create database migration

- [x] T001 Install `ajv` and `ajv-formats` npm dependencies in `package.json`
- [x] T002 Create migration `src/migrations/003-data-schema-registry.sql` with `data_schemas` table DDL and `updated_at` trigger per `data-model.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema registry functions in `db.mjs` that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add `registerSchema(recordType, label, description, jsonSchema, example)` function to `src/db.mjs` per contracts. Uses `INSERT OR REPLACE` into `data_schemas`. Validates: record_type matches `/^[a-zA-Z0-9_-]+$/`, label non-empty, jsonSchema is valid compilable JSON Schema via ajv. Returns stored row with parsed JSON fields. Does NOT generate wiki pages yet (that comes in US5).
- [x] T004 Add `getSchema(recordType)` function to `src/db.mjs` per contracts. Returns full schema row with `json_schema` and `example` parsed from JSON strings, or `null` if not found.
- [x] T005 [P] Add `listSchemas()` function to `src/db.mjs` per contracts. Returns array of `{ record_type, label, description }` sorted alphabetically by `record_type`.
- [x] T006 Add `validateRecord(recordType, data)` function to `src/db.mjs` per contracts. Looks up schema via `getSchema()`, compiles with ajv, validates data. Returns `{ valid: boolean, errors: string[] | null }`. Throws if no schema registered.
- [x] T007 Add `_seedSchemas()` private function to `src/db.mjs` that registers the 6 pre-defined schemas (health_metric, activity, grade, meal, sleep, finance) if they don't already exist. Called from `initDatabase()` after `_runMigrations()`. Each schema includes complete JSON Schema definition and example record per `data-model.md`.

**Checkpoint**: Foundation ready — `registerSchema`, `getSchema`, `listSchemas`, `validateRecord` all functional. Schemas seeded on init.

---

## Phase 3: User Story 1 — AI Agent Discovers Available Data Schemas (Priority: P1) 🎯 MVP

**Goal**: AI agents can discover all registered data types and their expected formats through the schema registry APIs.

**Independent Test**: Register a schema, call `listSchemas()` and `getSchema()`, verify returned data contains enough info to construct a valid record.

### Tests for User Story 1

- [x] T008 [P] [US1] Write tests in `tests/unit/schema-registry.test.mjs`: test `listSchemas()` returns all 6 pre-registered schemas with record_type, label, description after `initDatabase(':memory:')`.
- [x] T009 [P] [US1] Write tests in `tests/unit/schema-registry.test.mjs`: test `getSchema('health_metric')` returns full schema with json_schema object containing properties, required array, and example object. Test `getSchema('unknown_type')` returns null.

### Implementation for User Story 1

- [x] T010 [US1] Verify all 6 pre-registered schemas from T007 are discoverable: `listSchemas()` returns 6 entries, each `getSchema()` call returns complete schema with required/optional field definitions and example. Fix any issues.

**Checkpoint**: User Story 1 complete — AI agents can discover and read all schemas.

---

## Phase 4: User Story 2 — Data Validation on Record Insertion (Priority: P1)

**Goal**: Records are validated against their schema on insertion. Invalid data is rejected with descriptive errors. Unregistered types are allowed with a warning.

**Independent Test**: Insert valid data for a registered type (succeeds), invalid data (fails with field-specific errors), data for unregistered type (succeeds with console warning).

### Tests for User Story 2

- [x] T011 [P] [US2] Write tests in `tests/unit/schema-registry.test.mjs`: test `validateRecord('health_metric', validData)` returns `{ valid: true, errors: null }`. Test with missing required field returns `{ valid: false, errors: [...] }` with field name in error. Test with wrong type returns errors. Test throws for unregistered type.
- [x] T012 [P] [US2] Write tests in `tests/unit/schema-registry.test.mjs`: test `insertRecord('health_metric', validData)` succeeds. Test `insertRecord('health_metric', invalidData)` throws with descriptive error. Test `insertRecord('unregistered_type', data)` succeeds (requires `console.warn` spy to verify warning logged). Test optional fields can be omitted.

### Implementation for User Story 2

- [x] T013 [US2] Modify `insertRecord()` in `src/db.mjs` to add schema validation step between existing parameter checks (line ~594) and the SQL INSERT (line ~596). If schema exists for `recordType`: validate `data` via `validateRecord()`, throw on failure with message `'Validation failed for record type "${recordType}": ${errors}'`. If no schema exists: `console.warn('No schema registered for record type: ${recordType}. Inserting without validation.')` and proceed.

**Checkpoint**: User Story 2 complete — data quality enforced on insertion.

---

## Phase 5: User Story 3 — Pre-Registered Schemas for Known Data Types (Priority: P1)

**Goal**: Fresh database initialization comes pre-loaded with schemas for all 6 known data types.

**Independent Test**: Initialize fresh in-memory DB, verify `listSchemas()` returns 6 entries, each with complete JSON Schema and example.

### Tests for User Story 3

- [x] T014 [P] [US3] Write tests in `tests/unit/schema-registry.test.mjs`: test fresh `initDatabase(':memory:')` → `listSchemas()` returns exactly 6 schemas. Test each pre-registered schema has valid json_schema (compilable by ajv) and example that validates against its own schema.

### Implementation for User Story 3

- [x] T015 [US3] Verify the `_seedSchemas()` implementation from T007 covers all acceptance scenarios. Ensure each schema's example record passes validation against its own json_schema. Fix any schema definition issues.

**Checkpoint**: User Story 3 complete — all known data types have schemas from day one.

---

## Phase 6: User Story 4 — Register New Data Schemas On-the-Fly (Priority: P2)

**Goal**: New data types can be registered dynamically and are immediately available for discovery and validation.

**Independent Test**: Register a new schema via `registerSchema()`, verify it appears in `listSchemas()`, retrieve it with `getSchema()`, insert a record of that type (validates), update schema with new definition (replaces old).

### Tests for User Story 4

- [x] T016 [P] [US4] Write tests in `tests/unit/schema-registry.test.mjs`: test register new type → appears in listSchemas. Test register existing type → replaces definition. Test register with invalid record_type (spaces, special chars) → throws. Test register with non-object jsonSchema → throws. Test newly registered schema validates records immediately.

### Implementation for User Story 4

- [x] T017 [US4] Verify `registerSchema()` from T003 handles upsert correctly (INSERT OR REPLACE). Verify validation edge cases: record_type with special chars rejected, invalid JSON Schema rejected, malformed example handled. Fix any issues.

**Checkpoint**: User Story 4 complete — runtime schema extensibility works.

---

## Phase 7: User Story 5 — Wiki Documentation Auto-Generated for Schemas (Priority: P2)

**Goal**: Every registered schema has an auto-generated Obsidian-compatible Markdown page in `wiki/schemas/`.

**Independent Test**: Register a schema, verify `wiki/schemas/{slug}.md` exists with correct frontmatter, field table, and example block.

### Tests for User Story 5

- [x] T018 [P] [US5] Write tests in `tests/unit/schema-registry.test.mjs`: test `generateSchemaWikiPage()` creates a file in wiki/schemas/ with correct slug. Test file contains frontmatter (type, record_type, label), field table, and JSON example block. Test re-registration regenerates wiki page. Use a temp directory for wiki output in tests.

### Implementation for User Story 5

- [x] T019 [US5] Create `generateSchemaWikiPage(schema, options)` function in `src/schema-registry.mjs`. Takes a schema object (from `getSchema()`), generates Obsidian-compatible Markdown per wiki page contract. Uses `slugify()` from `src/wiki.mjs` for file naming. Writes to `wiki/schemas/` directory (created if needed). Includes: frontmatter, description, field table (extracted from JSON Schema properties + required array), and formatted JSON example.
- [x] T020 [US5] Wire wiki generation into `registerSchema()` in `src/db.mjs` — after successful DB upsert, call `generateSchemaWikiPage()`. Import from `schema-registry.mjs`. Handle wiki generation failure gracefully (log warning, don't fail the registration).
- [x] T021 [US5] Generate wiki pages for all 6 pre-registered schemas by calling `generateSchemaWikiPage()` from `_seedSchemas()` in `src/db.mjs`.

**Checkpoint**: User Story 5 complete — every schema has a wiki page.

---

## Phase 8: User Story 6 — CLI for Schema Management (Priority: P3)

**Goal**: Administrators can manage schemas from the command line.

**Independent Test**: Run each CLI command (`list`, `get`, `register`, `validate`) and verify output and exit codes.

### Tests for User Story 6

- [x] T022 [P] [US6] Write tests in `tests/unit/schema-registry.test.mjs`: test CLI arg parsing for each command. Test `list` outputs table format. Test `get` with valid/invalid type. Test `register` from JSON file. Test `validate` with valid/invalid data. Test no-args shows usage. Test exit codes.

### Implementation for User Story 6

- [x] T023 [US6] Build CLI in `src/schema-registry.mjs` following existing patterns from `src/kb-export.mjs`. Implement `isMainModule` check, `process.argv` parsing, and commands: `list` (table output of all schemas), `get <type>` (full schema details as formatted JSON), `register <json-file>` (read JSON file, call `registerSchema()`), `validate <type> <json-file>` (read JSON file, call `validateRecord()`). Exit codes: 0 success, 1 invalid args/validation failure, 2 file not found. Include usage/help text.

**Checkpoint**: User Story 6 complete — full CLI for schema management.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass across all user stories

- [ ] T024 Run full test suite (`npm test`) and fix any failures
- [ ] T025 Run `lsp_diagnostics` on all changed files (`src/db.mjs`, `src/schema-registry.mjs`, `tests/unit/schema-registry.test.mjs`) and fix any errors
- [ ] T026 [P] Verify all 6 wiki pages generated correctly in `wiki/schemas/` — check formatting renders in Markdown
- [x] T027 Add JSDoc documentation to all new exported functions in `src/db.mjs` and `src/schema-registry.mjs`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — schema discovery
- **US2 (Phase 4)**: Depends on Foundational — validation on insert
- **US3 (Phase 5)**: Depends on Foundational — pre-registered schemas
- **US4 (Phase 6)**: Depends on Foundational — on-the-fly registration
- **US5 (Phase 7)**: Depends on Foundational — wiki generation
- **US6 (Phase 8)**: Depends on US1, US2, US4, US5 — CLI wraps all APIs
- **Polish (Phase 9)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational
- **US2 (P1)**: Independent after Foundational
- **US3 (P1)**: Independent after Foundational
- **US4 (P2)**: Independent after Foundational
- **US5 (P2)**: Independent after Foundational (uses `registerSchema()` from Foundational)
- **US6 (P3)**: Depends on US1-US5 being complete (CLI wraps all APIs)

### Within Each User Story

- Tests written first (where included)
- Implementation follows tests
- Story checkpoint validates independently

### Parallel Opportunities

- T005 can run in parallel with T003/T004 (different function, no deps)
- T008/T009 can run in parallel (different test groups)
- T011/T012 can run in parallel (different test groups)
- US1, US2, US3, US4, US5 can all run in parallel after Foundational
- T018, T022 can run in parallel (different test files)

---

## Parallel Example: Foundational Phase

```bash
# Sequential: T003 → T004 → T006 (getSchema dependency chain)
# Parallel: T005 can run alongside T003/T004
Task: "Add listSchemas() to src/db.mjs"  # No deps on other functions
Task: "Add registerSchema() to src/db.mjs"  # Independent
```

## Parallel Example: User Stories after Foundational

```bash
# All can start simultaneously:
Task: "US1 tests and verification"
Task: "US2 tests and insertRecord modification"
Task: "US3 tests and seed verification"
Task: "US4 tests and edge case verification"
Task: "US5 wiki generation implementation"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T007)
3. Complete Phase 3: US1 — Schema Discovery (T008-T010)
4. Complete Phase 4: US2 — Validation on Insert (T011-T013)
5. Complete Phase 5: US3 — Pre-Registered Schemas (T014-T015)
6. **STOP and VALIDATE**: All P1 stories independently testable

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1-US3 → Core schema registry operational (MVP!)
3. Add US4 → Runtime extensibility
4. Add US5 → Auto-documentation
5. Add US6 → CLI convenience
6. Polish → Production ready

---

## Summary

- **Total tasks**: 27
- **Tasks per story**: Setup: 2, Foundational: 5, US1: 3, US2: 3, US3: 2, US4: 2, US5: 4, US6: 2, Polish: 4
- **Parallel opportunities**: 8 explicitly marked [P], plus 5 user stories parallelizable after Foundational
- **MVP scope**: Phases 1-5 (US1-US3) — 15 tasks
- **Format validation**: ✅ All tasks follow `- [ ] [ID] [P?] [Story?] Description with file path` format

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each phase with `--no-gpg-sign`
- Stop at any checkpoint to validate story independently
