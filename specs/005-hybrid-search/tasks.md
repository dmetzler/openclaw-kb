# Tasks: Hybrid 3-Tier Search System

**Input**: Design documents from `/specs/005-hybrid-search/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Comprehensive test suite required per plan.md constitution check (section II — Testing Standards). The core module (`src/wiki-search.mjs`, 556 lines) and priority-rules template (`templates/priority-rules.md`) are already implemented. Remaining work is test coverage, edge-case hardening, and performance validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/`, `templates/` at repository root

---

## Phase 1: Setup (Test Infrastructure)

**Purpose**: Create test file skeleton and shared test utilities for `wiki-search.mjs`

- [x] T001 Create `tests/integration/wiki-search.test.mjs` with Vitest imports, `beforeEach`/`afterEach` hooks using `initDatabase(':memory:')` and `closeDatabase()`, and empty `describe` blocks for each user story (US1–US5) plus an edge-cases block
- [x] T002 [P] Create shared test helper functions in `tests/integration/wiki-search.test.mjs` — `seedKGEntity(name, type, metadata)` that calls `createEntity()`, `seedDataRecord(recordType, data, recordedAt)` that calls `createDataSource()` + `insertRecord()`, `seedEmbedding(entityId, vector)` that calls `upsertEmbedding()`, and `randomVector(dims)` returning a random 384-dim array

**Checkpoint**: Test file loads and runs with zero tests. All seed helpers are reusable across describe blocks. Run `npx vitest run tests/integration/wiki-search.test.mjs` to verify.

---

## Phase 2: Foundational (Helper Function Unit Tests)

**Purpose**: Test all internal helper functions to establish a solid foundation before testing public API

**⚠️ CRITICAL**: These tests validate the scoring and deduplication logic that ALL user story tests depend on

- [x] T003 [P] Add `describe('bm25ToScore')` tests in `tests/integration/wiki-search.test.mjs` — test negative ranks (-1 → 0.5, -5 → 0.833, -15 → 0.938), rank 0 → 1.0, positive ranks, `NaN` → 0.001, `Infinity` → 0.001, `-Infinity` → 0.001. Import via re-export or test indirectly through `searchSemantic` results.
- [x] T004 [P] Add `describe('vecDistanceToSimilarity')` tests in `tests/integration/wiki-search.test.mjs` — test distance 0 → 1.0, distance 0.5 → 0.5, distance 1.0 → 0.0, distance > 1.0 → clamped to 0, negative distance → clamped. Test indirectly through `searchSemantic` results with known embeddings.
- [x] T005 [P] Add `describe('depthToScore')` tests in `tests/integration/wiki-search.test.mjs` — test depth 0 → 1.0, depth 1 → 0.6, depth 2 → 0.3, depth 3+ → 0.3. Test indirectly through `searchKG` results on entities with known graph depth.
- [x] T006 [P] Add `describe('deduplicateResults')` tests in `tests/integration/wiki-search.test.mjs` — test that when the same entity appears in KG (tier 1) and semantic (tier 3), only the KG result is kept; test that entities from different source_tables are NOT deduplicated (entity "sleep" vs data_record "sleep"). Test indirectly through `search()` with overlapping data.

**Checkpoint**: All helper function behaviors verified through integration tests. Run `npx vitest run tests/integration/wiki-search.test.mjs` — all tests pass.

---

## Phase 3: User Story 1 — Unified Search Across All Knowledge Tiers (Priority: P1) 🎯 MVP

**Goal**: Verify `search(query, options)` returns merged, deduplicated, priority-ranked results from all three tiers.

**Independent Test**: Populate all three tiers with overlapping data (entity "Alice" in KG, data record about "Alice", wiki entry about "Alice"), call `search("Alice")`, verify results from all tiers, KG ranked highest, no duplicates, tier provenance included.

### Tests for User Story 1

