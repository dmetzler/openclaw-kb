# Research: Knowledge Base Export & Import

**Feature**: 003-kb-export-import | **Date**: 2026-04-14

## Research Questions

### R1: CSV Serialization Without Third-Party Libraries

**Decision**: Hand-roll RFC 4180 CSV serialization/parsing in `csv.mjs`.

**Rationale**: The data lake tables (health_metrics, activities, grades, meals) have flat, regular column structures with a small number of known columns. RFC 4180 rules are straightforward: fields containing commas, double quotes, or newlines are enclosed in double quotes; embedded double quotes are doubled. No streaming CSV library needed for this scale.

**Alternatives considered**:
- `csv-stringify` / `csv-parse` (npm) — unnecessary dependency for 4 flat tables with known schemas. Constitution principle on Technology Stack requires dependency justification; built-in capability suffices.
- `papaparse` — browser-oriented, heavier than needed.

**Key implementation notes**:
- Export: `csvStringify(headers, rows)` → string. Each row is an array of values. JSON fields (metadata, items, nutrition) are serialized to JSON strings, then CSV-escaped.
- Import: `csvParse(text)` → `{ headers, rows }`. Line-by-line parsing with state machine for quoted fields (handles embedded newlines).
- Edge cases to test: embedded commas, embedded double quotes (`""` escaping), embedded newlines in quoted fields, empty fields, null/undefined values (serialize as empty string).

---

### R2: JSONL Floating-Point Precision for Embeddings

**Decision**: Use `JSON.stringify()` for embedding vectors. JavaScript's `JSON.stringify` on a `Float32Array` converted to a regular array preserves the exact float values as they appear after float32 rounding.

**Rationale**: The spec requires "vector values in `embeddings.jsonl` match to full floating-point precision" for round-trip identity. Since all vectors in the system are `Float32Array` (384-dimensional, cosine distance), the precision boundary is float32. `JSON.stringify(Array.from(float32Array))` produces a deterministic JSON array of numbers. On re-import, `new Float32Array(jsonArray)` recovers the exact same bits because the JSON numbers are decimal representations of float32 values.

**Alternatives considered**:
- Base64 encoding of raw Float32Array buffer — compact but not human-readable, breaks Git diff friendliness (SC-006), violates SC-004 (human-readable JSONL).
- Fixed decimal precision (e.g., `toFixed(8)`) — risky; could truncate or add rounding error. `JSON.stringify` already uses the shortest representation that round-trips.

**Verification approach**: Round-trip test compares `embeddings.jsonl` byte-for-byte between export cycles.

---

### R3: Import Dependency Order

**Decision**: Import in this fixed order:
1. `data_sources.jsonl` → `data_sources` table (no foreign keys to other user tables)
2. `entities.jsonl` → `entities` table (no foreign keys to other user tables)
3. `relations.jsonl` → `relations` table (references `entities.source_id`, `entities.target_id`)
4. `health_metrics.csv` → `health_metrics` table (references `data_sources.source_id`)
5. `activities.csv` → `activities` table (references `data_sources.source_id`)
6. `grades.csv` → `grades` table (references `data_sources.source_id`)
7. `meals.csv` → `meals` table (references `data_sources.source_id`)
8. `embeddings.jsonl` → `vec_embeddings` virtual table (references `entities.entity_id`)

**Rationale**: Foreign key constraints are enabled (`PRAGMA foreign_keys = ON` in `db.mjs`). Inserting in the wrong order causes constraint violations. This order satisfies all FK dependencies:
- `data_sources` and `entities` have no FK dependencies on each other → can be in either order
- `relations` depends on `entities` → must come after
- Data lake tables depend on `data_sources` → must come after
- `embeddings` depends on `entities` → must come after

**Key consideration**: During import, FTS5 insert triggers fire automatically when entities and data lake records are inserted. This is correct behavior — no manual FTS rebuild needed. However, it means import will be slower than raw inserts because each insert triggers an FTS5 index update. This is acceptable within the 60-second target (SC-002).

