# Implementation Plan: Data Schema Registry

**Branch**: `010-data-schema-registry` | **Date**: 2026-04-15 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/010-data-schema-registry/spec.md`

## Summary

Add a schema registry to the OpenClaw Knowledge Base data lake that stores JSON Schema definitions for each `record_type`, enables schema discovery by AI agents, validates data on insertion, pre-registers schemas for the six known data types, auto-generates Obsidian wiki pages, and provides a CLI for schema management. Uses `ajv` + `ajv-formats` for JSON Schema validation, stored in a new `data_schemas` SQLite table.

## Technical Context

**Language/Version**: JavaScript (ES Modules, `.mjs`), Node.js 18+  
**Primary Dependencies**: `better-sqlite3` (existing), `sqlite-vec` (existing), `ajv` + `ajv-formats` (new)  
**Storage**: SQLite (`jarvis.db`), WAL mode, foreign keys enforced  
**Testing**: `vitest` 4.1.4, in-memory SQLite databases  
**Target Platform**: Local Node.js CLI / programmatic API  
**Project Type**: CLI + library  
**Performance Goals**: Schema lookup < 1ms, validation < 5ms, insertRecord overhead < 10ms  
**Constraints**: Single-threaded SQLite writes, ~10-20 schemas max  
**Scale/Scope**: 6 pre-registered schemas, extensible to ~50 max

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | All new functions documented with JSDoc. Single-responsibility: registry functions separate from CLI. No dead code. Explicit naming. |
| II. Testing Standards | ✅ PASS | Unit tests for all registry functions + validation + CLI. Deterministic (in-memory DB). Descriptive test names. Coverage target 80%+. |
| III. User Experience Consistency | ✅ PASS | CLI follows existing patterns (kb-export.mjs, kb-import.mjs). Exit codes 0/1/2. Actionable error messages. Help text provided. |
| IV. Performance Requirements | ✅ PASS | Performance targets defined (R6). All operations O(1) on trivially small table. Ajv compiles schemas. No N+1 patterns. |
| Technology Stack | ✅ PASS | ajv + ajv-formats: well-maintained (80M+ weekly downloads), MIT license, no known vulnerabilities. Justified by JSON Schema portability requirement. |
| Development Workflow | ✅ PASS | Feature branch, conventional commits with `--no-gpg-sign`. |

## Project Structure

### Documentation (this feature)

```text
specs/010-data-schema-registry/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output — technology decisions
├── data-model.md        # Phase 1 output — entity definitions
├── contracts/
│   └── api-contracts.md # Phase 1 output — API contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── db.mjs                              # Modified: add schema registry functions, modify insertRecord()
├── schema-registry.mjs                 # New: CLI wrapper + wiki generation
├── migrations/
│   └── 003-data-schema-registry.sql    # New: data_schemas table DDL

tests/unit/
├── schema-registry.test.mjs           # New: unit tests for schema registry

wiki/schemas/                           # New: auto-generated schema wiki pages
├── health-metric.md
├── activity.md
├── grade.md
├── meal.md
├── sleep.md
└── finance.md
```

**Structure Decision**: Single-project layout following existing conventions. New code goes in `src/`, new tests in `tests/unit/`, new wiki pages in `wiki/schemas/`. No new directories beyond `wiki/schemas/`.

## Complexity Tracking

No constitution violations. No complexity justifications needed.

## Implementation Phases

### Phase 1: Foundation (Migration + Core Functions)
1. Install `ajv` + `ajv-formats`
2. Create migration `003-data-schema-registry.sql` (data_schemas table + updated_at trigger)
3. Add `registerSchema()`, `getSchema()`, `listSchemas()`, `validateRecord()` to `db.mjs`
4. Add `_seedSchemas()` to `db.mjs` (called after migrations in `initDatabase()`)
5. Modify `insertRecord()` to validate against schema when one exists

### Phase 2: Wiki Generation + CLI
6. Add `generateSchemaWikiPage()` function in `schema-registry.mjs`
7. Wire wiki generation into `registerSchema()` 
8. Build CLI in `schema-registry.mjs` (list, get, register, validate commands)

### Phase 3: Tests + Polish
9. Write comprehensive unit tests in `tests/unit/schema-registry.test.mjs`
10. Verify all pre-registered schemas generate valid wiki pages
11. Run full test suite, fix any issues

## References

- **Spec**: [spec.md](spec.md)
- **Research**: [research.md](research.md)
- **Data Model**: [data-model.md](data-model.md)
- **API Contracts**: [contracts/api-contracts.md](contracts/api-contracts.md)
- **Existing patterns**: `src/db.mjs` (function patterns), `src/kb-export.mjs` (CLI pattern), `src/wiki.mjs` (wiki generation)