- [x] T007 [US1] Test acceptance scenario 1 in `tests/integration/wiki-search.test.mjs` — seed entity "Node.js" in KG, data record with record_type "technology_metric" mentioning "Node.js", ensure FTS5 indexes both, call `search("Node.js")`, verify results include matches from all three tiers with KG entity ranked first
- [x] T008 [US1] Test acceptance scenario 2 (deduplication) in `tests/integration/wiki-search.test.mjs` — seed entity "Python" in KG (creates both entity and search_index entry), call `search("Python")`, verify only one result for "Python" sourced from tier 1 (KG wins dedup)
- [x] T009 [US1] Test acceptance scenario 3 (empty KB) in `tests/integration/wiki-search.test.mjs` — call `search("anything")` on empty in-memory database, verify returns `[]` without errors
- [x] T010 [US1] Test acceptance scenario 4 (semantic-only match) in `tests/integration/wiki-search.test.mjs` — seed an entity that only appears in semantic tier, call `search("obscure topic")`, verify semantic results returned with scores
- [x] T011 [US1] Test acceptance scenario 5 (tier filtering) in `tests/integration/wiki-search.test.mjs` — seed data in all tiers, call `search("query", { tiers: [1, 3] })`, verify only KG and semantic results returned — no data records
- [x] T012 [US1] Test `includeScores` option in `tests/integration/wiki-search.test.mjs` — call `search("query", { includeScores: true })` and verify `score` and `tier` fields present; call with `includeScores: false` (default) and verify those fields are absent
- [x] T013 [US1] Test `maxResults` option in `tests/integration/wiki-search.test.mjs` — seed 30+ entities, call `search("query", { maxResults: 5 })`, verify at most 5 results returned; test `maxResults: 0` defaults to 20

**Checkpoint**: All US1 acceptance scenarios pass. `search()` behaves per contract.

---

## Phase 4: User Story 2 — Knowledge Graph Search with Relation Traversal (Priority: P1)

**Goal**: Verify `searchKG(query)` finds entities by name and traverses relations with bounded depth.

**Independent Test**: Create entities "Alice" → works_at → "Acme Corp" → located_in → "San Francisco", call `searchKG("Acme Corp")`, verify direct match + traversed relations with correct scores.

### Tests for User Story 2

- [x] T014 [US2] Test acceptance scenario 1 (direct match) in `tests/integration/wiki-search.test.mjs` — seed entity "Machine Learning" with type "concept", call `searchKG("Machine Learning")`, verify entity returned with full metadata, score 1.0, depth 0
- [x] T015 [US2] Test acceptance scenario 2 (relation traversal) in `tests/integration/wiki-search.test.mjs` — seed "Alice" with relation "works_at" → "Acme Corp", call `searchKG("Alice")`, verify "Alice" returned as direct match (score 1.0) and "Acme Corp" returned as related entity (score 0.6) with relation_type "works_at"
- [x] T016 [US2] Test acceptance scenario 3 (no match) in `tests/integration/wiki-search.test.mjs` — call `searchKG("nonexistent")`, verify returns `[]`
- [x] T017 [US2] Test acceptance scenario 4 (depth limiting) in `tests/integration/wiki-search.test.mjs` — seed a chain A → B → C → D → E, call `searchKG("A")`, verify traversal stops at configured max depth (2), results include A (1.0), B (0.6), C (0.3) but NOT D or E
- [x] T018 [US2] Test KG result metadata shape in `tests/integration/wiki-search.test.mjs` — verify each result has `metadata.entity_type`, `metadata.depth`, `metadata.path`, `metadata.relation_type` per contracts/wiki-search-api.md

**Checkpoint**: All US2 acceptance scenarios pass. `searchKG()` handles direct match, traversal, empty results, and depth limiting.

---

## Phase 5: User Story 3 — Semantic Search with Weighted FTS5 and Vector Similarity (Priority: P2)

**Goal**: Verify `searchSemantic(query, options)` combines FTS5 and vec0 scores with configurable weights.

**Independent Test**: Insert entities with embeddings and FTS5-indexed content, call `searchSemantic("related concept")` with different weight configs, verify ranking changes and deterministic scores.

