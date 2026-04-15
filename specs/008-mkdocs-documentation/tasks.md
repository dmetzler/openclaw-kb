# Tasks: MkDocs Documentation Site

**Input**: Design documents from `/specs/008-mkdocs-documentation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: No test tasks included (not requested in feature specification). Validation is via `mkdocs build --strict`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, MkDocs toolchain, and directory structure

- [X] T001 Create `requirements-docs.txt` at project root with pinned dependencies: `mkdocs>=1.6,<2.0`, `mkdocs-material~=9.7`, `mkdocs-minify-plugin~=0.8`
- [X] T002 Create `mkdocs.yml` at project root with Material theme configuration: site metadata, theme settings (palette with light/dark toggle, `navigation.tabs`, `navigation.indexes`, `navigation.instant`, `navigation.top`), plugins (search, minify), markdown extensions (admonition, pymdownx.details, pymdownx.highlight with line numbers, pymdownx.inlinehilite, pymdownx.superfences with Mermaid custom fence, pymdownx.tabbed with alternate, pymdownx.tasklist, attr_list, md_in_html, toc with permalink), and full nav tree covering all 5 sections
- [X] T003 [P] Create `docs/` directory structure with empty placeholder `index.md` files for all sections: `docs/index.md`, `docs/user-guide/`, `docs/developer-guide/`, `docs/api-reference/`, `docs/contributing/`
- [X] T004 [P] Add `"docs:serve": "mkdocs serve"` and `"docs:build": "mkdocs build --strict"` scripts to `package.json`
- [X] T005 [P] Add `site/` to `.gitignore` (MkDocs build output directory)

**Checkpoint**: Running `pip install -r requirements-docs.txt && mkdocs serve` should launch an empty docs site with correct nav structure and Material theme.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational phase needed. This feature produces only static Markdown files and configuration. All user stories write to independent files and can proceed directly after setup.

**Note**: Phase 1 (Setup) is the only blocker. Once `mkdocs.yml` and the directory structure exist, all user stories can proceed in parallel.

---

## Phase 3: User Story 1 - New User Discovers the Project (Priority: P1) MVP

**Goal**: A developer or AI agent builder can visit the docs site, understand what OpenClaw KB does, see the architecture, and follow a quick-start to get a working database.

**Independent Test**: Open `http://127.0.0.1:8000/`, read the home page, verify the 3-tier architecture Mermaid diagram renders, and follow quick-install commands to create a `jarvis.db`.

### Implementation for User Story 1

- [X] T006 [US1] Write home page in `docs/index.md` with: project overview paragraph, 3-tier architecture Mermaid diagram (KG, Data Lake, Semantic Index), feature highlights list, quick-install section (clone, pip install, npm install, node src/db.mjs verify), and links to each documentation section

**Checkpoint**: Home page renders with Mermaid diagram. A new user can follow quick-install to get a working `jarvis.db`.

---

## Phase 4: User Story 2 - Agent Builder Integrates the KB (Priority: P1)

**Goal**: A user can follow step-by-step guides to install the KB skill, configure a database, ingest articles, search across all tiers, manage wiki pages via Obsidian, and export/import data.

**Independent Test**: Follow each user guide page in sequence: install skill, configure DB, ingest a URL, perform a search, browse wiki in Obsidian, run export, run import.

### Implementation for User Story 2

