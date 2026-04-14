# Implementation Plan: Wiki Structure, Templates & Ingestion Pipeline

**Branch**: `002-wiki-ingestion-pipeline` | **Date**: 2026-04-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-wiki-ingestion-pipeline/spec.md`

## Summary

Build a wiki directory structure (`wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, `wiki/comparisons/`) with Obsidian-compatible Markdown pages using YAML frontmatter and wikilinks, a `raw/` directory for immutable source archival, and an ingestion pipeline that accepts URLs or raw text, extracts entities/concepts/facts via a provider-agnostic LLM interface, creates or updates wiki pages and SQLite Knowledge Graph entities (via `db.mjs` from spec 001), and maintains an auto-generated index (`wiki/index.md`) and append-only operation log (`wiki/log.md`).

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js 18+
**Primary Dependencies**:
- `better-sqlite3` + `sqlite-vec` (from spec 001 — KG entity/relation CRUD)
- `gray-matter` (YAML frontmatter parse/stringify in Markdown files)
- `@mozilla/readability` + `jsdom` (URL content extraction)
- `turndown` + `turndown-plugin-gfm` (HTML → Markdown conversion)
- `zod` (LLM extraction output schema validation)
**Storage**: SQLite (`jarvis.db` via `db.mjs`), Markdown files on disk (`wiki/`, `raw/`)
**Testing**: `vitest` (matching spec 001 conventions)
**Target Platform**: Linux/macOS local development (CLI / programmatic usage)
**Project Type**: Library (ES modules consumed by CLI or other components)
**Performance Goals**:
- Single URL ingestion (fetch + extract + LLM + write): <60s end-to-end (LLM latency dominates)
- Wiki index regeneration: <500ms for 1,000 pages
- File name collision check: <100ms for 1,000 pages
- Frontmatter parse/stringify roundtrip: <10ms per page
**Constraints**: LLM calls are the bottleneck — pipeline must handle LLM timeouts/errors gracefully. File system operations must be atomic where possible (write to temp, rename). No HTML in wiki pages. All file names OS-safe and Google Drive-compatible.
**Scale/Scope**: Single developer, 100–10,000 wiki pages, 100–50,000 raw sources

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Code Quality | ✅ PASS | All public functions will have JSDoc documentation. Single-responsibility modules: `ingest.mjs` (pipeline orchestration), `wiki.mjs` (page CRUD + index), `fetcher.mjs` (URL fetch + extract), `extractor.mjs` (LLM interface). No dead code — greenfield modules building on spec 001. Descriptive naming throughout. |
| II. Testing Standards | ✅ PASS | Vitest test suite with fixture-based tests (mock HTML, mock LLM responses). Integration tests for full pipeline flow with mocked LLM. Deterministic — LLM is injected as a function, mocked in tests. Target 80%+ coverage. Test names describe scenarios per spec acceptance criteria. |
| III. User Experience Consistency | ✅ PASS | CLI commands will follow consistent patterns (matching spec 001). Error messages are actionable: "Failed to fetch URL: HTTP 404" not raw stack traces. Pipeline returns structured results indicating success/failure per page. Log entries use consistent format. |
| IV. Performance Requirements | ✅ PASS | Performance targets defined above. Index regeneration uses file system scan (no database needed). File name collision check scans wiki directories. Frontmatter operations use `gray-matter` (proven fast). LLM timeout configurable. |
| Technology Stack | ✅ PASS | All dependencies justified: `gray-matter` (only library with parse+stringify roundtrip, 4.7M weekly downloads, MIT), `@mozilla/readability` (industry standard, MIT, used by Firefox), `jsdom` (20M weekly downloads, MIT), `turndown` (proven HTML→MD converter, MIT), `zod` (industry-standard schema validation, MIT). No lighter alternatives exist for any of these. |
| Development Workflow | ✅ PASS | Feature branch `002-wiki-ingestion-pipeline`. All changes via PR. Conventional commits. |

