# Implementation Plan: Knowledge Base Export & Import

**Branch**: `003-kb-export-import` | **Date**: 2026-04-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-kb-export-import/spec.md`

## Summary

Build two Node.js ES module scripts — `kb-export.mjs` and `kb-import.mjs` — that serialize the entire SQLite knowledge base to portable flat files (JSONL for structured data, CSV for tabular data) and restore them into a fresh database. The export produces deterministic, line-sorted output suitable for Git version control. The import recreates the full schema via `initDatabase()`, inserts data in dependency order, and relies on existing triggers/extensions for FTS5 and vec0 population. A round-trip test (export → import → re-export) must produce byte-identical output, proving zero data loss.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js 18+
**Primary Dependencies**: `better-sqlite3` (via `db.mjs`), `sqlite-vec` (via `db.mjs`), Node.js built-ins (`fs`, `path`, `readline`)
**Storage**: SQLite (`jarvis.db` via `db.mjs`), flat files on disk (JSONL, CSV, JSON)
**Testing**: `vitest` (existing test framework)
**Target Platform**: Linux/macOS local development (CLI scripts)
**Project Type**: CLI utilities (two standalone scripts consuming the `db.mjs` library)
**Performance Goals**:
- Export 10,000+ records across all tables: <30 seconds (SC-001)
- Import 10,000+ records with full index rebuild: <60 seconds (SC-002)
**Constraints**: No new dependencies — use only Node.js built-ins for file I/O and CSV generation. All database access through `db.mjs` abstraction. Deterministic output ordering (by primary key ASC) for Git diff friendliness and round-trip identity.
**Scale/Scope**: Single developer, knowledge bases with 10,000–100,000 records

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Code Quality | ✅ PASS | Two focused scripts, each with a single responsibility (export or import). All functions will have JSDoc documentation. Helper functions extracted for CSV/JSONL serialization. No dead code — greenfield addition. |
| II. Testing Standards | ✅ PASS | Unit tests for CSV/JSONL serialization helpers. Integration tests for export, import, and round-trip. Deterministic tests using in-memory or temp databases. Acceptance scenarios from spec mapped to test cases. |
| III. User Experience Consistency | ✅ PASS | CLI argument patterns match existing scripts (`node src/kb-export.mjs <dir>`). Progress feedback on stdout indicating which table is being processed. Actionable error messages for missing files, malformed data, schema version mismatch. |
| IV. Performance Requirements | ✅ PASS | Performance targets defined (SC-001: <30s export, SC-002: <60s import for 10K+ records). Streaming line-by-line reads for import to avoid unbounded memory. Direct SQL queries with ORDER BY for export (no in-memory sorting). |
| Technology Stack | ✅ PASS | No new dependencies. Uses only Node.js built-ins (`fs`, `path`, `readline`) plus existing `db.mjs`. No third-party CSV libraries — RFC 4180 is simple enough for hand-rolled serialization with the flat column structures in this schema. |
| Development Workflow | ✅ PASS | Feature branch `003-kb-export-import`. All changes via PR. Conventional commits. |

**Gate result: PASS — no violations. Proceeding to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/003-kb-export-import/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── cli-api.md       # CLI interface contract for both scripts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── db.mjs               # Existing — database abstraction (spec 001)
├── schema.sql            # Existing — full schema
├── migrations/           # Existing — migration directory
├── kb-export.mjs         # NEW — export script
├── kb-import.mjs         # NEW — import script
└── csv.mjs              # NEW — CSV serialization/parsing helpers (RFC 4180)

tests/
├── unit/
│   ├── csv.test.mjs              # NEW — CSV helper unit tests
│   └── export-import.test.mjs    # NEW — serialization/parsing unit tests
└── integration/
    ├── export.test.mjs           # NEW — full export integration tests
    ├── import.test.mjs           # NEW — full import integration tests
    └── round-trip.test.mjs       # NEW — export→import→re-export identity tests
```

**Structure Decision**: Single project layout, consistent with spec 001. New scripts live in `src/` alongside `db.mjs`. CSV helpers extracted to `csv.mjs` for testability and reuse. Tests split into unit (serialization logic) and integration (full database round-trips).

### Post-Design Gate (Phase 1 Re-evaluation)

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Code Quality | ✅ PASS | Full CLI contract documented in contracts/cli-api.md — every function has signature, params, returns, throws, exit codes. Data model fully specified in data-model.md with file formats, serialization rules, and validation. csv.mjs extracted for single-responsibility CSV handling. |
| II. Testing Standards | ✅ PASS | Test structure finalized: 2 unit test files (csv.test.mjs, export-import.test.mjs) + 3 integration test files (export, import, round-trip). Deterministic temp databases. Acceptance scenarios from spec directly mapped. Round-trip byte-identity as the definitive correctness proof. |
| III. User Experience Consistency | ✅ PASS | CLI argument pattern, progress output format, and error messages fully specified in contracts/cli-api.md. Distinct exit codes for each failure class. Messages are actionable with suggested fixes. |
| IV. Performance Requirements | ✅ PASS | Export uses direct SQL with ORDER BY (no in-memory sorting). Import uses single transaction (efficient WAL writes). No unbounded in-memory growth — streaming reads for CSV/JSONL. Targets: <30s export, <60s import for 10K+ records. |
| Technology Stack | ✅ PASS | No new dependencies introduced during design phase. db.mjs additions use existing `better-sqlite3` patterns. CSV helper is pure JavaScript with no external imports. |

**Post-design gate result: PASS — no new violations.**

## Complexity Tracking

> No constitution violations — no entries needed.
