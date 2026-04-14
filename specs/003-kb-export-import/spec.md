# Feature Specification: Knowledge Base Export & Import

**Feature Branch**: `003-kb-export-import`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "Knowledge Base Export and Import for portability. Building on the SQLite foundation (spec 001) and wiki structure (spec 002). Features: (1) kb-export.mjs script that dumps the entire knowledge base to flat files: entities.jsonl, relations.jsonl, health_metrics.csv, activities.csv, grades.csv, meals.csv, embeddings.jsonl, and metadata.json with schema version and export date. (2) kb-import.mjs script that restores from a flat export into a fresh SQLite database, recreating schema, re-indexing FTS5 and embeddings. (3) JSONL format for complex structured data (1 JSON object per line, streamable), CSV for tabular data. (4) Round-trip test: export -> import -> export again should produce identical output. (5) Wiki pages (wiki/) and raw sources (raw/) are already portable Markdown files - they are NOT included in the SQLite export. (6) The export directory can be version-controlled in Git for tracking knowledge evolution. Node.js ES modules, uses the db.mjs abstraction layer from spec 001."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export the Entire Knowledge Base to Flat Files (Priority: P1)

A knowledge base operator wants to create a portable snapshot of all structured data stored in the SQLite database. They run the export script, specifying an output directory. The script reads every table in the knowledge base — entities, relations, health metrics, activities, grades, meals, and embeddings — and writes each to a separate flat file in the output directory. Complex structured data (entities, relations, embeddings) is written as JSONL (one JSON object per line), while tabular data (health metrics, activities, grades, meals) is written as CSV. A `metadata.json` file is also written containing the schema version and export timestamp. The operator can then inspect, version-control, or transfer this directory independently of the SQLite database.

**Why this priority**: Export is the foundation of portability. Without the ability to serialize the database to flat files, no other portability feature (import, round-trip, Git versioning) is possible.

**Independent Test**: Can be fully tested by populating a database with known data across all tables, running the export, and verifying each output file contains the expected records in the correct format.

**Acceptance Scenarios**:

1. **Given** a populated knowledge base with entities, relations, health metrics, activities, grades, meals, and embeddings, **When** the operator runs the export script with an output directory path, **Then** the output directory contains `entities.jsonl`, `relations.jsonl`, `health_metrics.csv`, `activities.csv`, `grades.csv`, `meals.csv`, `embeddings.jsonl`, and `metadata.json`.
2. **Given** the export script runs, **When** `metadata.json` is written, **Then** it contains the current schema version (from `schema_migrations`) and the export timestamp in ISO 8601 format.
3. **Given** the entities table contains records with JSON metadata fields, **When** the export writes `entities.jsonl`, **Then** each line is a valid JSON object representing one entity with all fields preserved, including nested metadata.
4. **Given** the health_metrics table contains records, **When** the export writes `health_metrics.csv`, **Then** the CSV has a header row matching the table columns and one data row per record, with JSON fields serialized as escaped strings.
5. **Given** the embeddings table contains vector data, **When** the export writes `embeddings.jsonl`, **Then** each line contains the entity ID and the full embedding vector as a JSON array of numbers.
6. **Given** the knowledge base is empty (no records in any table), **When** the export runs, **Then** each output file is created with headers or format markers only (empty JSONL files, CSV files with header rows only) and `metadata.json` is still written.

---

### User Story 2 - Import a Flat Export into a Fresh Database (Priority: P1)

A knowledge base operator has a previously exported directory of flat files and wants to restore them into a fresh SQLite database. They run the import script, pointing it at the export directory. The script creates a new database, applies the full schema (tables, indexes, triggers, FTS5 virtual table, vec0 embeddings table), then reads each flat file and inserts the records into the corresponding tables. After all records are loaded, the FTS5 search index and vector embeddings are fully populated and queryable. The restored database is functionally equivalent to the original.

**Why this priority**: Import completes the portability cycle. Export without import is a one-way backup — import makes the exported data actionable again in a new environment.

**Independent Test**: Can be fully tested by exporting a known database, importing into a fresh database, and then querying the new database to verify all data, search indexes, and embeddings match the original.