- [X] T007 [P] [US2] Write skill installation guide in `docs/user-guide/installation.md` covering: prerequisites (Node.js 18+, Python 3.x for docs), cloning the repo, installing npm dependencies, database initialization, configuring custom DB path, and verifying the installation
- [X] T008 [P] [US2] Write article ingestion guide in `docs/user-guide/ingestion.md` covering: how `node src/ingest.mjs <url>` works end-to-end (fetch, extract, archive, wiki page creation, KG population), supported source formats, batch ingestion, and troubleshooting common errors
- [X] T009 [P] [US2] Write 3-tier search guide in `docs/user-guide/search.md` covering: what the 3 tiers are (Knowledge Graph for facts, Data Lake for metrics/records, Semantic Index for discovery), when to use each tier, CLI search usage, search options, and interpreting results with scores
- [X] T010 [P] [US2] Write wiki management guide in `docs/user-guide/wiki.md` covering: wiki directory structure (`wiki/` with entity pages), Obsidian integration (vault setup pointing to `wiki/`), page format (frontmatter fields, Markdown body), creating/editing pages, and wiki-lint conventions
- [X] T011 [P] [US2] Write export/import guide in `docs/user-guide/export-import.md` covering: `node src/kb-export.mjs` (output directory structure, 6 JSONL/JSON files with example payloads), `node src/kb-import.mjs` (import from export directory), backup strategy, and data portability
- [X] T012 [P] [US2] Write Google Drive sync guide in `docs/user-guide/gdrive-sync.md` covering: rclone installation and configuration, syncing `wiki/` to Google Drive, bidirectional sync caveats, automation with cron, and conflict resolution

**Checkpoint**: A user can follow the complete user guide from installation through export/import without consulting source code.

---

## Phase 5: User Story 3 - Developer Understands the Architecture (Priority: P2)

**Goal**: A contributor or maintainer can understand the internal architecture, trace a URL through the ingestion pipeline, understand how search scoring works, and know how to extend the data lake.

**Independent Test**: After reading the developer guide, a developer can answer: "How does a URL become a wiki page?" and "How does the search system rank results across tiers?"

### Implementation for User Story 3

- [X] T013 [P] [US3] Write architecture deep-dive in `docs/developer-guide/architecture.md` covering: SQLite unified schema overview (Mermaid ER diagram), 3-tier data model explanation, module dependency graph (Mermaid), data flow from ingestion to search, and design decisions (why SQLite, why single-file DB, why FTS5 + vec0)
- [X] T014 [P] [US3] Write ingestion pipeline internals in `docs/developer-guide/ingestion-pipeline.md` covering: step-by-step pipeline flow (Mermaid sequence diagram), fetcher.mjs role (HTTP fetch, Readability extraction), extractor.mjs role (entity extraction, relation discovery), ingest.mjs orchestration, wiki page creation/update logic, and KG population
- [X] T015 [P] [US3] Write search internals in `docs/developer-guide/search-internals.md` covering: BM25 normalization formula, vector distance-to-similarity conversion, graph depth scoring algorithm, weighted fusion with redistribution, tier priority and deduplication strategy, and tuning parameters
- [X] T016 [P] [US3] Write wiki structure conventions in `docs/developer-guide/wiki-structure.md` covering: directory layout (`wiki/` structure), page naming conventions, frontmatter schema, Markdown body conventions, wiki-lint rules (planned from spec 007), and Obsidian compatibility notes
- [X] T017 [P] [US3] Write data lake & record types in `docs/developer-guide/data-lake.md` covering: `records` table schema, built-in record types (article, metric, event, etc.), `insertRecord()` usage for custom types, querying records, and adding new record types without schema changes
- [X] T018 [P] [US3] Write KG migration guide in `docs/developer-guide/kg-migration.md` covering: what `kg-migrate.mjs` does, migrating from `kg-store.json` to SQLite, entity and relation mapping, running the migration, and verifying results
- [X] T019 [P] [US3] Write schema migrations guide in `docs/developer-guide/writing-migrations.md` covering: when migrations are needed, migration file conventions, using `db.mjs` migration helpers, testing migrations, and rollback strategy

**Checkpoint**: A developer reading the full developer guide can trace data flow from URL ingestion through search results and knows how to extend the system.

---

## Phase 6: User Story 4 - Developer Looks Up API Signatures (Priority: P2)

**Goal**: A developer can look up any exported function's signature, parameters, return type, and usage example across all 10 source modules.

**Independent Test**: Look up `createEntity` in the API reference — find its full signature, parameter types with defaults, return type, validation rules, and a code example.

