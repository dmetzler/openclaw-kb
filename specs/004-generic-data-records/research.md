# Research: Generic Data Records Table

**Feature**: 004-generic-data-records
**Date**: 2026-04-14

## Research Tasks

### 1. Data Model Design: Generic vs. Typed Storage

**Decision**: Single `data_records` table with a `data` JSON column and a `record_type` TEXT discriminator.

**Rationale**: The existing codebase has 4 tables (`health_metrics`, `activities`, `grades`, `meals`) with identical patterns: `source_id` FK, `recorded_at` timestamp, table-specific columns, `metadata` JSON. The table-specific columns can be collapsed into a single `data` JSON column because:
- SQLite's JSON1 extension provides `json_extract()` for querying fields at read time.
- All existing per-table columns (e.g., `metric_type`, `value`, `unit` for health_metrics) become top-level keys in the JSON object.
- This is the explicit requirement from the spec — the AI agent needs to store arbitrary data types.

**Alternatives Considered**:
- **EAV (Entity-Attribute-Value)**: Rejected — overly complex for this use case, poor query ergonomics, hard to reconstruct full records.
- **Separate tables per type with dynamic DDL**: Rejected — requires schema migrations at runtime, brittle, and the spec explicitly requires a single table.
- **Keep typed tables + add a generic table**: Rejected — contradicts the spec's goal of removing code duplication and legacy tables.

### 2. JSON Field Filtering Strategy

**Decision**: Use SQLite's `json_extract(data, '$.key')` for top-level field filtering in `queryRecords`.

**Rationale**: SQLite's JSON1 extension is built into every modern SQLite build (3.38+, and `better-sqlite3` ships SQLite 3.45+). The `json_extract()` function can filter on top-level keys without indexing, which is sufficient for the expected data sizes (< 100k records). The spec explicitly limits filtering to top-level keys only.

**Alternatives Considered**:
- **Generated columns + indexes**: More performant for high-cardinality queries but requires knowing field names in advance, defeating the generic design. Could be added later as an optimization.
- **FTS5 for JSON filtering**: FTS5 is for text search, not structured field filtering. Wrong tool.

### 3. Migration Strategy

**Decision**: SQL migration file `001-generic-data-records.sql` that:
1. Creates the `data_records` table.
2. Inserts data from each legacy table using `INSERT INTO ... SELECT`, packing per-table columns into a JSON object via `json_object()`.
3. Drops the 4 legacy tables.
4. Drops the 12 legacy FTS5 triggers.
5. Creates 3 new FTS5 triggers on `data_records`.

**Rationale**: The existing migration framework in `db.mjs` (`_runMigrations()`) already reads `NNN-name.sql` files from `src/migrations/`, applies them in a transaction, and tracks them in `schema_migrations`. This is the first migration (`001`).

**Key detail**: The migration must handle the `metadata` field correctly for each table. All legacy tables have a `metadata` JSON column. The new `data` JSON object should absorb all table-specific fields AND the metadata fields. Two approaches:
- **Flatten metadata into data**: `json_object('metric_type', metric_type, 'value', value, ..., 'metadata', json(metadata))` — preserves the nested metadata as a sub-object.
- **Merge metadata keys to top level**: Would lose the separation. Rejected.

**Decision**: Use nested approach — `data` JSON contains all typed columns plus a `metadata` key with the original metadata object.

**Alternatives Considered**:
- **Application-level migration**: Read rows in JS, transform, insert. Rejected — slower, more code, not atomic, and the SQL approach handles this cleanly.
- **Rename + ALTER TABLE**: SQLite doesn't support dropping columns well, and the column sets differ between tables. Clean insert-select-drop is simpler.

### 4. FTS5 Trigger Design for Generic Records

**Decision**: 3 triggers (INSERT, UPDATE, DELETE) on `data_records` table:
- `name` = `record_type` column
- `content_text` = `data` JSON column (stringified)
- `source_table` = `'data_records'`
- `source_id` = row `id`

**Rationale**: Follows the existing pattern from entity triggers. The `data` column is already a JSON string, so it serves as searchable text directly. Using `record_type` as the FTS `name` field allows search results to display what kind of record matched.