---

### R4: Schema Version Compatibility Checking

**Decision**: Compare `metadata.json.schema_version` against `getSchemaVersion()` after initializing the fresh database. If the export's version is newer (lexicographically greater), abort with error. If equal or older, proceed.

**Rationale**: The schema version is the 3-digit version string from `schema_migrations` (e.g., `'003'`). A newer export version means the export was produced from a codebase with migrations that the current import script doesn't know about — importing could lose data or fail on unknown columns. An older-or-equal version is safe because the current schema is a superset of the export's schema (migrations only add, they don't remove).

**Edge case**: `schema_version: null` in metadata means no migrations were applied at export time (base schema only). This is always compatible since the base schema is always present.

**Alternatives considered**:
- Exact version match — too strict. Would break when import script has newer migrations than the export.
- Semantic versioning — overkill. The migration numbering system already provides linear ordering.

---

### R5: Transaction Strategy for Import

**Decision**: Wrap the entire data insertion phase in a single database transaction. On any failure, rollback and delete the database file.

**Rationale**: The spec explicitly requires "no partial imports" (FR-019, edge cases). A single transaction guarantees atomicity. If any JSONL line is malformed or any CSV row fails validation, the entire import is rolled back. The database file is then deleted to ensure no partial state remains.

**Implementation**:
```javascript
const insertAll = db.transaction(() => {
  importDataSources(dir);
  importEntities(dir);
  importRelations(dir);
  importHealthMetrics(dir);
  importActivities(dir);
  importGrades(dir);
  importMeals(dir);
  importEmbeddings(dir);
});

try {
  insertAll();
} catch (err) {
  closeDatabase();
  fs.unlinkSync(dbPath);
  throw err;
}
```

**Performance consideration**: Large transactions in SQLite are actually efficient — WAL mode handles them well. The 60-second target for 10K+ records is achievable within a single transaction.

**Alternatives considered**:
- Per-table transactions — allows partial imports, violating the spec.
- Per-row commits — extremely slow (fsync per commit in non-WAL mode), and still allows partial imports.

---

### R6: db.mjs Access Patterns — What's Missing

**Decision**: The export/import scripts need direct SQL access for bulk reads/writes that the current `db.mjs` API doesn't support. Two approaches:

1. **Export**: Needs `SELECT * FROM <table> ORDER BY id ASC` for each table. Current `db.mjs` has query functions for data lake tables (e.g., `queryHealthMetrics`) but they use pagination and filters. For export, we need unpaginated full-table reads. **Solution**: Add a `_getDb()` export or create thin wrapper functions for bulk export. However, per FR-007, the export script MUST use the `db.mjs` abstraction and MUST NOT import `better-sqlite3` directly.

   **Chosen approach**: Add `getAllEntities()`, `getAllRelations()`, `getAllDataSources()`, and `getAll<Table>()` functions to `db.mjs` that return all rows ordered by primary key. For data lake tables, we can use existing query functions with `limit: Infinity` and `offset: 0`, but this is semantically awkward. Explicit "get all" functions are clearer.

   **Alternative**: Export the internal `_getDb()` function so scripts can run arbitrary queries. Rejected — this breaks the abstraction layer that FR-007 is designed to protect.

2. **Import**: Needs bulk inserts with explicit ID values (to preserve original IDs). Current `createEntity()`, `createRelation()`, etc. use `AUTOINCREMENT` and don't accept ID parameters. **Solution**: Add bulk insert functions or modify existing ones to optionally accept an `id` field. Bulk insert with explicit IDs also requires `INSERT INTO entities (id, name, type, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)` — preserving all fields including timestamps.

   **Chosen approach**: Add import-specific functions: `importEntity(row)`, `importRelation(row)`, etc. that accept the full row including `id`, `created_at`, and `updated_at`. These are clearly marked as import-only and bypass the validation/defaulting in the regular create functions. The alternative (modifying existing create functions to accept optional IDs) muddies the API for the normal use case.

3. **Embeddings export**: Need to read all embeddings from `vec_embeddings`. Current API only has `findNearestVectors()` (KNN search) and `upsertEmbedding()`. **Solution**: Add `getAllEmbeddings()` function that returns `[{ entity_id, embedding }]`.

**Summary of db.mjs additions**:
- `getAllEntities()` → all entities ordered by id ASC
- `getAllRelations()` → all relations ordered by id ASC
- `getAllDataSources()` → all data sources ordered by id ASC
- `getAllHealthMetrics()` → all health metrics ordered by id ASC
- `getAllActivities()` → all activities ordered by id ASC
- `getAllGrades()` → all grades ordered by id ASC
- `getAllMeals()` → all meals ordered by id ASC
- `getAllEmbeddings()` → all embeddings ordered by entity_id ASC
- `importEntity(row)` → insert with explicit id and timestamps
- `importRelation(row)` → insert with explicit id and timestamps
- `importDataSource(row)` → insert with explicit id and timestamps
- `importHealthMetric(row)` → insert with explicit id and timestamps
- `importActivity(row)` → insert with explicit id and timestamps
- `importGrade(row)` → insert with explicit id and timestamps
- `importMeal(row)` → insert with explicit id and timestamps
- `getRecordCounts()` → `{ entities: N, relations: N, ... }` for metadata.json

---

### R7: Deterministic Output for Git Diff Friendliness

**Decision**: All output files use deterministic ordering:
- JSONL files: records ordered by primary key (id or entity_id) ascending
- CSV files: records ordered by primary key (id) ascending, header row first
- `metadata.json`: keys in fixed order (`schema_version`, `exported_at`, `record_counts`), pretty-printed with 2-space indent

**Rationale**: SC-006 requires meaningful line-level Git diffs. Deterministic ordering ensures that only actual data changes show up in diffs, not reordering artifacts. Pretty-printing `metadata.json` ensures human readability.

**JSONL key ordering**: Within each JSONL line, JSON keys are ordered by their column order in the schema (matching `SELECT *` column order from SQLite). `JSON.stringify()` preserves insertion order of object keys in modern JavaScript engines, so constructing objects with keys in schema order guarantees deterministic output.

---

### R8: Handling `created_at` and `updated_at` Timestamps During Import

**Decision**: Preserve original timestamps from the export. Import functions bypass the `DEFAULT (datetime('now'))` and the `updated_at` trigger by inserting explicit values for all timestamp columns.

**Rationale**: Round-trip identity (SC-003) requires that re-exported data matches the original export byte-for-byte. If import used `DEFAULT` timestamps, the `created_at` and `updated_at` values would differ, breaking round-trip comparison.

**Implementation detail**: The `updated_at` trigger fires `WHEN NEW.updated_at = OLD.updated_at`. Since we're doing INSERTs (not UPDATEs), the trigger doesn't fire on initial insert. And for the import, there are no subsequent updates, so the original timestamps are preserved.

---

### R9: Embedding Vector Serialization via vec_embeddings

**Decision**: Export embeddings by querying `vec_embeddings` for all rows. The `vec_embeddings` virtual table (vec0) stores vectors as binary blobs internally but returns them as JSON arrays via `SELECT embedding FROM vec_embeddings`. Import uses `upsertEmbedding()` from `db.mjs`.

**Rationale**: `sqlite-vec`'s vec0 tables support standard SQL SELECT and return vector data in a binary format that `better-sqlite3` surfaces as a Buffer. We need to convert this Buffer back to a Float32Array for JSON serialization.

**Implementation**:
- Export: `SELECT entity_id, embedding FROM vec_embeddings ORDER BY entity_id ASC`. The `embedding` column returns a Buffer of raw float32 bytes. Convert via `new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)`, then `Array.from(float32Array)` for JSON serialization.
- Import: Parse JSON array → `new Float32Array(array)` → `upsertEmbedding(entityId, float32Array)`.