**Acceptance Scenarios**:

1. **Given** an export directory with all expected files (`entities.jsonl`, `relations.jsonl`, `health_metrics.csv`, `activities.csv`, `grades.csv`, `meals.csv`, `embeddings.jsonl`, `metadata.json`), **When** the operator runs the import script targeting a new database path, **Then** a new SQLite database is created with the full schema applied.
2. **Given** the import reads `entities.jsonl`, **When** each line is parsed, **Then** the corresponding entity is inserted into the `entities` table with all fields preserved including metadata.
3. **Given** the import reads `relations.jsonl`, **When** relations reference entity IDs from the export, **Then** the relations are inserted with the original entity ID mappings preserved.
4. **Given** the import reads CSV files (health_metrics, activities, grades, meals), **When** each row is parsed, **Then** the record is inserted into the corresponding table with correct types and values.
5. **Given** the import reads `embeddings.jsonl`, **When** each embedding is loaded, **Then** it is inserted into the `vec_embeddings` virtual table and is queryable via K-nearest-neighbor search.
6. **Given** all data has been imported, **When** a full-text search is executed against the new database, **Then** the FTS5 index returns results matching the imported data (populated automatically via insert triggers).
7. **Given** `metadata.json` specifies a schema version, **When** the import completes, **Then** the `schema_migrations` table in the new database reflects the correct version history.

---

### User Story 3 - Round-Trip Integrity Verification (Priority: P2)

A knowledge base operator wants to verify that the export/import cycle is lossless. They export the database to a directory, import that directory into a fresh database, then export the fresh database to a second directory. They compare the two export directories file-by-file. If the export and import are implemented correctly, the two directories are identical — proving zero data loss in the round trip.

**Why this priority**: Round-trip integrity is the ultimate proof that export and import are correct and complete. It catches edge cases in serialization, type coercion, and ordering that individual unit tests might miss.

**Independent Test**: Can be fully tested by running the export → import → export cycle and performing a byte-level or structured comparison of the two export directories.

**Acceptance Scenarios**:

1. **Given** a populated knowledge base, **When** the operator exports to directory A, imports directory A into a fresh database, and exports that database to directory B, **Then** every file in directory A is identical to the corresponding file in directory B.
2. **Given** the round-trip test includes entities with complex nested metadata (arrays, nested objects, special characters), **When** the round trip completes, **Then** metadata is preserved exactly — no field reordering, type coercion, or truncation.
3. **Given** the round-trip test includes embedding vectors, **When** the round trip completes, **Then** vector values in `embeddings.jsonl` match to full floating-point precision.

---

### User Story 4 - Version-Control the Export Directory (Priority: P3)

A knowledge base operator uses Git to track how their knowledge base evolves over time. They export the knowledge base to a directory within a Git repository, commit the export, and later export again to see what changed. Git diff shows added, modified, and removed records across JSONL and CSV files, giving the operator a history of knowledge evolution.

**Why this priority**: Version-controlled exports are a value-added capability that builds on the core export feature. It depends on export working correctly but adds longitudinal tracking.

**Independent Test**: Can be fully tested by exporting to a Git-tracked directory, committing, modifying the database, exporting again, and verifying that `git diff` shows meaningful, readable changes.

**Acceptance Scenarios**:

1. **Given** an export directory is tracked by Git, **When** the operator exports twice (before and after database modifications) and runs `git diff`, **Then** the diff shows added, changed, or removed lines corresponding to the actual data changes.
2. **Given** JSONL files have one record per line, **When** a single entity is modified between exports, **Then** `git diff` shows exactly one changed line in `entities.jsonl` (not a full file rewrite).
3. **Given** CSV files have one record per row, **When** records are added or removed, **Then** `git diff` shows inserted or deleted rows clearly.

---

### Edge Cases

