# Tasks: Document Ingestion Pipeline with Semantic Chunking & Embeddings

**Input**: Design documents from `/specs/009-doc-ingestion-pipeline/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are included as the spec explicitly defines testing standards (≥80% coverage, unit + integration tests).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, test fixtures, and Python helper script

- [X] T001 Create SQL migration file `src/migrations/002-chunks-and-embeddings.sql` with chunks table, vec_chunks vec0 virtual table (768-dim cosine), and FTS5 triggers (INSERT/UPDATE/DELETE) for chunks → search_index synchronization, per data-model.md
- [X] T002 [P] Create Python helper script `src/scripts/convert_and_chunk.py` that accepts a file path as CLI arg, converts via docling `DocumentConverter`, chunks via `HierarchicalChunker` with `contextualize()`, and outputs JSON to stdout: `{ "markdown": "...", "chunks": [{ "text": "...", "headings": [...], "contextualized": "..." }] }`
- [X] T003 [P] Create test fixtures: `tests/fixtures/sample.pdf` (multi-page PDF with headings, tables, paragraphs), `tests/fixtures/sample.docx` (DOCX with sections), `tests/fixtures/sample.md` (Markdown with h1/h2/h3 headings and paragraphs)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented — database layer for chunks and embedder module

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Extend `src/db.mjs` — add `CHUNK_EMBEDDING_DIMENSIONS = 768` constant; add migration runner support for `002-chunks-and-embeddings.sql`; add `insertChunk(entityId, chunkIndex, content, metadata)` returning chunk ID; add `getChunks(entityId)` returning chunks ordered by chunk_index ASC; add `deleteChunksForEntity(entityId)` returning count deleted; add `upsertChunkEmbedding(chunkId, vector)` with dimension validation (must be 768); add `findNearestChunks(queryVector, k=20)` for KNN search on vec_chunks; add `getChunkWithEntity(chunkId)` joining chunk with parent entity
- [X] T005 [P] Create `src/embedder.mjs` — implement `embed(text)` (adds `search_query:` prefix, calls Ollama `POST /api/embed`, returns Float32Array(768) or null); `embedDocument(text)` (adds `search_document:` prefix); `embedBatch(texts)` (batch API call with `search_document:` prefix per text); `isOllamaAvailable()` (cached 30s). Configure via env vars: OLLAMA_URL, OLLAMA_MODEL, OLLAMA_EMBED_DIMENSIONS, OLLAMA_TIMEOUT_MS. Graceful degradation: return null on ECONNREFUSED/timeout, log warning, never throw for unavailability. Throw on 404 (model not pulled) with actionable message.
- [X] T006 [P] Create `src/chunker.mjs` — implement `chunkMarkdown(markdown, options?)` that splits on heading boundaries (h1/h2/h3), splits oversized sections on paragraph boundaries if >maxTokens (default 500), merges undersized chunks if <minTokens (default 50), returns `Array<{text, metadata: {source, section, index, tokenCount}}>`. Implement `estimateTokens(text)` as `Math.ceil(text.split(/\s+/).filter(Boolean).length / 0.75)`.
- [X] T007 [P] Create `src/converter.mjs` — implement `detectFormat(filePath)` returning format string based on extension; `isDoclingAvailable()` caching result; `convertDocument(filePath, options?)` that validates file exists, detects format, invokes `python3 src/scripts/convert_and_chunk.py` via `child_process.spawn` for PDF/DOCX/PPTX/images (with PYTHONUNBUFFERED=1, configurable timeout via DOCLING_TIMEOUT_MS default 120000ms), reads JSON from stdout, returns `{markdown, chunks, source}`. For .md/.txt files, reads content directly and returns `{markdown, chunks: null, source}`. All error cases per contracts: file not found, unsupported format, Python not found, docling not installed, conversion error, timeout.

### Tests for Foundational Phase

- [X] T008 [P] Create unit tests `tests/unit/chunks-db.test.mjs` — test insertChunk (returns ID, content stored), getChunks (ordered by chunk_index), deleteChunksForEntity (returns count, cascades), upsertChunkEmbedding (768-dim validation, reject wrong dimension), findNearestChunks (KNN results), getChunkWithEntity (joined result). Use in-memory SQLite with migration applied.
- [X] T009 [P] Create unit tests `tests/unit/embedder.test.mjs` — mock Ollama HTTP responses; test embed() adds `search_query:` prefix; embedDocument() adds `search_document:` prefix; embedBatch() sends array input; returns Float32Array(768); returns null on ECONNREFUSED; throws on 404 with actionable message; isOllamaAvailable() caching behavior; timeout handling.
- [X] T010 [P] Create unit tests `tests/unit/chunker.test.mjs` — test chunkMarkdown splits on headings; preserves heading hierarchy in metadata; splits oversized sections on paragraph boundaries; merges undersized chunks; assigns sequential indices; estimateTokens calculation; handles empty input; handles no-heading content; handles deeply nested headings.
- [X] T011 [P] Create unit tests `tests/unit/converter.test.mjs` — test detectFormat for all extensions (.pdf, .docx, .pptx, .png, .jpg, .jpeg, .tiff, .md, .txt); unsupported extension throws; convertDocument pass-through for .md/.txt; mock subprocess for docling conversion; file not found error; timeout error; Python not found error; docling not installed error.

**Checkpoint**: Foundation ready — chunk DB operations, embedder, chunker, and converter all unit-tested. User story implementation can now begin.

---

## Phase 3: User Story 1 — Ingest a Local Document File (Priority: P1) 🎯 MVP

**Goal**: An operator provides a file path (PDF, DOCX, PPTX, image) and the system converts, chunks, embeds, extracts entities, creates wiki pages and KG entities, and stores everything in the database.

**Independent Test**: Provide a multi-page PDF, run `ingestFile()`, verify: Markdown preserves structure, chunks created with metadata, embeddings stored (768-dim), wiki pages created, KG entities exist, chunks are queryable.

### Implementation for User Story 1

- [X] T012 [US1] Create `src/ingest-file.mjs` — implement `ingestFile(filePath, llm, options?)` orchestrator: validate file exists + format supported → `converter.convertDocument()` → archive raw content to `raw/` → `extractor.extract(markdown, llm)` for entity extraction → create/update wiki pages → create/update KG entities and relations → `deleteChunksForEntity()` for re-ingestion → create chunks (use docling chunks if available via `converter.chunks`, else `chunker.chunkMarkdown()`) → `insertChunk()` per chunk → `embedder.embedBatch()` → `upsertChunkEmbedding()` per chunk (graceful if Ollama unavailable) → return `IngestResult` per contracts/module-apis.md. Support `options.skipEmbedding` and `options.verbose` (progress output).

### Tests for User Story 1

- [X] T013 [P] [US1] Create integration test `tests/integration/ingest-file.test.mjs` — test full pipeline: ingestFile with sample.md fixture (no docling needed) → verify entities created, chunks stored, embeddings stored (mock Ollama), wiki pages created, FTS5 index entries exist for chunks. Test re-ingestion replaces chunks atomically. Test with skipEmbedding option. Test error cases: file not found, unsupported format.

**Checkpoint**: User Story 1 is fully functional — local documents can be ingested end-to-end.

---

## Phase 4: User Story 2 — Search by Semantic Similarity at Chunk Level (Priority: P1)

**Goal**: Semantic search embeds the query via Ollama, performs KNN against chunk embeddings, and returns relevant chunks with parent entity context.

**Independent Test**: Ingest a document with distinct sections on different topics, search for a topic in one section, verify returned chunks come from that section.

### Implementation for User Story 2

- [X] T014 [US2] Update `src/wiki-search.mjs` — modify `searchSemantic(query, options)` to: call `embedder.embed(query)` internally when `queryVector` not provided (backward compat); search `vec_chunks` via `db.findNearestChunks()` instead of `db.findNearestVectors()`; return chunk-level results with `{id, name, type, score, source, chunk: {id, text, section, chunkIndex}}` per contracts; fall back to FTS5-only if Ollama unavailable (FR-016); interleave results by relevance across entities (not grouped by entity).

### Tests for User Story 2

- [X] T015 [P] [US2] Create integration test `tests/integration/chunk-search.test.mjs` — seed database with chunks and embeddings for multiple entities on different topics; test searchSemantic returns chunks ranked by similarity; results include parent entity context; results interleaved by relevance not grouped by entity; test fallback to FTS5 when Ollama unavailable (mock ECONNREFUSED); test backward compat with explicit queryVector option.

**Checkpoint**: Chunk-level semantic search works independently.

---

## Phase 5: User Story 3 — Enhanced URL Ingestion with Chunking and Embeddings (Priority: P1)

**Goal**: Existing `ingestUrl` now also chunks the content and generates embeddings, non-breaking enhancement.

**Independent Test**: Ingest a URL, verify all existing outputs still created, plus chunks and embeddings now exist.

### Implementation for User Story 3

- [X] T016 [US3] Extend `src/ingest.mjs` — after entity creation in `ingestUrl()`, add chunking stage: call `chunker.chunkMarkdown(content, {source: url})` (heading-boundary since readability, not docling); `deleteChunksForEntity()` for re-ingestion; `insertChunk()` per chunk; `embedder.embedBatch()` → `upsertChunkEmbedding()` per chunk (graceful if Ollama unavailable). Return enhanced result with `chunks: {total, embedded}`. Ensure all existing behavior (raw file, wiki pages, KG entities, index, log) is unchanged.

### Tests for User Story 3

- [ ] T017 [P] [US3] Create integration test `tests/integration/url-chunking.test.mjs` — test ingestUrl produces all existing outputs plus chunk records and embeddings (mock HTTP fetch + mock Ollama); test chunks use heading-boundary method (not HierarchicalChunker); test re-ingestion replaces chunks; test graceful degradation when Ollama unavailable (chunks stored, no embeddings, no error).

**Checkpoint**: URL ingestion enhanced with chunking — no existing behavior broken.

---

## Phase 6: User Story 4 — Backfill Embeddings for Existing Wiki Pages (Priority: P2)

**Goal**: CLI script processes existing wiki pages lacking chunks, generates chunks and embeddings.

**Independent Test**: Create wiki pages without chunks, run backfill, verify all have chunks and embeddings, and appear in search results.

### Implementation for User Story 4

- [ ] T018 [US4] Create `src/backfill.mjs` — implement `backfillWikiPages(options?)` per contracts: validate Ollama reachable (exit with error if not, FR-020); scan `wiki/` directory for `.md` files; for each, check if entity has chunks (skip if yes); read Markdown content; `chunker.chunkMarkdown()`; `insertChunk()` per chunk; `embedder.embedBatch()` → `upsertChunkEmbedding()` per chunk; report progress `"Processing 5/42: wiki/entities/python.md"`. Support `--db`, `--wiki`, `--dry-run`, `--verbose` CLI flags. Support programmatic usage via exported function. Return `{processed, skipped, failed, total}`.

### Tests for User Story 4

- [ ] T019 [P] [US4] Create integration test `tests/integration/backfill.test.mjs` — create temporary wiki directory with sample .md files; seed database with entities (some with chunks, some without); test backfill processes only pages without chunks; test skip behavior for already-chunked pages; test progress reporting; test dry-run creates no database changes; test Ollama unavailable exits with error (mock ECONNREFUSED).

**Checkpoint**: Backfill script works for existing wiki content.

---

## Phase 7: User Story 5 — Full-Text Search Covers Chunk Content (Priority: P2)

**Goal**: Chunk text content is indexed in FTS5 so keyword search covers chunk-level content.

**Independent Test**: Ingest a document with a unique phrase in a chunk, search by keyword, verify the chunk appears in FTS5 results.

### Implementation for User Story 5

- [X] T020 [US5] Verify FTS5 trigger integration — the triggers created in T001 (migration 002) handle INSERT/UPDATE/DELETE sync to search_index. Verify by running the migration and confirming: inserting a chunk auto-creates search_index entry with `source_table='chunks'`; updating a chunk updates the FTS entry; deleting a chunk removes the FTS entry. If any trigger behavior is incorrect, fix the migration SQL.

### Tests for User Story 5

- [X] T021 [P] [US5] Add FTS5 chunk test cases to `tests/unit/chunks-db.test.mjs` — verify: insertChunk creates search_index entry (query FTS5 table); chunk content is searchable via FTS5 MATCH; deleteChunksForEntity cascades to search_index removal; search for unique phrase in chunk content returns the chunk's source_id.

**Checkpoint**: FTS5 search now covers chunk content in addition to entity metadata.

---

## Phase 8: User Story 6 — Pass-Through for Plain Markdown and Text (Priority: P3)

**Goal**: .md and .txt files skip docling conversion, go directly to chunking and embedding.

**Independent Test**: Provide a `.md` file, run `ingestFile`, verify no docling invocation, chunking and embedding proceed normally.

### Implementation for User Story 6

- [X] T022 [US6] Verify pass-through behavior in `src/converter.mjs` — the converter (created in T007) already handles .md/.txt as pass-through (reads file content directly, returns `chunks: null`, chunker.chunkMarkdown handles splitting). Verify by testing: `.md` file → no subprocess spawn, content returned directly; `.txt` file → same. If any behavior is missing, add it.

### Tests for User Story 6

- [X] T023 [P] [US6] Add pass-through test cases to `tests/unit/converter.test.mjs` and `tests/integration/ingest-file.test.mjs` — verify .md file is not sent to docling; .txt file is not sent to docling; both produce valid chunks and embeddings after full pipeline; paragraph-boundary chunking works for .txt content.

**Checkpoint**: All file types (PDF, DOCX, PPTX, images, Markdown, text) handled by the pipeline.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, error handling robustness, documentation

- [ ] T024 [P] Handle edge cases across the pipeline: empty/whitespace-only documents (zero chunks scenario); corrupted/encrypted PDFs (docling error handling); Ollama returns wrong embedding dimensions (validation in embedder); partial embedding failure (some chunks embedded, others not — store what succeeds); very large documents (100+ pages, thousands of chunks — sequential processing, no OOM)
- [ ] T025 [P] Validate `specs/009-doc-ingestion-pipeline/quickstart.md` end-to-end — run each code example in quickstart.md and verify it works: ingestFile, ingestUrl with chunks, searchSemantic chunk-level results, backfill script CLI and programmatic usage
- [ ] T026 Run full test suite (`npx vitest run`) and verify ≥80% line coverage for new files; fix any failing tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (migration must exist before db functions reference it)
- **User Stories (Phases 3–8)**: All depend on Phase 2 completion
  - US1 (Phase 3), US2 (Phase 4), US3 (Phase 5) are P1 — do in order: US1 first (produces chunks for US2/US3 to consume)
  - US4 (Phase 6), US5 (Phase 7) are P2 — can start after US1 is complete
  - US6 (Phase 8) is P3 — can start after Phase 2
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 only — core pipeline, no other story deps
- **User Story 2 (P1)**: Depends on Phase 2 + chunks existing in DB (best tested after US1 creates data)
- **User Story 3 (P1)**: Depends on Phase 2 only — extends existing ingestUrl independently
- **User Story 4 (P2)**: Depends on Phase 2 + embedder + chunker — independent of US1/US2/US3
- **User Story 5 (P2)**: Depends on Phase 1 (migration triggers) — verification task, mostly independent
- **User Story 6 (P3)**: Depends on Phase 2 (converter pass-through) — verification task, mostly independent

### Within Each User Story

- Implementation before integration tests
- Core logic before error handling
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel
- **Phase 2**: T005, T006, T007 can all run in parallel (independent modules). T004 (db.mjs) is independent of T005-T007 but tests (T008-T011) depend on their respective modules.
- **Phase 2 Tests**: T008, T009, T010, T011 can all run in parallel (different test files)
- **After Phase 2**: US3 (ingestUrl extension) and US4 (backfill) can run in parallel with US1
- **US5 and US6**: Verification tasks, can run in parallel with other stories

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all foundational modules in parallel:
Task: "Extend src/db.mjs with chunk CRUD and vec_chunks search functions"
Task: "Create src/embedder.mjs with Ollama embedding client"
Task: "Create src/chunker.mjs with heading-boundary chunker"
Task: "Create src/converter.mjs with docling subprocess wrapper"

# Then launch all unit tests in parallel:
Task: "Create tests/unit/chunks-db.test.mjs"
Task: "Create tests/unit/embedder.test.mjs"
Task: "Create tests/unit/chunker.test.mjs"
Task: "Create tests/unit/converter.test.mjs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migration, Python script, fixtures)
2. Complete Phase 2: Foundational (db functions, embedder, chunker, converter + unit tests)
3. Complete Phase 3: User Story 1 (ingestFile orchestrator + integration test)
4. **STOP and VALIDATE**: Test `ingestFile` with a real PDF end-to-end
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Add US1 → Test ingestFile → **MVP milestone**
3. Add US2 → Test chunk-level search → Search enhanced
4. Add US3 → Test enhanced ingestUrl → Full pipeline unified
5. Add US4 → Test backfill → Existing content searchable
6. Add US5 → Verify FTS5 coverage → Keyword search complete
7. Add US6 → Verify pass-through → All formats covered
8. Polish → Edge cases, quickstart validation → Ship

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The Python helper script (T002) is only needed for docling conversion — URL/Markdown/text ingestion works without it
- Two embedding dimensions coexist: 384-dim (existing vec_embeddings) and 768-dim (new vec_chunks) — intentional per plan.md
