# Tasks: Wiki Structure, Templates & Ingestion Pipeline

**Input**: Design documents from `/specs/002-wiki-ingestion-pipeline/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/pipeline-api.md ✅, quickstart.md ✅

**Tests**: Not explicitly requested — test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create project scaffolding

- [X] T001 Install new dependencies: `npm install gray-matter @mozilla/readability jsdom turndown turndown-plugin-gfm zod`
- [X] T002 [P] Create wiki directory structure: `wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, `wiki/comparisons/` with `.gitkeep` files
- [X] T003 [P] Create raw directory: `raw/` with `.gitkeep` file
- [X] T004 [P] Create empty source module files: `src/fetcher.mjs`, `src/extractor.mjs`, `src/wiki.mjs`, `src/ingest.mjs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and the provider-agnostic LLM interface that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Implement `slugify(name)` function in `src/wiki.mjs` — lowercase, spaces to hyphens, strip non-alphanumeric (except hyphens), collapse consecutive hyphens, trim leading/trailing hyphens, truncate at 80 chars with 6-char MD5 hash suffix per FR-016 and R4 algorithm
- [X] T006 Implement raw source file naming helper in `src/wiki.mjs` — `YYYY-MM-DD-slugified-title.md` format with numeric suffix for same-day duplicates per R6 algorithm
- [X] T007 Implement `fetchUrl(url, options?)` in `src/fetcher.mjs` — native `fetch()` with `AbortSignal.timeout()`, Content-Type check (only `text/html` and `application/xhtml+xml`), `jsdom` + `Readability` extraction with `isProbablyReaderable()` pre-check, `VirtualConsole` to suppress noise, `turndown` + GFM plugin for HTML→Markdown, return `FetchResult` per contract, throw descriptive errors per contract error table
- [X] T008 Implement `extract(text, llm, options?)` in `src/extractor.mjs` — define and export `ExtractionResultSchema` (zod) with `ExtractedEntitySchema` and `ExtractedRelationSchema` per R3 schemas, build system prompt with JSON schema example, parse JSON from LLM response (handle markdown fences and preamble), validate with zod, retry with error feedback (max 2 retries), deduplicate entities by normalized name, throw per contract error table
- [X] T009 Implement `LLMProvider` typedef JSDoc in `src/extractor.mjs` — `@typedef {Object} LLMProvider` with `complete(systemPrompt, userPrompt) => Promise<string>` per contract

**Checkpoint**: Foundation ready — `slugify`, `rawFileName`, `fetchUrl`, `extract`, and `LLMProvider` interface are all available for user story implementation

---

## Phase 3: User Story 1 — Ingest a URL and Generate Wiki Pages (Priority: P1) 🎯 MVP

**Goal**: Operator provides a URL → system fetches, archives raw, extracts via LLM, creates/updates wiki pages + KG entities, updates index and log

**Independent Test**: Provide a URL (or mock content), run the pipeline, verify raw source archived, wiki pages created with correct frontmatter and wikilinks, KG entities in SQLite, index and log updated

### Implementation for User Story 1

- [X] T010 [US1] Implement `createPage(entity, rawFileName, options?)` in `src/wiki.mjs` — create subdirectory if needed (FR-017), check all wiki subdirectories for file name collision (FR-006), disambiguate with type suffix if needed, generate YAML frontmatter per data-model schema (id, type, created, updated, sources, confidence, related, kg_id) using `gray-matter` with `JSON_SCHEMA` engine and `lineWidth: -1` per R2, generate Markdown body with Obsidian wikilinks (FR-004), no HTML (FR-005), create KG entity via `db.mjs`, return `{ fileName, filePath, kgId }` per contract
- [X] T011 [US1] Implement `updatePage(fileName, newEntity, rawFileName, options?)` in `src/wiki.mjs` — find existing page, parse frontmatter with `gray-matter`, update `updated` timestamp, extend `sources` list (union), update `confidence` (weighted average), merge `related` (union), append new content to body (append-with-dedup per R5), update KG entity via `db.mjs`, write back with `matter.stringify()`, return per contract
- [X] T012 [US1] Implement `readPage(fileName, options?)` in `src/wiki.mjs` — search all wiki subdirectories for file, parse with `gray-matter` using `JSON_SCHEMA` engine, return `{ data, content, filePath }` or `null` per contract
- [X] T013 [US1] Implement `findPage(entityName, options?)` in `src/wiki.mjs` — slugify entity name, scan all four wiki subdirectories for matching file, return `{ fileName, filePath, type }` or `null` per contract
- [X] T014 [US1] Implement `appendLog(entry, options?)` in `src/wiki.mjs` — create `wiki/log.md` with header if not exists, format log entry with timestamp, source type, source, raw file, pages created/updated/failed, optional note per data-model log format, append to end of file (FR-008)
- [X] T015 [US1] Implement `regenerateIndex(options?)` in `src/wiki.mjs` — scan all four wiki subdirectories, read frontmatter of each page for title, group by type (Entities, Concepts, Topics, Comparisons), sort alphabetically within each group, generate `wiki/index.md` with wikilinks per data-model index format, return `{ pageCount, filePath }` per contract
- [X] T016 [US1] Implement raw source archival helper in `src/ingest.mjs` — create `raw/` dir if needed, write Markdown file with YAML frontmatter (title, source URL, date, author if available, tags) per data-model raw source schema, use raw file naming helper from T006
- [X] T017 [US1] Implement `ingestUrl(url, llm, options?)` in `src/ingest.mjs` — validate URL (HTTP/HTTPS), call `fetchUrl` from `src/fetcher.mjs`, archive raw source (T016), call `extract` from `src/extractor.mjs`, for each extracted entity call `findPage` then `createPage` or `updatePage`, create KG relations via `db.mjs`, call `regenerateIndex`, call `appendLog`, handle partial failures (FR-019), handle LLM failure with raw archive + log (FR-018), handle duplicate URLs (FR-014 — new raw file, merge pages), return `IngestResult` per contract, throw on fetch failure (FR-015)

**Checkpoint**: User Story 1 fully functional — URL ingestion end-to-end with raw archival, wiki pages, KG sync, index, and log

---

## Phase 4: User Story 2 — Ingest Raw Text Content (Priority: P1)

**Goal**: Operator provides text content directly → system archives raw, extracts via LLM, creates/updates wiki pages + KG entities, updates index and log

**Independent Test**: Provide a text string with title, run the pipeline, verify raw archival with `source: "manual"`, page creation, KG updates, index/log updates

### Implementation for User Story 2

- [X] T018 [US2] Implement `ingestText(title, text, llm, options?)` in `src/ingest.mjs` — validate title and text (non-empty strings), archive raw source with `source: "manual"` in frontmatter, call `extract` from `src/extractor.mjs`, for each extracted entity call `findPage` then `createPage` or `updatePage`, create KG relations via `db.mjs`, call `regenerateIndex`, call `appendLog` with `sourceType: "text"`, handle partial failures, return `IngestResult` per contract

**Checkpoint**: User Stories 1 AND 2 fully functional — both URL and text ingestion produce identical wiki/KG/index/log outputs

---

## Phase 5: User Story 3 — Browse the Wiki in Obsidian (Priority: P2)

**Goal**: Wiki pages open and render correctly in Obsidian — frontmatter displayed in Properties panel, wikilinks resolve, graph view works, pure Markdown

**Independent Test**: Generate sample wiki pages, verify frontmatter is valid YAML starting on line 1, wikilinks use `[[name|Display]]` format, no HTML in body, file names are OS-safe and Google Drive-compatible

### Implementation for User Story 3

- [X] T019 [US3] Validate Obsidian compatibility in `src/wiki.mjs` `createPage` and `updatePage` — ensure frontmatter starts on line 1 (no leading whitespace), no nested properties in frontmatter, dates are quoted strings (not JS Date objects), wikilinks in `related` are quoted, lists use block style (`- item`), no HTML in body content (FR-005), file names are OS-safe and Google Drive-compatible (no `:*?"<>|\` characters per FR-016)

