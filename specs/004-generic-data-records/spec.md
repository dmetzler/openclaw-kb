# Feature Specification: Generic Data Records Table

**Feature Branch**: `004-generic-data-records`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "CORRECTIVE SPEC: Replace hardcoded data lake tables with a generic extensible data_records table. Currently the schema has 4 hardcoded tables (health_metrics, activities, grades, meals) with dedicated insert/query functions in db.mjs. This is wrong because an AI agent should be able to store ANY new type of data without code changes. Replace with a single generic data_records table, single insertRecord/queryRecords functions, migrate existing data, update FTS5 triggers, update export/import to JSONL, and update all tests."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Store and retrieve any record type through a single generic API (Priority: P1)

An AI agent stores a new type of data (e.g. "finance", "sleep", "habit") by calling `insertRecord(recordType, data)` with any `record_type` string, without any code changes or schema migrations. The agent retrieves records by calling `queryRecords(recordType, filters)` with flexible filtering by source, date range, pagination, and arbitrary JSON field values.

**Why this priority**: This is the core value proposition. Without a generic insert/query API, the system cannot store new data types without code changes, which defeats the purpose of an extensible data lake.

**Independent Test**: Can be fully tested by inserting records of various types (including novel types like "finance" or "sleep" that never existed before) and querying them back with different filter combinations. Delivers the fundamental extensibility value.

**Acceptance Scenarios**:

1. **Given** a registered data source, **When** the agent calls `insertRecord("finance", { source_id: 1, recorded_at: "2026-01-15", amount: 42.50, category: "groceries" })`, **Then** the record is stored in `data_records` with `record_type = "finance"`, `data` containing the JSON payload, and `recorded_at` extracted to the column.
2. **Given** multiple records of type "finance" and "sleep" exist, **When** the agent calls `queryRecords("finance", { from: "2026-01-01", to: "2026-01-31", limit: 10 })`, **Then** only "finance" records within the date range are returned, ordered by `recorded_at DESC`, limited to 10.
3. **Given** records exist, **When** the agent calls `queryRecords("finance", { source_id: 1 })`, **Then** only records from that source are returned.
4. **Given** records with varying JSON fields exist, **When** the agent calls `queryRecords("finance", { jsonFilters: { category: "groceries" } })`, **Then** only records whose `data` JSON contains `category = "groceries"` are returned.
5. **Given** no data source with `id = 999` exists, **When** the agent calls `insertRecord("finance", { source_id: 999, recorded_at: "2026-01-15" })`, **Then** the function throws an error indicating the source does not exist.
6. **Given** a valid data source, **When** the agent calls `insertRecord("finance", { source_id: 1 })` without `recorded_at` in the data, **Then** the function throws an error indicating `recorded_at` is required.

---

### User Story 2 - Migrate existing data from legacy tables without data loss (Priority: P2)

A database administrator runs a SQL migration that moves all existing records from the 4 legacy tables (health_metrics, activities, grades, meals) into the new `data_records` table, preserving all data fields and metadata. After migration, the legacy tables are dropped.

**Why this priority**: Without migration, existing data is lost. This must work correctly before the old code paths can be removed, but it depends on the new table existing first (P1).

**Independent Test**: Can be tested by populating the 4 legacy tables with known data, running the migration SQL, then verifying every record exists in `data_records` with correct `record_type` mapping and all original fields preserved in the `data` JSON column. Legacy tables must no longer exist after migration.

**Acceptance Scenarios**:

1. **Given** the 4 legacy tables contain records, **When** the migration `001-generic-data-records.sql` is executed, **Then** every row from `health_metrics` appears in `data_records` with `record_type = "health_metric"`, every row from `activities` with `record_type = "activity"`, every row from `grades` with `record_type = "grade"`, every row from `meals` with `record_type = "meal"`.
2. **Given** the migration has run, **When** querying the database for tables, **Then** `health_metrics`, `activities`, `grades`, and `meals` no longer exist.
3. **Given** a `health_metrics` row with `metric_type = "weight"`, `value = 75.5`, `unit = "kg"`, `metadata = '{"note":"morning"}'`, `recorded_at = "2026-01-15"`, `source_id = 1`, **When** migrated, **Then** `data_records` contains a row with `record_type = "health_metric"`, `source_id = 1`, `recorded_at = "2026-01-15"`, and `data` JSON containing `{ "metric_type": "weight", "value": 75.5, "unit": "kg", "metadata": {"note":"morning"} }`.
4. **Given** a fresh database (no legacy tables), **When** the schema is initialized, **Then** only the `data_records` table exists (no legacy tables are created).

