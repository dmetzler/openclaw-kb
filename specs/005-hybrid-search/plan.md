# Implementation Plan: Hybrid 3-Tier Search System

**Branch**: `005-hybrid-search` | **Date**: 2026-04-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-hybrid-search/spec.md`

## Summary

Implement a unified search module (`src/wiki-search.mjs`) that queries all three data tiers of the OpenClaw Knowledge Base — knowledge graph entities (Tier 1), structured data records (Tier 2), and semantic content via FTS5 + vec0 vector similarity (Tier 3) — and returns merged, deduplicated, priority-ranked results through a single API.

The module is a stateless, read-only query layer built on top of the existing `db.mjs` abstraction. It exports four public functions (`search`, `searchKG`, `searchData`, `searchSemantic`) and a companion priority-rules template (`templates/priority-rules.md`) for LLM prompt injection.

**Implementation status**: Core module (`wiki-search.mjs`, 556 lines) and priority-rules template are already implemented. Remaining work is comprehensive test coverage for the `wiki-search.mjs` module, edge-case hardening, and documentation.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js 18+
**Primary Dependencies**: `better-sqlite3` (SQLite driver, via `db.mjs`), `sqlite-vec` (vec0 vector extension, via `db.mjs`), `vitest` 4.1.4 (test runner)
**Storage**: SQLite (`jarvis.db`), WAL mode, foreign keys enforced. FTS5 virtual table (`search_index`) with prefix='2 3'. vec0 virtual table (`vec_embeddings`) with 384-dim cosine distance.
**Testing**: Vitest 4.1.4, 30s timeout, in-memory SQLite per test (`initDatabase(':memory:')`)
**Target Platform**: Node.js 18+ (server/CLI, no browser)
**Project Type**: Library (ES Module with named exports)
**Performance Goals**: Search results within 200ms for 1,000+ entities, 5,000+ data records, 500+ wiki page index entries (SC-003 from spec)
**Constraints**: All DB access through `db.mjs` (no direct `better-sqlite3` imports). Graceful degradation when `sqlite-vec` unavailable. Priority-rules template under 2,000 tokens for LLM system prompts.
**Scale/Scope**: Single module (556 lines), single template file (56 lines), comprehensive test suite targeting 80%+ coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality — ✅ PASS

- **Documentation**: `wiki-search.mjs` has JSDoc on all exported functions and internal helpers with `@param`, `@returns`, and `@example` tags.
- **Single responsibility**: Each function has a clear purpose (tier-specific search or unified merge). Internal helpers are focused (score conversion, validation, deduplication).
- **Dead code**: None detected. All functions and helpers are used.
- **Naming**: Descriptive function names (`bm25ToScore`, `vecDistanceToSimilarity`, `depthToScore`, `deduplicateResults`). No abbreviations.

### II. Testing Standards — ⚠️ PARTIAL (action required)

- **Existing tests**: `tests/integration/search.test.mjs` covers the underlying `db.mjs` search, vector, and FTS5 functions — but does NOT test the `wiki-search.mjs` module itself.
- **Missing**: No dedicated test file for `wiki-search.mjs`. Spec acceptance scenarios (US-1 through US-5) are not covered. Edge cases (empty queries, missing embeddings, special characters, deduplication, tier filtering) untested at the wiki-search layer.
- **Action**: Must create `tests/integration/wiki-search.test.mjs` with full coverage of all 4 exported functions, all acceptance scenarios, and all edge cases listed in spec.

### III. User Experience Consistency — ✅ PASS

- **Error handling**: All search functions return `[]` on invalid input; no thrown errors leak to callers. Warnings via `console.warn` for internal failures.
- **Consistent output format**: All functions return `SearchResult[]` with uniform shape (`id`, `name`, `snippet`, `tier`, `source_table`, `score`, `metadata`).
- **Priority-rules template**: Human-readable Markdown with clear tier hierarchy, conflict resolution rules, and usage guidelines.

### IV. Performance Requirements — ⚠️ PARTIAL (action required)

- **Performance target defined**: SC-003 specifies <200ms for the defined dataset size.
- **Scoring functions**: O(1) transformations (no batch context needed).
- **Potential concern**: `searchData` uses `queryRecords(hit.name, { limit: 1000 })` to look up full record metadata — this could be slow for record types with many entries. Should be replaced with a direct ID lookup or bounded more tightly.
- **Action**: Add performance benchmark test. Profile `searchData` metadata lookup path.

**GATE RESULT: PASS with conditions** — proceed to Phase 0. Must address testing gap (II) and performance profiling (IV) during implementation.

## Project Structure

### Documentation (this feature)

```text
specs/005-hybrid-search/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── wiki-search-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── db.mjs               # Database abstraction layer (35+ exported functions)
├── schema.sql           # SQLite schema (entities, relations, data_records, FTS5, vec0)
├── wiki-search.mjs      # Hybrid 3-tier search module (this feature) — IMPLEMENTED
├── wiki.mjs             # Wiki markdown ↔ database sync
├── ingest.mjs           # Wiki ingestion pipeline
├── kb-import.mjs        # Knowledge base import
├── kb-export.mjs        # Knowledge base export
├── csv.mjs              # CSV utilities
├── fetcher.mjs          # HTTP fetch wrapper
├── extractor.mjs        # Content extraction
└── migrations/
    └── 001-generic-data-records.sql

tests/
├── unit/
│   ├── db.test.mjs
│   ├── csv.test.mjs
│   ├── migrations.test.mjs
│   └── export-import.test.mjs
└── integration/
    ├── search.test.mjs           # Existing: db.mjs search/vector tests
    ├── wiki-search.test.mjs      # NEW: wiki-search.mjs acceptance + edge-case tests
    ├── benchmark.test.mjs        # Existing: performance benchmarks
    ├── data-lake.test.mjs
    ├── export.test.mjs
    ├── import.test.mjs
    ├── round-trip.test.mjs
    ├── schema-init.test.mjs
    └── knowledge-graph.test.mjs

templates/
└── priority-rules.md    # LLM prompt template — IMPLEMENTED
```

**Structure Decision**: Single project layout (flat `src/` directory, `tests/unit/` + `tests/integration/` split). This follows the existing project convention — all source modules are siblings in `src/`, all tests mirror the integration/unit split.

## Complexity Tracking

> No constitution violations. All design decisions align with principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
