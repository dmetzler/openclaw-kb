# Tasks: Hybrid 3-Tier Search System

**Input**: Design documents from `/specs/005-hybrid-search/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/`, `templates/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization — create file skeletons and verify existing `db.mjs` surface

- [X] T001 Create `src/wiki-search.mjs` module skeleton with JSDoc header and all four named exports (`search`, `searchKG`, `searchData`, `searchSemantic`) returning `[]`
- [X] T002 [P] Create `templates/priority-rules.md` placeholder file with feature header
- [X] T003 [P] Verify `db.mjs` exports needed functions (`search`, `findNearestVectors`, `traverseGraph`, `getEntity`, `queryRecords`) by reading the file and confirming their signatures

**Checkpoint**: File structure established, all imports resolvable, module loadable with no-op functions.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Internal helper functions and shared utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement `bm25ToScore(rank)` helper in `src/wiki-search.mjs` — convert FTS5 negative BM25 rank to 0–1 score using hyperbolic saturation `relevance / (1 + relevance)` per R-001 in research.md
- [X] T005 [P] Implement `vecDistanceToSimilarity(distance)` helper in `src/wiki-search.mjs` — convert vec0 cosine distance to 0–1 similarity using `Math.max(0, 1 - distance)` per R-002 in research.md
- [X] T006 [P] Implement `depthToScore(depth)` helper in `src/wiki-search.mjs` — distance-decay scoring for KG traversal (depth 0 → 1.0, depth 1 → 0.6, depth 2+ → 0.3) per R-004 in research.md
- [X] T007 [P] Implement `deduplicateResults(resultsByTier)` helper in `src/wiki-search.mjs` — cross-tier dedup using `Map<string, SearchResult>` keyed by `${source_table}:${source_id}`, process tiers in priority order (1→2→3) per R-005 in research.md
- [X] T008 Implement shared input validation logic in `src/wiki-search.mjs` — query trim + empty check returning `[]`, `maxResults` clamping (≤0 → 20), tier array filtering (keep only 1/2/3), weight clamping to [0,1], per FR-015 and contracts/wiki-search-api.md

**Checkpoint**: All helper functions implemented. Each can be unit-verified independently. Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Unified Search Across All Knowledge Tiers (Priority: P1) 🎯 MVP

**Goal**: A developer can call `search(query, options)` and get merged, deduplicated, priority-ranked results from all three tiers with a single function call.

**Independent Test**: Populate all three tiers with overlapping data (entity "Alice" in KG, data record about "Alice", wiki entry about "Alice"), call `search("Alice")`, verify: (1) results from all tiers appear, (2) KG result ranks highest, (3) no duplicates for the same entity, (4) each result includes tier provenance.

### Implementation for User Story 1

- [X] T009 [US1] Implement `search(query, options)` in `src/wiki-search.mjs` — orchestrate sequential calls to `searchKG`, `searchData`, `searchSemantic` based on `options.tiers` (default `[1,2,3]`), collect per-tier results
- [X] T010 [US1] Wire deduplication and priority ranking into `search()` in `src/wiki-search.mjs` — call `deduplicateResults()` on collected tier results, sort by tier priority then score descending, truncate to `options.maxResults`
- [X] T011 [US1] Implement `includeScores` option stripping in `search()` in `src/wiki-search.mjs` — when `includeScores` is false, remove `score` and `tier` fields from each result before returning
- [X] T012 [US1] Add error handling to `search()` in `src/wiki-search.mjs` — wrap tier calls in try/catch, log via `console.warn`, never throw, return `[]` on total failure per error contract

**Checkpoint**: `search()` fully functional. Calling `search("Node.js")` returns merged, deduplicated, priority-ranked results. MVP scope complete — stop and validate.

---

## Phase 4: User Story 2 — Knowledge Graph Search with Relation Traversal (Priority: P1)

**Goal**: A developer can call `searchKG(query)` to search entities by name/type and discover related entities through bounded graph traversal.

**Independent Test**: Create entities "Alice" → works_at → "Acme Corp" → located_in → "San Francisco", call `searchKG("Acme Corp")`, verify direct match + traversed relations appear with correct depth scores.

### Implementation for User Story 2

- [X] T013 [US2] Implement `searchKG(query)` seed discovery in `src/wiki-search.mjs` — call `db.search(query)` filtering to `source_table = 'entities'` to find initial matching entities
- [X] T014 [US2] Implement graph traversal in `searchKG()` in `src/wiki-search.mjs` — for each seed entity, call `db.traverseGraph(seedId, 2)`, collect all traversed entities with depth and path
- [X] T015 [US2] Implement result building and dedup in `searchKG()` in `src/wiki-search.mjs` — deduplicate traversed entities across seeds by entity `id` (keep smallest depth), score via `depthToScore(depth)`, populate `SearchResult` with tier 1 metadata (`entity_type`, `depth`, `path`, `relation_type`)
- [X] T016 [US2] Fetch full entity metadata in `searchKG()` in `src/wiki-search.mjs` — call `db.getEntity(id)` for each result to populate `name`, `snippet` (metadata excerpt), and `entity_type` in metadata

**Checkpoint**: `searchKG("Acme Corp")` returns the direct entity match (score 1.0) plus related entities via traversal (score 0.6, 0.3) with correct metadata.

---

## Phase 5: User Story 3 — Semantic Search with Weighted FTS5 and Vector Similarity (Priority: P2)

**Goal**: A developer can call `searchSemantic(query, options)` to combine FTS5 keyword matching with vec0 vector similarity using configurable weights.

**Independent Test**: Insert entities with embeddings and FTS5-indexed content, call `searchSemantic("related concept")` with different weight configs, verify ranking changes based on weights and that combined scores are deterministic.

### Implementation for User Story 3

- [X] T017 [US3] Implement FTS5 search path in `searchSemantic()` in `src/wiki-search.mjs` — call `db.search(query)`, normalize ranks via `bm25ToScore(rank)`, build results keyed by `${source_table}:${source_id}`
- [X] T018 [US3] Implement vector search path in `searchSemantic()` in `src/wiki-search.mjs` — when `queryVector` is provided and valid (384-element array), call `db.findNearestVectors(queryVector, maxResults)`, convert distances via `vecDistanceToSimilarity(distance)`
- [X] T019 [US3] Implement weighted score fusion in `searchSemantic()` in `src/wiki-search.mjs` — combine FTS5 and vector scores using configurable weights per R-003, handle graceful degradation (no vector → redistribute weight to FTS, effectiveFtsWeight = 1.0)
- [X] T020 [US3] Implement score filtering and metadata in `searchSemantic()` in `src/wiki-search.mjs` — filter results below `minScore`, populate `metadata.fts_score`, `metadata.vec_score`, `metadata.combined_method` ('fts_only', 'vec_only', 'weighted'), sort by combined score descending, truncate to `maxResults`
- [X] T021 [US3] Add graceful fallback for vec0 failures in `searchSemantic()` in `src/wiki-search.mjs` — wrap `db.findNearestVectors()` in try/catch, on error log via `console.warn` and fall back to FTS-only results

**Checkpoint**: `searchSemantic("AI", { ftsWeight: 0.6, vectorWeight: 0.4, queryVector })` returns combined results with deterministic scores. FTS-only fallback works when no vector provided.

---

## Phase 6: User Story 4 — Data Records Filtered Search (Priority: P2)

**Goal**: A developer can call `searchData(query, recordType)` to search structured data records, optionally filtered by record type.

**Independent Test**: Insert data records of types "health_metric" and "activity", call `searchData("weight", "health_metric")`, verify only health_metric records matching "weight" are returned.

### Implementation for User Story 4

- [X] T022 [US4] Implement `searchData(query, recordType)` in `src/wiki-search.mjs` — call `db.search(query)` filtered to `source_table = 'data_records'`, normalize FTS5 ranks via `bm25ToScore(rank)`
- [X] T023 [US4] Implement record type filtering in `searchData()` in `src/wiki-search.mjs` — when `recordType` is provided, filter FTS5 results to only those where the `name` field (which stores record_type for data records) matches the specified type
- [X] T024 [US4] Implement metadata population in `searchData()` in `src/wiki-search.mjs` — for each result, look up the underlying data record via `db.queryRecords()` to populate `metadata.record_type`, `metadata.recorded_at`, and `metadata.data` payload

**Checkpoint**: `searchData("blood pressure", "health_metric")` returns only matching health_metric records with full metadata.

---

## Phase 7: User Story 5 — Priority Resolution Rules Template for LLM Integration (Priority: P3)

**Goal**: A machine-readable Markdown template at `templates/priority-rules.md` describes the three-tier priority hierarchy for injection into LLM system prompts.

**Independent Test**: Load the template, verify it contains structured rules for all three tiers with explicit precedence, confirm it's under 2,000 tokens.

### Implementation for User Story 5

- [X] T025 [US5] Write `templates/priority-rules.md` with tier hierarchy rules — Tier 1 (Knowledge Graph: verified facts, highest precedence), Tier 2 (Data Lake: structured metrics, medium precedence), Tier 3 (Semantic: contextual content, lowest precedence)
- [X] T026 [US5] Add conflict resolution instructions to `templates/priority-rules.md` — explicit rules for when information conflicts across tiers (prefer higher tier, flag conflict), tier characteristics/strengths/limitations for LLM reasoning context
- [X] T027 [US5] Verify `templates/priority-rules.md` is under 2,000 tokens (approximately 1,500 words / 8,000 characters) for system prompt suitability per SC-006

**Checkpoint**: Template loadable via `readFileSync('templates/priority-rules.md', 'utf-8')` and injectable into LLM prompts with clear priority rules.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final quality improvements affecting the entire module

- [X] T028 Add comprehensive JSDoc to all four exported functions in `src/wiki-search.mjs` — include `@param`, `@returns`, `@throws`, `@example` per plan.md constitution check
- [X] T029 [P] Add inline comments explaining non-obvious scoring logic in `src/wiki-search.mjs` — BM25 normalization formula, distance-decay rationale, weight redistribution on graceful degradation
- [X] T030 Run quickstart.md validation — execute each code example from `specs/005-hybrid-search/quickstart.md` against the implementation and verify expected behavior
- [X] T031 Performance sanity check — verify search functions execute within 200ms target per SC-003 for expected data volumes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phases 3–7)**: All depend on Foundational phase completion
  - US1 (Phase 3) depends on US2+US3+US4 implementations existing (it orchestrates them), so implement US2/US3/US4 first OR implement US1 with stubs then revisit
  - US2, US3, US4 can proceed in parallel (different search tiers, independent logic)
  - US5 is fully independent (template file, no code dependency)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Orchestrates US2, US3, US4 — implement after tier-specific functions exist, or implement calling the stub exports and revisit
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 5 (P3)**: Can start after Setup (Phase 1) — Independent template file, no code dependency

### Within Each User Story

- Models/helpers before services
- Services before endpoints
- Core implementation before integration

### Parallel Opportunities

- T002 and T003 can run in parallel (Phase 1)
- T004, T005, T006, T007 can all run in parallel (Phase 2 — different helper functions)
- US2 (Phase 4), US3 (Phase 5), US4 (Phase 6), US5 (Phase 7) can all run in parallel once Foundational completes
- T028 and T029 can run in parallel (Phase 8)

---

## Parallel Example: Foundational Phase

```bash
# Launch all helper function implementations together:
Task: "Implement bm25ToScore(rank) in src/wiki-search.mjs"
Task: "Implement vecDistanceToSimilarity(distance) in src/wiki-search.mjs"
Task: "Implement depthToScore(depth) in src/wiki-search.mjs"
Task: "Implement deduplicateResults(resultsByTier) in src/wiki-search.mjs"
```

## Parallel Example: Tier-Specific Stories

```bash
# After Foundational completes, launch tier searches in parallel:
Task: "Implement searchKG(query) in src/wiki-search.mjs"        # US2
Task: "Implement searchSemantic(query, options) in src/wiki-search.mjs" # US3
Task: "Implement searchData(query, recordType) in src/wiki-search.mjs"  # US4
Task: "Write templates/priority-rules.md"                        # US5
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 4: User Story 2 (searchKG) — needed by unified search
4. Complete Phase 5: User Story 3 (searchSemantic) — needed by unified search
5. Complete Phase 6: User Story 4 (searchData) — needed by unified search
6. Complete Phase 3: User Story 1 (unified search orchestration)
7. **STOP and VALIDATE**: Test unified search independently
8. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US2 (searchKG) → Test independently → Knowledge graph search works
3. Add US3 (searchSemantic) → Test independently → Semantic search works
4. Add US4 (searchData) → Test independently → Data search works
5. Add US1 (search) → Test independently → Unified search works (MVP!)
6. Add US5 (template) → LLM integration ready
7. Polish → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 2 (searchKG)
   - Developer B: User Story 3 (searchSemantic)
   - Developer C: User Story 4 (searchData)
   - Developer D: User Story 5 (template)
3. After tier functions exist: Developer A implements User Story 1 (unified search)
4. All: Polish phase

---

## Notes

- [P] tasks = different files/functions, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable (except US1 which orchestrates others)
- No test tasks generated — tests not explicitly requested in spec
- All code in a single file `src/wiki-search.mjs` — parallel tasks within same file should be sequenced by an implementer
- Module is stateless and read-only — no data writes, no side effects
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