---

### User Story 3 - Full-text search across all record types via FTS5 (Priority: P3)

A user searches the knowledge base and finds data records alongside entities and relations. The FTS5 search index includes data records with `record_type` as the searchable name and the JSON `data` field as the searchable content.

**Why this priority**: Search is important for discoverability but is an enhancement on top of the core store/retrieve functionality (P1) and migration (P2).

**Independent Test**: Can be tested by inserting data records of various types, then performing FTS5 searches and verifying data records appear in results with correct `source_table = "data_records"` and `source_id` references.

**Acceptance Scenarios**:

1. **Given** a data record with `record_type = "health_metric"` and `data` containing `"morning weight measurement"`, **When** the user searches for "morning weight", **Then** the search results include this record with `source_table = "data_records"`.
2. **Given** a data record is inserted, **When** inspecting the FTS5 `search_index`, **Then** an entry exists with `source_table = "data_records"`, `source_id` matching the record's id, `name` containing the `record_type`, and `content_text` containing the serialized `data`.
3. **Given** a data record is updated, **When** searching, **Then** the FTS5 index reflects the updated content.
4. **Given** a data record is deleted, **When** searching, **Then** the record no longer appears in search results.

---

### User Story 4 - Export and import all records as a single JSONL file (Priority: P4)

A user exports the knowledge base and all data records are written to a single `data_records.jsonl` file instead of 4 separate CSV files. On import, the JSONL file is read and all records are restored. The export/import round-trip preserves all data.

**Why this priority**: Export/import is a supporting feature that depends on the generic API (P1) and updated data model. It is the last piece needed for full feature parity.

**Independent Test**: Can be tested by inserting records of multiple types, exporting to a backup directory, clearing the database, importing from the backup, and verifying all records match the originals.

**Acceptance Scenarios**:

1. **Given** data records of types "health_metric", "activity", "grade", and "meal" exist, **When** the user runs `kb-export.mjs`, **Then** a file `data_records.jsonl` is created in the export directory containing one JSON line per record with all fields.
2. **Given** a valid export directory containing `data_records.jsonl`, **When** the user runs `kb-import.mjs`, **Then** all records are inserted into `data_records` with correct `record_type`, `source_id`, `data`, and `recorded_at`.
3. **Given** records exist, **When** the user exports and then imports into a fresh database, **Then** `getRecordCounts()` returns the same counts per `record_type` as before export.
4. **Given** the legacy CSV files (`health_metrics.csv`, `activities.csv`, `grades.csv`, `meals.csv`) are absent from the export, **When** the user runs `kb-import.mjs`, **Then** no error is raised for missing legacy CSV files (they are no longer expected).

---

### Edge Cases

