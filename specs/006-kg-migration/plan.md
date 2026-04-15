# Implementation Plan: KG Migration Tool

**Branch**: `006-kg-migration` | **Date**: 2026-04-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-kg-migration/spec.md`

## Summary

One-shot CLI migration script (`src/kg-migrate.mjs`) that reads an OpenClaw `kg-store.json` knowledge graph file and imports all entities and relations into the project's SQLite database (`jarvis.db`) via the existing `db.mjs` API. The script maps legacy string-keyed entities to SQLite integer IDs, flattens legacy `attrs` into metadata, supports `--dry-run` for validation without writes, is idempotent (skips duplicates by name+type match), and prints a summary report on completion.

## Technical Context

**Language/Version**: JavaScript (ES Modules, `.mjs`), Node.js 18+
**Primary Dependencies**: `better-sqlite3` (via `db.mjs`), `sqlite-vec` (via `db.mjs`), Node.js built-ins (`fs`, `path`, `url`, `process`)
**Storage**: SQLite (`jarvis.db`), WAL mode, foreign keys enforced; input is a JSON file (`kg-store.json`)
**Testing**: `vitest` 4.1.4 (`npm test` runs `vitest run`), 30s timeout per test
**Target Platform**: Node.js CLI (macOS/Linux)
**Project Type**: CLI script (one-shot migration tool within existing library project)
**Performance Goals**: Complete migration within 10 seconds for up to 1,000 entities and 5,000 relations (SC-005)
**Constraints**: Input file fits in memory (<10 MB typical); no streaming required. Uses existing `createEntity()`/`createRelation()` API — no raw SQL.
**Scale/Scope**: Single `.mjs` file + integration tests. Personal-scale knowledge graphs (hundreds to low thousands of nodes).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality — PASS

- Single-file script with clear single responsibility (migration).
- Will include JSDoc documentation for all exported functions.
- Follows existing naming conventions (`kb-import.mjs`, `kb-export.mjs` → `kg-migrate.mjs`).
- No dead code — script is purpose-built.
- Uses existing `db.mjs` abstractions — no code duplication.

### II. Testing Standards — PASS

- Integration tests will be created in `tests/integration/kg-migrate.test.mjs`.
- Tests will use `:memory:` SQLite databases for isolation.
- Deterministic — no external services, no time-dependent assertions.
- Test names will describe scenarios per spec acceptance criteria.
- Coverage targets all 5 user stories + edge cases from spec.

### III. User Experience Consistency — PASS

- CLI argument pattern matches existing scripts (`node src/kg-migrate.mjs [--dry-run] [--db <path>] <file>`).
- Error messages are actionable (file not found, parse error, missing fields).
- Exit codes follow project convention (0=success, 1=arg error, 2+=domain errors).
- Output format matches existing CLI scripts (stdout for progress, stderr for errors).
- Summary report uses consistent structure.

### IV. Performance Requirements — PASS

- Performance target defined: <10s for 1,000 entities + 5,000 relations (SC-005).
- Uses `runTransaction()` for bulk atomicity — single transaction for all writes.
- Pre-loads all existing entities once for duplicate detection (avoids N+1 queries).
- No unbounded memory growth — input file is bounded by assumption (<10 MB).

## Project Structure

### Documentation (this feature)

```text
specs/006-kg-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── cli-contract.md  # CLI interface contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── db.mjs               # Existing DB abstraction (35 exported functions)
├── schema.sql            # Existing SQLite schema
├── kg-migrate.mjs        # NEW — migration script (this feature)
├── kb-import.mjs         # Existing — reference for CLI conventions
└── kb-export.mjs         # Existing — reference for CLI conventions

tests/
├── integration/
│   ├── kg-migrate.test.mjs  # NEW — migration integration tests
│   ├── import.test.mjs      # Existing — reference for test patterns
│   └── export.test.mjs      # Existing
└── unit/
    └── db.test.mjs          # Existing
```

**Structure Decision**: Single-project flat layout matching existing convention. The migration script lives alongside `kb-import.mjs` and `kb-export.mjs` in `src/`. Tests go in `tests/integration/` since the script exercises the full DB layer.

## Complexity Tracking

> No constitution violations. No entries needed.
