# CLI API Contract: kb-export.mjs & kb-import.mjs

**Feature**: 003-kb-export-import | **Date**: 2026-04-14

## kb-export.mjs

### Synopsis

```
node src/kb-export.mjs <output-directory> [--db <database-path>]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<output-directory>` | Yes | — | Path to the directory where export files will be written. Created if it doesn't exist. Existing files are overwritten (FR-020). |
| `--db <database-path>` | No | `jarvis.db` | Path to the SQLite database file to export. |

### Behavior

1. Open the database via `initDatabase(dbPath)`.
2. Create the output directory if it doesn't exist (including parent directories).
3. For each table, read all records ordered by primary key ASC and write to the corresponding file.
4. Write `metadata.json` last, containing schema version, export timestamp, and record counts.
5. Print progress to stdout as each table is exported.
6. Close the database and exit with code 0.

### Output Files

See [data-model.md](../data-model.md) for full format specifications.

| File | Format | Source Table |
|------|--------|-------------|
| `metadata.json` | JSON (pretty-printed, 2-space indent) | `schema_migrations` + counts |
| `data_sources.jsonl` | JSONL | `data_sources` |
| `entities.jsonl` | JSONL | `entities` |
| `relations.jsonl` | JSONL | `relations` |
| `health_metrics.csv` | RFC 4180 CSV | `health_metrics` |
| `activities.csv` | RFC 4180 CSV | `activities` |
| `grades.csv` | RFC 4180 CSV | `grades` |
| `meals.csv` | RFC 4180 CSV | `meals` |
| `embeddings.jsonl` | JSONL | `vec_embeddings` |

### Stdout Output

```
Exporting knowledge base from jarvis.db to ./export/
  data_sources: 2 records
  entities: 150 records
  relations: 300 records
  health_metrics: 1000 records
  activities: 500 records
  grades: 200 records
  meals: 800 records
  embeddings: 150 records
Export complete. 9 files written to ./export/
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Missing required argument (output directory) |
| 2 | Database file not found or cannot be opened |

### Error Messages

| Condition | Message |
|-----------|---------|
| No output directory argument | `Error: Output directory path is required.\nUsage: node src/kb-export.mjs <output-directory> [--db <database-path>]` |
| Database file not found | `Error: Database file not found: <path>` |
| Database open failure | `Error: Failed to open database: <error-message>` |

---

## kb-import.mjs

### Synopsis

```
node src/kb-import.mjs <export-directory> [--db <database-path>]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `<export-directory>` | Yes | — | Path to the directory containing export files to import. |
| `--db <database-path>` | No | `jarvis.db` | Path for the new SQLite database file. MUST NOT already exist (FR-010). |

### Behavior

1. Validate that the export directory exists.
2. Validate that all 9 expected files are present (FR-011).
3. Validate that the target database file does NOT already exist (FR-010).
4. Read and parse `metadata.json`. Validate schema version compatibility (R4).
5. Create a fresh database via `initDatabase(dbPath)`.
6. Begin a single transaction.
7. Import data in dependency order (see [data-model.md](../data-model.md)):
   - `data_sources.jsonl` → `data_sources`
   - `entities.jsonl` → `entities`
   - `relations.jsonl` → `relations`
   - `health_metrics.csv` → `health_metrics`
   - `activities.csv` → `activities`
   - `grades.csv` → `grades`
   - `meals.csv` → `meals`
   - `embeddings.jsonl` → `vec_embeddings`
8. Commit the transaction.
9. Print progress and summary to stdout.
10. Close the database and exit with code 0.

### On Failure

- Rollback the transaction.
- Close the database.
- Delete the database file (no partial imports).
- Print error details (file name, line number if applicable, error message) to stderr.
- Exit with non-zero code.

### Stdout Output

```
Importing knowledge base from ./export/ to jarvis.db
  Validating export directory... OK
  Schema version: 003 (compatible)
  data_sources: 2 records imported
  entities: 150 records imported
  relations: 300 records imported
  health_metrics: 1000 records imported
  activities: 500 records imported
  grades: 200 records imported
  meals: 800 records imported
  embeddings: 150 records imported
Import complete. Database created at jarvis.db
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Missing required argument (export directory) |
| 2 | Export directory not found |
| 3 | Missing export files |
| 4 | Target database already exists |
| 5 | Schema version incompatible |
| 6 | Data validation error (malformed JSONL/CSV) |

### Error Messages

| Condition | Message |
|-----------|---------|
| No export directory argument | `Error: Export directory path is required.\nUsage: node src/kb-import.mjs <export-directory> [--db <database-path>]` |
| Export directory not found | `Error: Export directory not found: <path>` |
| Missing files | `Error: Missing required files in export directory: <file1>, <file2>, ...` |
| Database already exists | `Error: Target database already exists: <path>. Import requires a fresh (non-existent) database path.` |
| Schema version mismatch | `Error: Export schema version <version> is newer than current version <current>. Cannot import from a newer schema.` |
| Malformed JSONL | `Error: Malformed JSON at <file>:<line>: <parse-error>` |
| Malformed CSV | `Error: Invalid CSV at <file>:<line>: <error-detail>` |
| FK violation | `Error: Foreign key violation at <file>:<line>: <detail>` |

---

## db.mjs API Additions

### Export Support Functions

```javascript
/**
 * Returns all entities ordered by id ASC.
 * @returns {{ id: number, name: string, type: string, metadata: Object, created_at: string, updated_at: string }[]}
 */