- What happens when the export directory already contains files from a previous export? The export script overwrites existing files in the target directory without prompting — the directory represents a single snapshot.
- What happens when the import script encounters an export directory with missing files (e.g., no `meals.csv`)? The script reports which files are missing and aborts without creating a partial database.
- How does the import handle a `metadata.json` with a schema version newer than the import script supports? The script warns the user and aborts, preventing data loss from incompatible schema assumptions.
- What happens when a JSONL line contains malformed JSON during import? The script reports the file name, line number, and parse error, then aborts the import (no partial imports).
- How does the export handle tables with zero rows? It writes the file with appropriate empty content (empty JSONL file, CSV with header row only).
- What happens if the target database file already exists during import? The script aborts with an error — import targets must be fresh (non-existent) database paths to prevent accidental overwrites.
- How does the export handle special characters in string fields (newlines, commas, quotes) in CSV output? Standard CSV escaping rules apply (fields containing commas, quotes, or newlines are quoted; embedded quotes are doubled).
- What happens when embeddings reference entity IDs that don't exist in the entities table? This cannot occur in a valid export since embeddings reference existing entities. If encountered in a manually edited export, the import reports a foreign key violation and aborts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an export script (`kb-export.mjs`) that reads all structured data from the SQLite knowledge base and writes it to flat files in a specified output directory.
- **FR-002**: The export MUST produce the following files: `entities.jsonl`, `relations.jsonl`, `health_metrics.csv`, `activities.csv`, `grades.csv`, `meals.csv`, `embeddings.jsonl`, and `metadata.json`.
- **FR-003**: JSONL files (entities, relations, embeddings) MUST contain one valid JSON object per line, with no trailing commas or array wrappers. Records MUST be ordered by primary key (ascending) for deterministic output.
- **FR-004**: CSV files (health_metrics, activities, grades, meals) MUST include a header row with column names matching the database schema, followed by one row per record. Records MUST be ordered by primary key (ascending) for deterministic output.
- **FR-005**: CSV output MUST follow RFC 4180 conventions: fields containing commas, double quotes, or newlines are enclosed in double quotes; embedded double quotes are escaped by doubling them.
- **FR-006**: `metadata.json` MUST contain at minimum: `schema_version` (the latest applied migration version or null if no migrations), `exported_at` (ISO 8601 timestamp of the export), and `record_counts` (an object with table names as keys and row counts as values).
- **FR-007**: The export script MUST use the `db.mjs` abstraction layer from spec 001 to access the database. It MUST NOT import `better-sqlite3` directly or execute raw SQL outside of `db.mjs`.
- **FR-008**: System MUST provide an import script (`kb-import.mjs`) that reads an export directory and restores all data into a fresh SQLite database.
- **FR-009**: The import script MUST create a new database at the specified path, apply the full schema (via `initDatabase()` from `db.mjs`), and then insert records from each flat file into the corresponding tables.
- **FR-010**: The import script MUST validate that the target database file does not already exist before proceeding. If the file exists, the script MUST abort with a clear error message.
- **FR-011**: The import script MUST validate that all expected files are present in the export directory before beginning data insertion. If any file is missing, the script MUST report the missing files and abort.
- **FR-012**: The import script MUST validate `metadata.json` and verify that the schema version is compatible with the current codebase before importing data.
- **FR-013**: The import MUST restore entity and relation ID mappings faithfully so that relations reference the correct entities after import.
- **FR-014**: After importing entities, relations, and data lake records, the FTS5 search index MUST be populated automatically via the existing insert triggers defined in the schema — no manual FTS5 rebuild required.
- **FR-015**: After importing embeddings, the `vec_embeddings` virtual table MUST contain all imported vectors and support K-nearest-neighbor queries.
- **FR-016**: The import MUST restore data in dependency order: data_sources first (if exported), then entities, then relations (which reference entities), then data lake tables (which reference data_sources), then embeddings (which reference entities).
- **FR-017**: Both scripts MUST be Node.js ES modules (`.mjs` extension) executable via `node kb-export.mjs <args>` and `node kb-import.mjs <args>`.
- **FR-018**: The export MUST NOT include wiki pages (`wiki/`) or raw source files (`raw/`). These are already portable Markdown files managed outside the SQLite database.
- **FR-019**: If a JSONL or CSV file contains malformed data during import, the script MUST report the file name, line number, and error details, then abort without committing any partial data.
- **FR-020**: The export script MUST overwrite any existing files in the target directory from a previous export without prompting.
- **FR-021**: The export MUST also include `data_sources.jsonl` containing all registered data sources, since data lake tables reference data sources by ID.
- **FR-022**: JSON metadata fields in JSONL output MUST be serialized as nested JSON objects (not escaped strings), preserving their structure for readability and diff-friendliness.
- **FR-023**: JSON metadata fields in CSV output MUST be serialized as JSON strings within quoted CSV fields, following RFC 4180 escaping rules.

