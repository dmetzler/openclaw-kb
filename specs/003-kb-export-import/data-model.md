# Data Model: Knowledge Base Export & Import

**Feature**: 003-kb-export-import | **Date**: 2026-04-14

## Export Directory Structure

An export directory is a flat filesystem directory containing one file per database table plus a metadata manifest:

```text
<export-dir>/
├── metadata.json          # Manifest: schema version, timestamp, record counts
├── data_sources.jsonl     # data_sources table (JSONL)
├── entities.jsonl         # entities table (JSONL)
├── relations.jsonl        # relations table (JSONL)
├── health_metrics.csv     # health_metrics table (CSV)
├── activities.csv         # activities table (CSV)
├── grades.csv             # grades table (CSV)
├── meals.csv              # meals table (CSV)
└── embeddings.jsonl       # vec_embeddings table (JSONL)
```

**Design rules**:
- No subdirectories — all files at the root of the export directory.
- File names are fixed (not configurable).
- JSONL for tables with nested/complex fields (JSON metadata, arrays, embedding vectors).
- CSV for tables with flat, regular column structures.

---

## File Formats

### metadata.json

```json
{
  "schema_version": "003",
  "exported_at": "2026-04-14T10:30:00.000Z",
  "record_counts": {
    "data_sources": 2,
    "entities": 150,
    "relations": 300,
    "health_metrics": 1000,
    "activities": 500,
    "grades": 200,
    "meals": 800,
    "embeddings": 150
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `schema_version` | `string \| null` | Latest applied migration version (e.g., `"003"`) or `null` if no migrations |
| `exported_at` | `string` | ISO 8601 timestamp of export execution |
| `record_counts` | `object` | Map of table name → row count for all exported tables |

**Format**: Pretty-printed JSON with 2-space indentation. Keys in fixed order: `schema_version`, `exported_at`, `record_counts`. Record counts keys in alphabetical order.

---

### data_sources.jsonl

One JSON object per line, ordered by `id` ASC.

```jsonl
{"id":1,"name":"fitbit-api","type":"api","config":{"api_key":"...","endpoint":"https://api.fitbit.com"},"is_active":1,"created_at":"2026-04-10T08:00:00","updated_at":"2026-04-10T08:00:00"}
{"id":2,"name":"manual-entry","type":"manual","config":{},"is_active":1,"created_at":"2026-04-11T09:00:00","updated_at":"2026-04-11T09:00:00"}
```

| Field | Type | Serialization |
|-------|------|---------------|
| `id` | `integer` | As-is |
| `name` | `string` | As-is |
| `type` | `string` | As-is |
| `config` | `object` | Nested JSON object (not escaped string) — FR-022 |
| `is_active` | `integer` | `1` or `0` (SQLite boolean) |
| `created_at` | `string` | ISO 8601 datetime from database |
| `updated_at` | `string` | ISO 8601 datetime from database |

---

### entities.jsonl

One JSON object per line, ordered by `id` ASC.

```jsonl
{"id":1,"name":"John Doe","type":"person","metadata":{"age":30,"tags":["engineer","parent"]},"created_at":"2026-04-10T08:00:00","updated_at":"2026-04-10T08:00:00"}
{"id":2,"name":"Acme Corp","type":"organization","metadata":{"industry":"tech"},"created_at":"2026-04-10T08:01:00","updated_at":"2026-04-10T08:01:00"}
```

| Field | Type | Serialization |
|-------|------|---------------|
| `id` | `integer` | As-is |
| `name` | `string` | As-is |
| `type` | `string` | As-is |
| `metadata` | `object` | Nested JSON object (not escaped string) — FR-022 |
| `created_at` | `string` | ISO 8601 datetime from database |
| `updated_at` | `string` | ISO 8601 datetime from database |

**Key invariant**: `metadata` is stored as a JSON string in SQLite. On export, it is parsed to an object and serialized as a nested JSON value in the JSONL line. This preserves structure and enables Git diffs of metadata changes.

---

### relations.jsonl

One JSON object per line, ordered by `id` ASC.

```jsonl
{"id":1,"source_id":1,"target_id":2,"type":"works_at","metadata":{"since":"2020"},"created_at":"2026-04-10T08:05:00"}
```

| Field | Type | Serialization |
|-------|------|---------------|
| `id` | `integer` | As-is |
| `source_id` | `integer` | As-is |
| `target_id` | `integer` | As-is |
| `type` | `string` | As-is |
| `metadata` | `object` | Nested JSON object — FR-022 |
| `created_at` | `string` | ISO 8601 datetime from database |

---

### health_metrics.csv

RFC 4180 CSV. Header row followed by data rows, ordered by `id` ASC.

```csv
id,source_id,metric_type,value,unit,metadata,recorded_at,created_at
1,1,heart_rate,72,bpm,"{""resting"":true}",2026-04-10T08:00:00,2026-04-10T08:00:00
2,1,weight,75.5,kg,"{}",2026-04-10T08:00:00,2026-04-10T08:00:00
```

| Column | Type | CSV Serialization |
|--------|------|-------------------|
| `id` | `integer` | Unquoted number |
| `source_id` | `integer` | Unquoted number |
| `metric_type` | `string` | Quoted if contains special chars |
| `value` | `real` | Unquoted number |
| `unit` | `string` | Quoted if contains special chars |
| `metadata` | `JSON string` | JSON serialized, then CSV-escaped (FR-023) |
| `recorded_at` | `string` | ISO 8601 datetime |
| `created_at` | `string` | ISO 8601 datetime |

---

### activities.csv

RFC 4180 CSV. Header row followed by data rows, ordered by `id` ASC.

```csv
id,source_id,activity_type,duration_minutes,intensity,metadata,recorded_at,created_at
1,1,running,30,moderate,"{}",2026-04-10T07:00:00,2026-04-10T08:00:00
```

| Column | Type | CSV Serialization |
|--------|------|-------------------|
| `id` | `integer` | Unquoted number |
| `source_id` | `integer` | Unquoted number |
| `activity_type` | `string` | Quoted if contains special chars |
| `duration_minutes` | `real \| null` | Unquoted number or empty |
| `intensity` | `string \| null` | Quoted if contains special chars, or empty |
| `metadata` | `JSON string` | JSON serialized, then CSV-escaped |
| `recorded_at` | `string` | ISO 8601 datetime |
| `created_at` | `string` | ISO 8601 datetime |

---

### grades.csv

RFC 4180 CSV. Header row followed by data rows, ordered by `id` ASC.

```csv
id,source_id,subject,score,scale,metadata,recorded_at,created_at
1,1,Mathematics,95,percentage,"{}",2026-04-10T09:00:00,2026-04-10T09:00:00
```

| Column | Type | CSV Serialization |
|--------|------|-------------------|
| `id` | `integer` | Unquoted number |
| `source_id` | `integer` | Unquoted number |
| `subject` | `string` | Quoted if contains special chars |
| `score` | `real` | Unquoted number |
| `scale` | `string \| null` | Quoted if contains special chars, or empty |
| `metadata` | `JSON string` | JSON serialized, then CSV-escaped |
| `recorded_at` | `string` | ISO 8601 datetime |
| `created_at` | `string` | ISO 8601 datetime |

---

### meals.csv

RFC 4180 CSV. Header row followed by data rows, ordered by `id` ASC.

```csv
id,source_id,meal_type,items,nutrition,metadata,recorded_at,created_at
1,1,breakfast,"[""oatmeal"",""coffee""]","{""calories"":350}","{}",2026-04-10T07:00:00,2026-04-10T07:30:00
```

| Column | Type | CSV Serialization |
|--------|------|-------------------|
| `id` | `integer` | Unquoted number |
| `source_id` | `integer` | Unquoted number |
| `meal_type` | `string` | Quoted if contains special chars |
| `items` | `JSON string` | JSON array serialized, then CSV-escaped |
| `nutrition` | `JSON string` | JSON object serialized, then CSV-escaped |
| `metadata` | `JSON string` | JSON object serialized, then CSV-escaped |
| `recorded_at` | `string` | ISO 8601 datetime |
| `created_at` | `string` | ISO 8601 datetime |

---

### embeddings.jsonl

One JSON object per line, ordered by `entity_id` ASC.

```jsonl
{"entity_id":1,"embedding":[0.0123, -0.456, 0.789, ...]}
{"entity_id":2,"embedding":[0.111, 0.222, -0.333, ...]}
```

| Field | Type | Serialization |
|-------|------|---------------|
| `entity_id` | `integer` | As-is |
| `embedding` | `number[]` | JSON array of 768 float32 values |

**Precision**: Values are the decimal representations of 32-bit floats as produced by `JSON.stringify(Array.from(float32Array))`. This produces the shortest decimal representation that round-trips through `parseFloat()` back to the same float32 bits.

---

## Import Dependency Order

```
data_sources ──┐
               ├── health_metrics
               ├── activities
               ├── grades
               └── meals