### Tests for User Story 3

- [x] T019 [US3] Test acceptance scenario 1 (combined FTS + vector) in `tests/integration/wiki-search.test.mjs` — seed entities with embeddings and FTS5 content, call `searchSemantic("artificial intelligence", { queryVector })`, verify results include both FTS5 and vector matches with individual and combined scores in metadata
- [x] T020 [US3] Test acceptance scenario 2 (weight adjustment) in `tests/integration/wiki-search.test.mjs` — seed data with strong keyword match but weak vector similarity, call with `{ ftsWeight: 0.8, vectorWeight: 0.2 }` vs `{ ftsWeight: 0.2, vectorWeight: 0.8 }`, verify ranking order changes based on weights
- [x] T021 [US3] Test acceptance scenario 3 (minScore filtering) in `tests/integration/wiki-search.test.mjs` — seed data producing varied scores, call with `{ minScore: 0.5 }`, verify low-scoring entries excluded
- [x] T022 [US3] Test acceptance scenario 4 (FTS-only fallback) in `tests/integration/wiki-search.test.mjs` — seed FTS5 content but no embeddings, call `searchSemantic("query")` without queryVector, verify results returned from FTS5 only with `metadata.combined_method === 'fts_only'`
- [x] T023 [US3] Test deterministic scoring (SC-004) in `tests/integration/wiki-search.test.mjs` — call `searchSemantic()` twice with identical query and data, verify scores and ranking are identical both times
- [x] T024 [US3] Test vec0 graceful degradation in `tests/integration/wiki-search.test.mjs` — verify that when `queryVector` has wrong dimensions or is invalid, semantic search falls back to FTS-only without errors

**Checkpoint**: All US3 acceptance scenarios pass. Weight adjustment changes rankings. FTS-only fallback works. Scores are deterministic.

---

## Phase 6: User Story 4 — Data Records Filtered Search (Priority: P2)

**Goal**: Verify `searchData(query, recordType)` searches data records with optional type filtering.

**Independent Test**: Insert data records of types "health_metric" and "activity", call `searchData("weight", "health_metric")`, verify only health_metric records returned.

### Tests for User Story 4

- [x] T025 [US4] Test acceptance scenario 1 (type-filtered search) in `tests/integration/wiki-search.test.mjs` — seed "health_metric" and "activity" records, call `searchData("running", "activity")`, verify only activity records returned
- [x] T026 [US4] Test acceptance scenario 2 (relevance ordering) in `tests/integration/wiki-search.test.mjs` — seed multiple health_metric records, call `searchData("blood pressure", "health_metric")`, verify results ordered by relevance score descending
- [x] T027 [US4] Test acceptance scenario 3 (no match) in `tests/integration/wiki-search.test.mjs` — call `searchData("nonexistent", "health_metric")`, verify returns `[]` without errors
- [x] T028 [US4] Test acceptance scenario 4 (all types) in `tests/integration/wiki-search.test.mjs` — seed records of multiple types, call `searchData("weight")` without recordType, verify matching records across all types returned
- [x] T029 [US4] Test metadata shape in `tests/integration/wiki-search.test.mjs` — verify each result has `metadata.record_type`, `metadata.recorded_at`, and `metadata.data` per contracts/wiki-search-api.md

**Checkpoint**: All US4 acceptance scenarios pass. Type filtering, all-types search, and metadata population work correctly.

---

## Phase 7: User Story 5 — Priority Resolution Rules Template (Priority: P3)

**Goal**: Verify `templates/priority-rules.md` contains structured rules for LLM integration and meets token limits.

**Independent Test**: Load template, verify tier hierarchy rules present, confirm under 2,000 tokens.

### Tests for User Story 5