### Implementation for User Story 4

- [X] T020 [P] [US4] Write API reference index in `docs/api-reference/index.md` with module overview table (module name, file path, description, exported function count) for all 10 source modules
- [X] T021 [P] [US4] Write `db.mjs` API reference in `docs/api-reference/db.md` documenting all 35+ exported functions grouped by domain: Lifecycle (`getDb`, `closeDb`), Entities (`createEntity`, `getEntity`, `updateEntity`, `deleteEntity`, `listEntities`), Relations (`createRelation`, `getRelations`, `deleteRelation`), Search & Traversal (`searchEntities`, `traverseGraph`), Embeddings (`upsertEmbedding`, `searchEmbeddings`), Data Sources & Records (`insertRecord`, `getRecords`, `createDataSource`), Bulk Import, Statistics, Transactions. Each function: signature, parameters table, return type, example
- [X] T022 [P] [US4] Write `wiki-search.mjs` API reference in `docs/api-reference/wiki-search.md` documenting the `search` function: options object schema, tier selection, deduplication behavior, result format, and usage example
- [X] T023 [P] [US4] Write `wiki.mjs` API reference in `docs/api-reference/wiki.md` documenting exported functions for wiki page CRUD, frontmatter parsing, and page listing
- [X] T024 [P] [US4] Write `ingest.mjs` API reference in `docs/api-reference/ingest.md` documenting the ingestion orchestrator: main entry point, options, pipeline stages, and usage example
- [X] T025 [P] [US4] Write `extractor.mjs` API reference in `docs/api-reference/extractor.md` documenting entity/relation extraction functions, input/output formats, and usage examples
- [X] T026 [P] [US4] Write `fetcher.mjs` API reference in `docs/api-reference/fetcher.md` documenting URL fetching, Readability extraction, content cleaning functions, and usage examples
- [X] T027 [P] [US4] Write `kb-export.mjs` API reference in `docs/api-reference/kb-export.md` documenting `exportDatabase`: output directory structure, all 6 file formats (JSONL/JSON), CLI usage, and programmatic API
- [X] T028 [P] [US4] Write `kb-import.mjs` API reference in `docs/api-reference/kb-import.md` documenting import functions: input directory structure, validation, conflict handling, CLI usage, and programmatic API
- [X] T029 [P] [US4] Write `kg-migrate.mjs` API reference in `docs/api-reference/kg-migrate.md` documenting migration functions: input format (`kg-store.json`), entity/relation mapping, CLI usage, and verification
- [X] T030 [P] [US4] Write `csv.mjs` API reference in `docs/api-reference/csv.md` documenting CSV parsing/generation functions, field mapping, and usage examples

**Checkpoint**: Every exported function across all 10 modules is documented with signature, parameters, return type, and example.

---

## Phase 7: User Story 5 - Contributor Learns How to Contribute (Priority: P3)

**Goal**: A new contributor knows coding standards, testing requirements, branch strategy, and how to submit changes.

**Independent Test**: After reading the contributing guide, a contributor knows: which linting rules apply, how to run tests (`npm test`), what commit message format to use, and how to submit a PR.

### Implementation for User Story 5

- [X] T031 [US5] Write contributing guide in `docs/contributing/index.md` covering: coding standards (from constitution.md — ES Modules, no TypeScript, Vitest for tests), testing requirements (`npm test` / `vitest run`), branch strategy and naming conventions, commit message format, PR workflow and review process, documentation update requirements (API changes must update docs), and development environment setup

**Checkpoint**: A new contributor can read the guide and successfully submit a well-formed PR.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation, final adjustments, and cross-story consistency