**Alternatives Considered**:
- **Extract specific fields for FTS**: Would require knowing field names per type. Defeats the generic design.
- **Skip FTS for data records**: Spec explicitly requires FTS5 integration (FR-009, FR-010, User Story 3).

### 5. Export/Import Format Change

**Decision**: Replace 4 CSV files with single `data_records.jsonl` file.

**Rationale**: 
- JSONL is already used for `data_sources`, `entities`, and `relations` exports. Using it for data records is consistent.
- JSONL handles nested JSON (`data` column) natively, whereas CSV requires JSON-in-CSV escaping (current approach with `csvStringify`/`csvParse` for metadata fields).
- Simplifies the export/import code — one `writeJsonl`/`readJsonl` call replaces 4 `writeCsv`/`readCsvRows` calls.

**Import backward compatibility**: The `REQUIRED_FILES` array in `kb-import.mjs` will be updated to expect `data_records.jsonl` instead of the 4 CSV files. Old exports will be incompatible — this is acceptable because this is a schema migration (new schema version).

**Alternatives Considered**:
- **Keep CSV**: Rejected — JSONL is simpler for nested JSON, and the project already uses JSONL for other tables.
- **Support both CSV and JSONL**: Over-engineering for v1. Old exports are pre-migration anyway.

### 6. `getRecordCounts()` Design

**Decision**: Query `data_records` grouped by `record_type` and return a dynamic object: `{ health_metric: 5, activity: 3 }`. The existing static keys (`health_metrics`, `activities`, `grades`, `meals`) are removed.

**Rationale**: The function currently returns hardcoded table counts. With a generic table, the counts must be dynamic — grouped by `record_type`. The return shape changes from `{ health_metrics: N, activities: N, grades: N, meals: N }` to `{ [record_type]: count }` plus the other unchanged tables (`data_sources`, `entities`, `relations`, `embeddings`).

**Note**: The `record_type` values from migration will be singular form (`health_metric`, `activity`, `grade`, `meal`) to match the spec's convention. This differs from the old table names (which were plural). Existing tests and any code relying on `getRecordCounts()` return shape will need updating.

### 7. Schema.sql Changes (Fresh Database)

**Decision**: For fresh databases (no existing data), `schema.sql` will contain:
- `data_records` table definition (replaces 4 legacy tables)
- `data_records(record_type, recorded_at)` composite index
- 3 FTS5 triggers on `data_records` (replaces 12 legacy triggers)
- All non-data-lake tables unchanged (`entities`, `relations`, `data_sources`, `search_index`, `vec_embeddings`, `schema_migrations`)

**Rationale**: `schema.sql` represents the canonical current schema. Migrations are for upgrading existing databases. Fresh databases get the final schema directly.

### 8. Test Impact Analysis

**Files requiring changes**:

| Test File | Change Type | Reason |
|-----------|-------------|--------|
| `tests/unit/db.test.mjs` | Major | Replace legacy insert/query function tests with `insertRecord`/`queryRecords` |
| `tests/unit/export-import.test.mjs` | Major | JSONL instead of CSV for data records |
| `tests/unit/migrations.test.mjs` | Major | Add tests for `001-generic-data-records.sql` migration |
| `tests/integration/data-lake.test.mjs` | Major | Entire test suite uses legacy functions |
| `tests/integration/export.test.mjs` | Moderate | Verify `data_records.jsonl` output |
| `tests/integration/import.test.mjs` | Moderate | Verify JSONL import, update `REQUIRED_FILES` |
| `tests/integration/round-trip.test.mjs` | Moderate | Round-trip with JSONL |
| `tests/integration/search.test.mjs` | Moderate | Verify FTS5 for `data_records` |
| `tests/integration/schema-init.test.mjs` | Minor | Verify no legacy tables exist |
| `tests/integration/benchmark.test.mjs` | Minor | Update to use generic API |
| `tests/integration/quickstart-validation.test.mjs` | Check needed | May reference legacy functions |
| `tests/integration/knowledge-graph.test.mjs` | Likely none | Entities/relations only |
| `tests/unit/csv.test.mjs` | None | CSV module unchanged |