- What happens when `insertRecord` is called with an empty string `record_type`? System MUST reject it with an error.
- What happens when `queryRecords` is called with a `record_type` that has no records? System MUST return an empty array, not an error.
- How does the system handle `data` JSON containing deeply nested objects? System MUST store and retrieve them faithfully; JSON field filters operate only on top-level keys.
- What happens when `recorded_at` in the data is in an unexpected format? System MUST accept ISO 8601 strings; other formats are the caller's responsibility.
- What happens during migration if a legacy table is empty? Migration MUST succeed (INSERT from empty table is a no-op).
- What happens when exporting a database with zero data records? `data_records.jsonl` MUST be created as an empty file (or file with zero lines).
- How does `getRecordCounts()` report counts? It MUST return counts grouped by `record_type` (e.g. `{ health_metric: 5, activity: 3, finance: 2 }`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `data_records` table with columns: `id` (INTEGER PRIMARY KEY), `source_id` (INTEGER, FK to `data_sources.id`), `record_type` (TEXT, NOT NULL), `data` (TEXT/JSON, NOT NULL), `recorded_at` (TEXT, NOT NULL), `created_at` (TEXT, DEFAULT `datetime('now')`).
- **FR-002**: System MUST provide an `insertRecord(recordType, data)` function that validates `source_id` exists in `data_sources` and `recorded_at` is present in the data object before inserting.
- **FR-003**: System MUST provide a `queryRecords(recordType, filters)` function supporting filters: `source_id`, `from` (recorded_at >=), `to` (recorded_at <=), `limit`, `offset`, and arbitrary JSON field filters via `json_extract()`.
- **FR-004**: System MUST reject `insertRecord` calls with empty or missing `record_type` with a descriptive error.
- **FR-005**: System MUST remove the 4 legacy tables (`health_metrics`, `activities`, `grades`, `meals`) from `schema.sql`.
- **FR-006**: System MUST remove the 16 legacy functions from `db.mjs`: `insertHealthMetric`, `queryHealthMetrics`, `insertActivity`, `queryActivities`, `insertGrade`, `queryGrades`, `insertMeal`, `queryMeals`, `getAllHealthMetrics`, `getAllActivities`, `getAllGrades`, `getAllMeals`, `importHealthMetric`, `importActivity`, `importGrade`, `importMeal`.
- **FR-007**: System MUST provide replacement functions: `getAllDataRecords()` (returns all records) and `importDataRecord(row)` (inserts a record during import without validation overhead).
- **FR-008**: System MUST provide a SQL migration file `src/migrations/001-generic-data-records.sql` that moves all existing data from the 4 legacy tables into `data_records` and drops the legacy tables.
- **FR-009**: System MUST update FTS5 triggers to index `data_records` instead of the 4 legacy tables, using `record_type` as `name` and `data` as `content_text`, with `source_table = 'data_records'`.
- **FR-010**: System MUST remove the 12 legacy FTS5 triggers (3 per legacy table: INSERT, UPDATE, DELETE) and replace with 3 triggers on `data_records`.
- **FR-011**: System MUST update `kb-export.mjs` to export data records as a single `data_records.jsonl` file instead of 4 CSV files.
- **FR-012**: System MUST update `kb-import.mjs` to import data records from a single `data_records.jsonl` file instead of 4 CSV files.
- **FR-013**: System MUST update `getRecordCounts()` to return counts grouped by `record_type` from the `data_records` table.
- **FR-014**: System MUST update all affected tests (9 test files) to use the new generic API.
- **FR-015**: `queryRecords` MUST return results ordered by `recorded_at DESC` by default.
- **FR-016**: System MUST create an index on `data_records(record_type, recorded_at)` for query performance.

### Key Entities

- **data_records**: A generic record stored in the data lake. Identified by `id`, associated with a `data_source` via `source_id`, categorized by `record_type` (free-form string like "health_metric", "activity", "finance", "sleep"), containing structured data in `data` (JSON), timestamped by `recorded_at` and `created_at`.
- **data_sources**: (Unchanged) The origin system or integration that produces records. Referenced by `data_records.source_id`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing tests pass after migration to the new schema (0 regressions).
- **SC-002**: A novel `record_type` (e.g. "finance") can be inserted and queried without any code changes — verified by a new test case.
- **SC-003**: Export/import round-trip preserves 100% of data records — record counts and content match before and after.
- **SC-004**: Migration from legacy tables preserves 100% of existing data — row counts per type match before and after migration.
- **SC-005**: FTS5 search returns data records with correct `source_table` and `source_id` — verified by search integration tests.
- **SC-006**: The 16 legacy functions and 4 legacy tables are fully removed — no references remain in source code.
- **SC-007**: `queryRecords` with JSON field filters returns only matching records — verified by test with at least 2 different filter fields.

## Assumptions

- The `data_sources` table and its API remain unchanged; this spec only modifies the data lake storage layer.
- Record type strings are free-form text chosen by the caller; no enum or whitelist is enforced.
- The `data` column stores valid JSON; callers are responsible for JSON validity.
- JSON field filters in `queryRecords` operate on top-level keys only (no nested path filtering in v1).
- The `csv.mjs` module may become unused after this change but will not be removed in this spec (removal is a separate cleanup task).
- The migration file follows the existing `NNN-name.sql` naming convention and is the first migration (`001-`).
- All tests use in-memory SQLite databases (`:memory:`), so migration testing requires explicit setup of legacy tables before running the migration SQL.
- The `recorded_at` field is stored as TEXT in ISO 8601 format; no timezone conversion is performed.
