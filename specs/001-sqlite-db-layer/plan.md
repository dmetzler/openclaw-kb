# Implementation Plan: SQLite Unified Schema & Database Abstraction Layer

**Branch**: `001-sqlite-db-layer` | **Date**: 2026-04-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-sqlite-db-layer/spec.md`

## Summary

Build a single-file SQLite database (`jarvis.db`) with three logical tiers — knowledge graph (entities + relations with recursive CTE traversal), data lake (health_metrics, activities, grades, meals, data_sources), and search infrastructure (FTS5 standalone full-text index + sqlite-vec vec0 embeddings table with 384-dimension cosine similarity). Expose all operations through a `db.mjs` ES module abstraction using `better-sqlite3` as the synchronous driver. Include `schema.sql` for initial schema, a `migrations/` directory with transactional numbered migration execution, and automatic FTS5 sync via database triggers on all source tables.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js 18+
**Primary Dependencies**: `better-sqlite3` (SQLite driver), `sqlite-vec` (vec0 vector extension)
**Storage**: SQLite (single file: `jarvis.db`), WAL mode, foreign keys enforced
**Testing**: `vitest` (ES module native, fast, watch mode)
**Target Platform**: Linux/macOS local development (single-process access)
**Project Type**: Library (ES module consumed by other OpenClaw components)
**Performance Goals**:
- Recursive graph traversal: <500ms for 1,000+ entities / 5,000+ relations
- Full-text search: <100ms for 10,000+ indexed records
- Vector KNN search: <200ms for 10,000+ embeddings
**Constraints**: Single-process writes (WAL for read concurrency), no ORM, synchronous API (intentional)
**Scale/Scope**: Single developer, 10,000–100,000 records across all tables

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Code Quality | ✅ PASS | All public functions in db.mjs will have JSDoc documentation. Single-responsibility: each function maps to one database operation. No dead code — greenfield project. Descriptive naming throughout. |
| II. Testing Standards | ✅ PASS | Vitest test suite with isolated in-memory databases per test. Integration tests for cross-tier queries (FTS sync, graph traversal). Deterministic — no external services. Target 80%+ coverage. |
| III. User Experience Consistency | ✅ PASS | db.mjs exposes a consistent API — all functions return plain objects, errors are descriptive with context (not raw SQL errors). Migration failures report file name + error message. |
| IV. Performance Requirements | ✅ PASS | Performance targets defined above (SC-002 through SC-004). WAL mode + indices for query performance. Schema design includes all necessary indexes. Benchmarks will be included in test suite for critical paths. |
| Technology Stack | ✅ PASS | better-sqlite3 is well-maintained (MIT), sqlite-vec is purpose-built by asg017 (MIT/Apache-2.0). Both evaluated for maintenance status and license compatibility. Dependencies justified — no lighter alternative exists. |
| Development Workflow | ✅ PASS | Feature branch `001-sqlite-db-layer`. All changes via PR. Conventional commits. |

**Gate result: PASS — no violations. Proceeding to Phase 0.**

### Post-Design Gate (Phase 1 Re-evaluation)

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Code Quality | ✅ PASS | Full API contract documented in contracts/db-api.md — every function has signature, params, returns, throws. Data model fully specified in data-model.md with validation rules, indexes, and triggers. |
| II. Testing Standards | ✅ PASS | Test structure finalized: 2 unit + 4 integration test files mapped to acceptance scenarios. In-memory databases for isolation. Performance benchmarks for SC-002/003/004. |
| III. User Experience Consistency | ✅ PASS | Error handling contract defined: all errors throw with descriptive messages. Return value contract: plain objects, parsed JSON, ISO 8601 timestamps. Consistent filter shapes across all data lake queries. |
| IV. Performance Requirements | ✅ PASS | Schema includes all indexes per data-model.md. WAL + synchronous=NORMAL. FTS5 prefix indexing for autocomplete. Pagination via limit/offset. busy_timeout=5000. |
| Technology Stack | ✅ PASS | No additional dependencies introduced during design phase. |

**Post-design gate result: PASS — no new violations.**

## Project Structure

### Documentation (this feature)

```text
specs/001-sqlite-db-layer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── db-api.md        # Public API contract for db.mjs
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── db.mjs               # Database abstraction module (sole entry point)
├── schema.sql            # Complete initial schema (all 3 tiers)
└── migrations/           # Numbered SQL migration files
    └── .gitkeep

tests/
├── unit/
│   ├── db.test.mjs       # Unit tests for db.mjs public API
│   └── migrations.test.mjs # Migration system tests
└── integration/
    ├── knowledge-graph.test.mjs  # Graph CRUD + recursive traversal
    ├── data-lake.test.mjs        # Data lake CRUD + filtering
    ├── search.test.mjs           # FTS5 + vector search
    └── schema-init.test.mjs      # Schema initialization + WAL/FK setup
```

**Structure Decision**: Single project layout (no frontend/backend split). This is a library module — `src/db.mjs` is the sole artifact consumed by the broader OpenClaw application. Tests mirror the three-tier architecture for clear coverage mapping.

## Complexity Tracking

> No constitution violations — no entries needed.