**Checkpoint**: All wiki pages pass Obsidian compatibility checks — correct frontmatter format, valid wikilinks, pure Markdown, safe file names

---

## Phase 6: User Story 4 — Consult the Wiki Index (Priority: P2)

**Goal**: `wiki/index.md` is a complete, auto-generated catalog of all pages grouped by type with wikilinks

**Independent Test**: Create several wiki pages across different subdirectories, regenerate the index, verify all pages listed with correct groupings and wikilinks

### Implementation for User Story 4

_(Index generation already implemented in T015 as part of US1. This phase validates index completeness.)_

- [X] T020 [US4] Ensure `regenerateIndex` in `src/wiki.mjs` handles edge cases — empty subdirectories produce empty sections (not omitted), pages with missing/malformed frontmatter are listed with file name as fallback title, index includes "Auto-generated. Do not edit manually." note per data-model format

**Checkpoint**: Index accurately reflects 100% of wiki pages across all subdirectories

---

## Phase 7: User Story 5 — Review the Operation Log (Priority: P3)

**Goal**: `wiki/log.md` provides a complete append-only chronological record of all ingestion operations

**Independent Test**: Run multiple ingestion operations, verify log entries appear in chronological order with correct details

### Implementation for User Story 5

_(Log appending already implemented in T014 as part of US1. This phase validates log completeness.)_

- [X] T021 [US5] Ensure `appendLog` in `src/wiki.mjs` handles all log scenarios — partial failures noted with which items failed (FR-019), empty extractions noted with "No entities extracted" message (FR-018), URL and text ingestion entries distinguished, previous entries preserved on append (FR-008)

**Checkpoint**: Log contains complete, ordered, append-only record of every ingestion operation

---

## Phase 8: User Story 6 — Ensure File Name Uniqueness Across Wiki (Priority: P2)