**Gate result: PASS — no violations. Proceeding to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/002-wiki-ingestion-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── pipeline-api.md  # Public API contract for ingest.mjs + wiki.mjs
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── db.mjs               # (spec 001) Database abstraction — KG entity/relation CRUD
├── schema.sql           # (spec 001) Database schema
├── migrations/          # (spec 001) SQL migrations
├── ingest.mjs           # Pipeline orchestrator: URL/text → raw → extract → pages → index/log
├── wiki.mjs             # Wiki page CRUD: create/update/read pages, regenerate index, append log
├── fetcher.mjs          # URL fetch + HTML→Markdown extraction (Readability + Turndown)
└── extractor.mjs        # LLM extraction interface: raw text → structured entities/concepts/facts

tests/
├── unit/
│   ├── wiki.test.mjs        # Wiki page CRUD, frontmatter, naming, collision detection
│   ├── fetcher.test.mjs     # URL fetch error handling, HTML→MD conversion
│   └── extractor.test.mjs   # LLM extraction output parsing, schema validation
└── integration/
    ├── ingest-url.test.mjs       # Full pipeline: URL → raw → pages → KG → index/log
    ├── ingest-text.test.mjs      # Full pipeline: text → raw → pages → KG → index/log
    └── wiki-obsidian.test.mjs    # Obsidian compatibility: frontmatter, wikilinks, file names

wiki/                    # Generated output (Obsidian-compatible vault subfolder)
├── entities/            # Entity pages
├── concepts/            # Concept pages
├── topics/              # Topic pages
├── comparisons/         # Comparison pages
├── index.md             # Auto-generated catalog
└── log.md               # Append-only operation log

raw/                     # Immutable source archive
└── YYYY-MM-DD-slug.md   # Archived raw sources with provenance frontmatter
```

**Structure Decision**: Single project layout (extending spec 001). Four new source modules in `src/` following the established single-module-per-concern pattern. Wiki and raw directories are generated output at the repository root. Tests mirror the module structure with unit tests per module and integration tests per user story.

## Post-Design Constitution Re-check

*Re-evaluation after Phase 1 design artifacts (data-model.md, contracts/, quickstart.md) are complete.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Code Quality | ✅ PASS | API contracts define clear JSDoc signatures for all 14 public functions across 4 modules. Single-responsibility maintained: `fetcher.mjs` (fetch+convert), `extractor.mjs` (LLM+validate), `wiki.mjs` (page CRUD+index+log), `ingest.mjs` (orchestration). No dead code — every function maps to a spec requirement. |
| II. Testing Standards | ✅ PASS | Contracts specify throwable errors and return types, enabling deterministic test assertions. `LLMProvider` interface enables mock injection. `ExtractionResultSchema` (zod) exported for test validation. Test file layout defined in plan.md project structure. |
| III. User Experience Consistency | ✅ PASS | Error messages are actionable per contract: `"Fetch failed: HTTP 404"`, `"Extraction failed after 3 attempts: ..."`. Partial failures reported in return values (`pagesFailed`), not thrown. Quickstart demonstrates all usage patterns. |
| IV. Performance Requirements | ✅ PASS | No design decisions conflict with performance targets. Index regeneration is a simple directory scan. File collision check scans 4 directories. `gray-matter` parse/stringify is <10ms. LLM timeout is configurable via `fetchTimeout` option. |
| Technology Stack | ✅ PASS | All dependencies confirmed in contracts: `gray-matter`, `@mozilla/readability`, `jsdom`, `turndown`, `turndown-plugin-gfm`, `zod`. No new dependencies added beyond those justified in research.md. |
| Development Workflow | ✅ PASS | Feature branch `002-wiki-ingestion-pipeline`. All design artifacts committed. |

**Post-design gate result: PASS — no violations detected.**

## Complexity Tracking

> No constitution violations — no entries needed.