export function getAllEntities()

/**
 * Returns all relations ordered by id ASC.
 * @returns {{ id: number, source_id: number, target_id: number, type: string, metadata: Object, created_at: string }[]}
 */
export function getAllRelations()

/**
 * Returns all data sources ordered by id ASC.
 * @returns {{ id: number, name: string, type: string, config: Object, is_active: number, created_at: string, updated_at: string }[]}
 */
export function getAllDataSources()

/**
 * Returns all health metrics ordered by id ASC.
 * @returns {{ id: number, source_id: number, metric_type: string, value: number, unit: string, metadata: Object, recorded_at: string, created_at: string }[]}
 */
export function getAllHealthMetrics()

/**
 * Returns all activities ordered by id ASC.
 * @returns {{ id: number, source_id: number, activity_type: string, duration_minutes: number|null, intensity: string|null, metadata: Object, recorded_at: string, created_at: string }[]}
 */
export function getAllActivities()

/**
 * Returns all grades ordered by id ASC.
 * @returns {{ id: number, source_id: number, subject: string, score: number, scale: string|null, metadata: Object, recorded_at: string, created_at: string }[]}
 */
export function getAllGrades()

/**
 * Returns all meals ordered by id ASC.
 * @returns {{ id: number, source_id: number, meal_type: string, items: Array, nutrition: Object, metadata: Object, recorded_at: string, created_at: string }[]}
 */
export function getAllMeals()

/**
 * Returns all embeddings ordered by entity_id ASC.
 * @returns {{ entity_id: number, embedding: Float32Array }[]}
 */
export function getAllEmbeddings()

/**
 * Returns row counts for all exportable tables.
 * @returns {{ data_sources: number, entities: number, relations: number, health_metrics: number, activities: number, grades: number, meals: number, embeddings: number }}
 */
export function getRecordCounts()
```

### Import Support Functions

```javascript
/**
 * Imports an entity with explicit id and timestamps. Bypasses name/type validation.
 * @param {{ id: number, name: string, type: string, metadata: Object, created_at: string, updated_at: string }} row
 */
export function importEntity(row)

/**
 * Imports a relation with explicit id and timestamps.
 * @param {{ id: number, source_id: number, target_id: number, type: string, metadata: Object, created_at: string }} row
 */
export function importRelation(row)

/**
 * Imports a data source with explicit id and timestamps.
 * @param {{ id: number, name: string, type: string, config: Object, is_active: number, created_at: string, updated_at: string }} row
 */
export function importDataSource(row)

/**
 * Imports a health metric with explicit id and timestamps.
 * @param {{ id: number, source_id: number, metric_type: string, value: number, unit: string, metadata: Object, recorded_at: string, created_at: string }} row
 */
export function importHealthMetric(row)

/**
 * Imports an activity with explicit id and timestamps.
 * @param {{ id: number, source_id: number, activity_type: string, duration_minutes: number|null, intensity: string|null, metadata: Object, recorded_at: string, created_at: string }} row
 */
export function importActivity(row)

/**
 * Imports a grade with explicit id and timestamps.
 * @param {{ id: number, source_id: number, subject: string, score: number, scale: string|null, metadata: Object, recorded_at: string, created_at: string }} row
 */
export function importGrade(row)

/**
 * Imports a meal with explicit id and timestamps.
 * @param {{ id: number, source_id: number, meal_type: string, items: Array, nutrition: Object, metadata: Object, recorded_at: string, created_at: string }} row
 */
export function importMeal(row)
```

**Note**: Embedding import uses the existing `upsertEmbedding(entityId, vector)` function.

---

## csv.mjs Module Contract

### Exports

```javascript
/**
 * Serializes rows to RFC 4180 CSV string.
 * @param {string[]} headers - Column names for header row.
 * @param {Array<Array<string|number|null>>} rows - Data rows (same order as headers).
 * @returns {string} Complete CSV string with CRLF line endings (per RFC 4180).
 */
export function csvStringify(headers, rows)

/**
 * Parses an RFC 4180 CSV string into headers and rows.
 * Handles quoted fields, embedded newlines, escaped double quotes.
 * @param {string} text - Raw CSV text.
 * @returns {{ headers: string[], rows: string[][] }} Parsed result.
 */
export function csvParse(text)

/**
 * Escapes a single value for CSV output per RFC 4180.
 * @param {*} value - Value to escape. null/undefined → empty string. Objects → JSON.stringify.
 * @returns {string} CSV-safe field value.
 */
export function csvEscapeField(value)
```

### CSV Rules (RFC 4180)

1. Lines terminated with CRLF (`\r\n`).
2. First line is the header row.
3. Fields containing commas, double quotes, or newlines are enclosed in double quotes.
4. Double quotes within quoted fields are escaped by doubling (`""`).
5. `null` and `undefined` values serialize as empty fields.
6. Numbers serialize as unquoted decimal strings.
7. JSON objects/arrays serialize as their `JSON.stringify()` output, then CSV-escaped.