entities ──────┐
               ├── relations
               └── embeddings (vec_embeddings)
```

**Import sequence**: `data_sources` → `entities` → `relations` → `health_metrics` → `activities` → `grades` → `meals` → `embeddings`

All inserts within a single transaction. FTS5 `search_index` is populated automatically by existing insert triggers (entities, health_metrics, activities, grades, meals). No manual FTS rebuild needed.

---

## Validation Rules

### Pre-import validation (before any inserts):
1. Target database file MUST NOT exist (FR-010)
2. All 9 expected files MUST be present in export directory (FR-011)
3. `metadata.json` MUST parse as valid JSON
4. `schema_version` in metadata MUST be ≤ current schema version (R4)

### Per-record validation (during inserts):
1. Each JSONL line MUST parse as valid JSON
2. Each CSV row MUST have the correct number of columns
3. Required fields MUST be present and non-empty
4. Foreign key constraints enforced by SQLite (PRAGMA foreign_keys = ON)

### On any validation failure:
- Report file name, line number, and error details
- Rollback the entire transaction
- Delete the partially-created database file
- Exit with non-zero status code

---

## db.mjs API Additions

### Export functions (read-only, full-table scans):

| Function | Returns | SQL |
|----------|---------|-----|
| `getAllEntities()` | `Entity[]` | `SELECT * FROM entities ORDER BY id ASC` |
| `getAllRelations()` | `Relation[]` | `SELECT * FROM relations ORDER BY id ASC` |
| `getAllDataSources()` | `DataSource[]` | `SELECT * FROM data_sources ORDER BY id ASC` |
| `getAllHealthMetrics()` | `HealthMetric[]` | `SELECT * FROM health_metrics ORDER BY id ASC` |
| `getAllActivities()` | `Activity[]` | `SELECT * FROM activities ORDER BY id ASC` |
| `getAllGrades()` | `Grade[]` | `SELECT * FROM grades ORDER BY id ASC` |
| `getAllMeals()` | `Meal[]` | `SELECT * FROM meals ORDER BY id ASC` |
| `getAllEmbeddings()` | `{entity_id, embedding}[]` | `SELECT entity_id, embedding FROM vec_embeddings ORDER BY entity_id ASC` |
| `getRecordCounts()` | `{table: count}` | `SELECT COUNT(*) FROM <table>` for each table |

### Import functions (bulk insert with explicit IDs):

| Function | Parameters | Notes |
|----------|------------|-------|
| `importEntity(row)` | Full row including `id`, `created_at`, `updated_at` | Bypasses validation, preserves timestamps |
| `importRelation(row)` | Full row including `id`, `created_at` | Preserves original timestamps |
| `importDataSource(row)` | Full row including `id`, `created_at`, `updated_at` | Preserves original timestamps |
| `importHealthMetric(row)` | Full row including `id`, `created_at` | Preserves original timestamps |
| `importActivity(row)` | Full row including `id`, `created_at` | Preserves original timestamps |
| `importGrade(row)` | Full row including `id`, `created_at` | Preserves original timestamps |
| `importMeal(row)` | Full row including `id`, `created_at` | Preserves original timestamps |

**Note**: `upsertEmbedding()` already exists and accepts `(entityId, vector)`. No new import function needed for embeddings.

All JSON fields (`metadata`, `config`, `items`, `nutrition`) are accepted as objects and serialized to JSON strings internally by the import functions.