- [X] T032 Validate all internal cross-references between documentation pages (links from user guide to API reference, from developer guide to source modules, from home page to all sections)
- [X] T033 Run `mkdocs build --strict` and fix any warnings or errors (broken links, missing pages, invalid config)
- [X] T034 [P] Verify Mermaid diagrams render correctly on home page (architecture) and developer guide pages (ER diagram, sequence diagram, module graph)
- [X] T035 [P] Verify dark/light theme toggle works and all pages are readable in both modes
- [X] T036 [P] Verify search functionality indexes all pages and returns relevant results (test searching for function names like `createEntity`, `search`, `exportDatabase`)
- [X] T037 Run quickstart.md validation: follow the steps in `specs/008-mkdocs-documentation/quickstart.md` end-to-end to confirm the setup and verification instructions work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: N/A - no foundational phase needed for static docs
- **User Story 1 (Phase 3)**: Depends on Phase 1 (needs `mkdocs.yml` and `docs/` structure)
- **User Story 2 (Phase 4)**: Depends on Phase 1 only - can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Phase 1 only - can run in parallel with US1, US2
- **User Story 4 (Phase 6)**: Depends on Phase 1 only - can run in parallel with US1, US2, US3
- **User Story 5 (Phase 7)**: Depends on Phase 1 only - can run in parallel with all other stories
- **Polish (Phase 8)**: Depends on ALL user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - just `docs/index.md`
- **User Story 2 (P1)**: Independent - writes to `docs/user-guide/*.md`
- **User Story 3 (P2)**: Independent - writes to `docs/developer-guide/*.md`
- **User Story 4 (P2)**: Independent - writes to `docs/api-reference/*.md`
- **User Story 5 (P3)**: Independent - writes to `docs/contributing/index.md`

All user stories write to different directories and have zero cross-dependencies.

### Within Each User Story

- All pages within a story are independent files and can be written in parallel
- No model-before-service ordering needed (all tasks are Markdown content creation)

### Parallel Opportunities

- T003, T004, T005 can run in parallel (Phase 1)
- ALL tasks within each user story phase are marked [P] and can run in parallel
- ALL user story phases (3-7) can run in parallel after Phase 1 completes
- Maximum parallelism: up to 25 tasks can theoretically run simultaneously after Phase 1

---

## Parallel Example: User Story 2 (User Guide)

```bash
# All 6 user guide pages can be written in parallel:
Task: "Write installation guide in docs/user-guide/installation.md"
Task: "Write ingestion guide in docs/user-guide/ingestion.md"
Task: "Write search guide in docs/user-guide/search.md"
Task: "Write wiki guide in docs/user-guide/wiki.md"
Task: "Write export/import guide in docs/user-guide/export-import.md"
Task: "Write gdrive sync guide in docs/user-guide/gdrive-sync.md"
```

## Parallel Example: User Story 4 (API Reference)

```bash
# All 11 API reference pages can be written in parallel:
Task: "Write API reference index in docs/api-reference/index.md"
Task: "Write db.mjs API reference in docs/api-reference/db.md"
Task: "Write wiki-search.mjs API reference in docs/api-reference/wiki-search.md"
# ... (8 more module pages)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 3: User Story 1 (T006)
3. **STOP and VALIDATE**: Run `mkdocs build --strict`, verify home page renders with Mermaid diagram
4. A new user can already understand the project and get started

### Incremental Delivery

1. Setup (Phase 1) -> Foundation ready
2. User Story 1 (Home page) -> Project is discoverable (MVP!)
3. User Story 2 (User Guide) -> Users can self-serve
4. User Story 3 (Developer Guide) -> Contributors can understand internals
5. User Story 4 (API Reference) -> Developers can code against the KB
6. User Story 5 (Contributing) -> Community can contribute
7. Polish (Phase 8) -> Cross-references validated, build clean

### Parallel Team Strategy

With multiple developers:

1. One developer completes Setup (Phase 1)
2. Once setup is done, all 5 user stories can be assigned to different developers
3. Each developer writes their section independently (different directories)
4. Final polish phase validates cross-references once all content exists

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story writes to its own `docs/` subdirectory - zero conflicts
- No test tasks included (validation is `mkdocs build --strict`)
- API reference content must be sourced by reading the actual `src/*.mjs` files
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