- [x] T030 [US5] Test template content in `tests/integration/wiki-search.test.mjs` — load `templates/priority-rules.md`, verify it contains rules for all three tiers (Tier 1 KG overrides Tier 2, both override Tier 3), conflict resolution instructions, and tier characteristics
- [x] T031 [US5] Test template size (SC-006) in `tests/integration/wiki-search.test.mjs` — load `templates/priority-rules.md`, verify character count under 8,000 (proxy for ~2,000 tokens) for LLM system prompt suitability
- [x] T032 [US5] Test template injectability in `tests/integration/wiki-search.test.mjs` — load template via `readFileSync`, concatenate with mock search results into a prompt string, verify resulting string is valid and contains both rules and results

**Checkpoint**: Template is loadable, contains correct rules, and fits within token limits.

---

## Phase 8: Edge Cases & Hardening

**Purpose**: Cover all edge cases from spec.md section "Edge Cases" and FR-015

- [x] T033 [P] Test empty/whitespace queries in `tests/integration/wiki-search.test.mjs` — verify `search("")`, `search("   ")`, `searchKG("")`, `searchData("")`, `searchSemantic("")` all return `[]` without errors
- [x] T034 [P] Test FTS5 special characters (FR-015) in `tests/integration/wiki-search.test.mjs` — verify `search('C++ "hello world" OR *wildcard*')`, `search("test's")`, `search("query()")` return results or `[]` without throwing
- [x] T035 [P] Test invalid maxResults in `tests/integration/wiki-search.test.mjs` — verify `search("query", { maxResults: 0 })`, `search("query", { maxResults: -5 })`, `search("query", { maxResults: 1.5 })` all default gracefully to 20 or clamp appropriately
- [x] T036 [P] Test invalid tier numbers in `tests/integration/wiki-search.test.mjs` — verify `search("query", { tiers: [5, 99] })` returns `[]` (no valid tiers), `search("query", { tiers: [1, 5] })` queries only tier 1
- [x] T037 [P] Test vector dimension mismatch in `tests/integration/wiki-search.test.mjs` — call `searchSemantic("query", { queryVector: new Float32Array(10) })` (wrong dims), verify falls back to FTS-only without errors
- [x] T038 [P] Test within-tier deduplication in `tests/integration/wiki-search.test.mjs` — verify that when the same entity appears in both FTS5 and vector results within semantic tier, only one result is returned per entity

**Checkpoint**: All spec edge cases covered. Module handles malformed input gracefully.

---

## Phase 9: Performance Validation

**Purpose**: Verify the 200ms performance target (SC-003)

- [x] T039 Add performance benchmark test in `tests/integration/wiki-search.test.mjs` — seed database with 1,000+ entities, 5,000+ data records, and 500+ search_index entries, call `search("common term")`, measure execution time with `performance.now()`, assert < 200ms
- [x] T040 [P] Profile `searchData` metadata lookup in `tests/integration/wiki-search.test.mjs` — seed 5,000+ data records of same type, call `searchData("term", "type")`, verify the `queryRecords` + `.find()` pattern completes within 200ms, document timing

**Checkpoint**: Performance target met. Any bottleneck in `searchData` metadata lookup identified and documented.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [x] T041 Run full test suite in `tests/integration/wiki-search.test.mjs` — execute `npx vitest run tests/integration/wiki-search.test.mjs` and verify all tests pass with zero failures
- [x] T042 [P] Run quickstart.md validation — verify each code example from `specs/005-hybrid-search/quickstart.md` against the implementation (may use `tests/integration/quickstart-validation.test.mjs` as reference)
- [x] T043 [P] Verify JSDoc completeness on all four exports in `src/wiki-search.mjs` — confirm `@param`, `@returns`, `@example` tags are present per plan.md constitution check

**Checkpoint**: Full test suite green. Quickstart examples validated. Documentation complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — establishes scoring/dedup test baseline
- **User Stories (Phases 3–7)**: All depend on Foundational phase completion
  - US2 (Phase 4), US3 (Phase 5), US4 (Phase 6), US5 (Phase 7) can proceed in parallel
  - US1 (Phase 3) depends on US2+US3+US4 existing as functional search functions