**Goal**: No two wiki pages across any subdirectory share the same file name — collisions are detected and resolved

**Independent Test**: Attempt to create two pages with the same name in different subdirectories, verify the second gets a disambiguated name with type suffix

### Implementation for User Story 6

_(Collision detection already implemented in T010 as part of US1. This phase validates collision handling.)_

- [X] T022 [US6] Ensure collision resolution in `src/wiki.mjs` `createPage` handles all scenarios — type suffix appended correctly (e.g., `python-concept.md`), all wikilinks in the new page and index use the disambiguated name, collision check scans all four subdirectories (not just the target), disambiguated name still follows FR-016 naming rules

**Checkpoint**: File name uniqueness guaranteed across all wiki subdirectories

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, robustness, and documentation

- [X] T023 [P] Add JSDoc documentation to all public functions in `src/fetcher.mjs`, `src/extractor.mjs`, `src/wiki.mjs`, `src/ingest.mjs` per API contract signatures
- [X] T024 [P] Handle edge case: wiki directory does not exist on first run — `ingestUrl` and `ingestText` must create `wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, `wiki/comparisons/`, and `raw/` directories automatically (FR-017)
- [X] T025 [P] Handle edge case: `wiki/index.md` or `wiki/log.md` manually deleted — `regenerateIndex` recreates index from scratch, `appendLog` recreates log with header before appending
- [X] T026 [P] Handle edge case: YAML frontmatter with special characters in titles — ensure `gray-matter` with `JSON_SCHEMA` engine handles quoting correctly, test with titles containing colons, quotes, brackets
- [X] T027 Run quickstart.md validation — execute all code examples from `specs/002-wiki-ingestion-pipeline/quickstart.md` with a mock LLM provider and verify expected outputs

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (Phase 2) — MVP target
- **US2 (Phase 4)**: Depends on US1 (Phase 3) — reuses `ingest.mjs` patterns, adds `ingestText`
- **US3 (Phase 5)**: Can start after Foundational (Phase 2) — validates output format only
- **US4 (Phase 6)**: Can start after US1 (Phase 3) — validates index generation
- **US5 (Phase 7)**: Can start after US1 (Phase 3) — validates log generation
- **US6 (Phase 8)**: Can start after US1 (Phase 3) — validates collision detection
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no other story dependencies
- **US2 (P1)**: Depends on US1 (reuses `ingest.mjs` infrastructure from T016/T017)
- **US3 (P2)**: Independent of other stories — validates format compliance
- **US4 (P2)**: Independent — validates index (implemented in US1)
- **US5 (P3)**: Independent — validates log (implemented in US1)
- **US6 (P2)**: Independent — validates collision handling (implemented in US1)

### Within Each Phase

- Foundational: T005–T006 (wiki utilities) before T007–T009 (module implementations) — but T007, T008, T009 are independent and can run in parallel
- US1: T010–T015 (wiki.mjs functions) before T016 (raw archival) before T017 (pipeline orchestrator)
- US2: Single task (T018) depends on US1 infrastructure

### Parallel Opportunities

- Setup: T002, T003, T004 are all independent — run in parallel
- Foundational: T007, T008, T009 operate on different files — run in parallel (after T005, T006)
- US1: T010, T011, T012, T013 operate on different functions in the same file — can be implemented in sequence but reviewed independently
- US3, US4, US5, US6: After US1 completes, these four phases can run in parallel
- Polish: T023, T024, T025, T026 are all independent — run in parallel

---

## Parallel Example: Foundational Phase

```bash
# After T005 (slugify) and T006 (raw file naming) are done:
Task: "Implement fetchUrl in src/fetcher.mjs"       # T007
Task: "Implement extract in src/extractor.mjs"       # T008
Task: "Implement LLMProvider typedef in src/extractor.mjs"  # T009
# All three operate on different files — no conflicts
```

## Parallel Example: Post-US1 Validation

```bash
# After US1 (Phase 3) is complete:
Task: "Validate Obsidian compatibility (US3)"        # T019
Task: "Validate index edge cases (US4)"              # T020
Task: "Validate log scenarios (US5)"                 # T021
Task: "Validate collision resolution (US6)"          # T022
# All four validate different aspects — no conflicts
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (URL ingestion end-to-end)
4. Complete Phase 4: User Story 2 (text ingestion)
5. **STOP and VALIDATE**: Test both ingestion paths independently
6. Deploy/demo if ready — the core pipeline works

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test URL ingestion → **MVP!**
3. Add US2 → Test text ingestion → Both paths work
4. Add US3 + US4 + US5 + US6 → Validate all quality/format requirements → Full feature
5. Polish → JSDoc, edge cases, quickstart validation → Production-ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Developer A: US1 (core pipeline) → US2 (text ingestion)
3. Developer B (after US1): US3 + US4 + US5 + US6 (validation phases) in parallel
4. Team: Polish phase together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US3–US6 are primarily validation/hardening of functionality built in US1 — they add edge case handling and format compliance, not new modules
