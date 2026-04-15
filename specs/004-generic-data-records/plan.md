# Implementation Plan: Generic Data Records Table

**Branch**: `004-generic-data-records` | **Date**: 2026-04-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-generic-data-records/spec.md`

## Summary

Replace the four hardcoded data lake tables (`health_metrics`, `activities`, `grades`, `meals`) with a single generic `data_records` table. Provide `insertRecord(recordType, data)` and `queryRecords(recordType, filters)` functions so an AI agent can store any new data type without code changes. Migrate existing data, update FTS5 triggers to index the generic table, switch export/import from four CSV files to a single `data_records.jsonl`, and update all affected tests.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js 18+
**Primary Dependencies**: `better-sqlite3` (SQLite driver), `sqlite-vec` (vector extension), `vitest` (test runner)
**Storage**: SQLite (single file: `jarvis.db`), WAL mode, foreign keys enforced
**Testing**: `vitest run` (unit + integration tests, in-memory SQLite via `:memory:`)
**Target Platform**: Local CLI / Node.js server
**Project Type**: Library + CLI tools
**Performance Goals**: `insertRecord` < 5ms for single insert; `queryRecords` < 10ms for 1000-row table with index hit; migration of 10k rows < 2 seconds
**Constraints**: Single-process SQLite (no concurrent writers); all tests use `:memory:` databases; no external services
**Scale/Scope**: Single developer, ~1200 LOC in `db.mjs`, 13 test files, 8 source modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Code Quality** | ✅ PASS | New functions (`insertRecord`, `queryRecords`, `getAllDataRecords`, `importDataRecord`) will follow existing JSDoc + single-responsibility patterns. 16 legacy functions removed, reducing code duplication. Descriptive naming maintained. |
| **II. Testing Standards** | ✅ PASS | All 9 affected test files will be updated. New test cases for novel `record_type` insertion, JSON field filtering, edge cases (empty type, missing `recorded_at`). No decrease in coverage. |
| **III. User Experience Consistency** | ✅ PASS | Error messages will remain actionable (`"record_type is required"`, `"source_id does not exist"`). CLI export/import interface unchanged (same argument patterns). JSONL output format consistent with existing data_sources/entities/relations exports. |
| **IV. Performance Requirements** | ✅ PASS | Composite index on `data_records(record_type, recorded_at)` ensures query performance. `json_extract()` filters are bounded to top-level keys. Performance targets defined above. |
| **Technology Stack** | ✅ PASS | No new dependencies. Uses existing `better-sqlite3` + SQLite JSON1 extension (built-in). |
| **Development Workflow** | ✅ PASS | Feature branch `004-generic-data-records` already created. Migration follows existing `NNN-name.sql` convention. |

**Gate result: PASS — proceed to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/004-generic-data-records/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── db.mjs               # Database layer — add insertRecord, queryRecords, getAllDataRecords,
│                        #   importDataRecord, update getRecordCounts; remove 16 legacy functions
├── schema.sql           # Remove 4 legacy tables + 12 FTS triggers; add data_records table +
│                        #   index + 3 FTS triggers
├── migrations/
│   └── 001-generic-data-records.sql  # NEW: migrate data + drop legacy tables
├── kb-export.mjs        # Replace 4 CSV exports with single JSONL export
├── kb-import.mjs         # Replace 4 CSV imports with single JSONL import
├── csv.mjs              # Unchanged (may become unused; removal is out of scope)
├── extractor.mjs        # Unchanged
├── fetcher.mjs          # Unchanged
├── ingest.mjs           # Unchanged
└── wiki.mjs             # Unchanged

tests/
├── unit/
│   ├── db.test.mjs           # Update: replace legacy function tests with generic API tests
│   ├── export-import.test.mjs # Update: JSONL instead of CSV for data records
│   ├── migrations.test.mjs    # Update: add migration verification tests
│   └── csv.test.mjs           # Unchanged
└── integration/
    ├── data-lake.test.mjs          # Update: use insertRecord/queryRecords
    ├── export.test.mjs             # Update: verify data_records.jsonl output
    ├── import.test.mjs             # Update: verify JSONL import
    ├── round-trip.test.mjs         # Update: JSONL round-trip
    ├── search.test.mjs             # Update: verify FTS5 indexes data_records
    ├── schema-init.test.mjs        # Update: verify no legacy tables on fresh init
    ├── benchmark.test.mjs          # Update: benchmark generic API
    ├── knowledge-graph.test.mjs    # Likely unchanged (entities/relations only)
    └── quickstart-validation.test.mjs # Update if it references legacy functions
```

**Structure Decision**: Single-project structure (existing). No structural changes needed — all modifications are within existing `src/` and `tests/` directories.

## Complexity Tracking

> No constitution violations. No complexity justifications needed.