### Key Entities

- **Export Directory**: A filesystem directory containing the complete flat-file representation of a knowledge base snapshot. Contains JSONL files, CSV files, and a `metadata.json` manifest.
- **Metadata Manifest** (`metadata.json`): A JSON file documenting the export's schema version, timestamp, and record counts — enabling version compatibility checks during import.
- **JSONL File**: A line-delimited JSON file where each line is one self-contained JSON object. Used for entities, relations, data sources, and embeddings — data types with nested or complex fields.
- **CSV File**: A comma-separated values file with a header row. Used for tabular data lake records (health metrics, activities, grades, meals) — data types with flat, regular column structures.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can export a knowledge base with 10,000+ records across all tables and produce a complete set of flat files within 30 seconds.
- **SC-002**: An operator can import a previously exported directory into a fresh database and have all data queryable (including full-text search and vector similarity search) within 60 seconds for 10,000+ records.
- **SC-003**: A round-trip test (export → import → re-export) produces byte-identical output files, confirming zero data loss.
- **SC-004**: Exported JSONL files are human-readable — each line is a self-contained, pretty-printable JSON object that can be inspected with standard text tools.
- **SC-005**: Exported CSV files can be opened in any spreadsheet application (Excel, Google Sheets, LibreOffice Calc) without data corruption.
- **SC-006**: Git diffs of consecutive exports show meaningful, line-level changes corresponding to actual data modifications — not full-file rewrites.
- **SC-007**: Export and import scripts provide clear progress feedback indicating which table is being processed.
- **SC-008**: Import of a corrupted or incomplete export directory fails cleanly with a specific error message identifying the problem, leaving no partial database behind.

## Assumptions

- The SQLite database layer from spec 001 is fully implemented. The export/import scripts use `db.mjs` (specifically `initDatabase()`, `getSchemaVersion()`, and the query functions) for all database access.
- The `data_sources` table is included in the export (as `data_sources.jsonl`) because data lake tables (health_metrics, activities, grades, meals) reference data sources by foreign key. Without data sources, imported data lake records would have dangling references.
- The `schema_migrations` table content is captured in `metadata.json` (as the schema version) but is NOT exported as a separate file. On import, the schema is initialized fresh via `initDatabase()` which applies `schema.sql` and runs migrations, so the migration history is reconstructed from the codebase — not restored from the export.
- The `search_index` FTS5 virtual table is NOT exported. It is a derived index that is automatically populated by SQLite triggers when entities and data lake records are inserted during import.
- Vector embeddings are exported as JSON arrays of floating-point numbers in `embeddings.jsonl`. The import restores them into the `vec_embeddings` vec0 virtual table using the `upsertEmbedding()` function from `db.mjs`.
- JSONL records are ordered by primary key (ascending) to ensure deterministic output. CSV records are similarly ordered by primary key. This ordering is critical for round-trip byte-identical comparison and meaningful Git diffs.
- The export directory is a flat structure (no subdirectories). All output files reside directly in the specified directory.
- Wiki pages (`wiki/`) and raw source files (`raw/`) are excluded from the export by design — they are already portable Markdown files that exist on the filesystem independently of the SQLite database.
- Both scripts accept their primary argument (directory path) as a command-line argument: `node src/kb-export.mjs ./export-dir` and `node src/kb-import.mjs ./export-dir`.
- The import script uses a transaction for the entire data insertion phase. If any step fails, the entire import is rolled back and the database file is removed, ensuring no partial imports.