- **Edge Cases (Phase 8)**: Can start after Setup, but benefits from user story tests for reference
- **Performance (Phase 9)**: Can start after Setup — independent of user story tests
- **Polish (Phase 10)**: Depends on all previous phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Tests orchestration of US2+US3+US4 — implement tests after tier-specific tests pass
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 5 (P3)**: Can start after Setup (Phase 1) — independent template validation

### Within Each User Story

- Acceptance scenarios can be implemented in any order within a story
- All tests for a story target the same file (`tests/integration/wiki-search.test.mjs`)

### Parallel Opportunities

- T001 and T002 can run in parallel (Phase 1)
- T003, T004, T005, T006 can all run in parallel (Phase 2 — different helper functions)
- US2 (Phase 4), US3 (Phase 5), US4 (Phase 6), US5 (Phase 7) can all run in parallel
- All edge case tests (T033–T038) can run in parallel
- T039 and T040 can run in parallel (Phase 9)
- T041, T042, T043 can run in parallel (Phase 10)

---

## Parallel Example: Foundational Phase

```bash
# Launch all helper function test implementations together:
Task: "Test bm25ToScore in tests/integration/wiki-search.test.mjs"
Task: "Test vecDistanceToSimilarity in tests/integration/wiki-search.test.mjs"
Task: "Test depthToScore in tests/integration/wiki-search.test.mjs"
Task: "Test deduplicateResults in tests/integration/wiki-search.test.mjs"
```

## Parallel Example: Tier-Specific Stories

```bash
# After Foundational completes, launch tier search tests in parallel:
Task: "Test searchKG acceptance scenarios in tests/integration/wiki-search.test.mjs"  # US2
Task: "Test searchSemantic acceptance scenarios in tests/integration/wiki-search.test.mjs"  # US3
Task: "Test searchData acceptance scenarios in tests/integration/wiki-search.test.mjs"  # US4
Task: "Test priority-rules template in tests/integration/wiki-search.test.mjs"  # US5
```

---

## Implementation Strategy

### MVP First (User Story 1 Tests Only)

1. Complete Phase 1: Setup (test file + helpers)
2. Complete Phase 2: Foundational (helper function tests)
3. Complete Phase 4: US2 tests (searchKG) — needed to validate unified search
4. Complete Phase 5: US3 tests (searchSemantic) — needed to validate unified search
5. Complete Phase 6: US4 tests (searchData) — needed to validate unified search
6. Complete Phase 3: US1 tests (unified search orchestration)
7. **STOP and VALIDATE**: Run full test suite — all acceptance scenarios pass

### Incremental Delivery

1. Complete Setup + Foundational → Test infrastructure ready
2. Add US2 tests (searchKG) → Validate tier 1 search works
3. Add US3 tests (searchSemantic) → Validate tier 3 search works
4. Add US4 tests (searchData) → Validate tier 2 search works
5. Add US1 tests (unified search) → Validate cross-tier orchestration
6. Add US5 tests (template) → Validate LLM integration readiness
7. Add edge cases → Hardened against malformed input
8. Add performance tests → 200ms target verified
9. Polish → All quality gates pass

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 2 tests (searchKG)
   - Developer B: User Story 3 tests (searchSemantic)
   - Developer C: User Story 4 tests (searchData)
   - Developer D: User Story 5 tests (template) + Edge Cases
3. After tier tests pass: Developer A writes User Story 1 tests (unified search)
4. All: Performance + Polish

---

## Notes

- [P] tasks = different files/functions, no dependencies
- [Story] label maps task to specific user story for traceability
- All tests target a single file `tests/integration/wiki-search.test.mjs` — parallel tasks within the same file should be sequenced by an implementer
- Core module `src/wiki-search.mjs` is already implemented (556 lines) — these tasks are test-only
- Template `templates/priority-rules.md` is already implemented — US5 tests validate existing content
- Module is stateless and read-only — test setup creates fresh in-memory DB each time
- Helper function tests (Phase 2) test indirectly through public API since helpers are not exported
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
