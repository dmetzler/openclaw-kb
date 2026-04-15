# Data Model: Generic Data Records Table

**Feature**: 004-generic-data-records
**Date**: 2026-04-14

## Entity Relationship Diagram

```
┌──────────────────┐       ┌─────────────────────────────┐
│   data_sources   │       │        data_records          │
├──────────────────┤       ├─────────────────────────────┤
│ id (PK)          │◄──FK──│ id (PK, AUTOINCREMENT)      │
│ name (UNIQUE)    │       │ source_id (FK, NOT NULL)     │
│ type             │       │ record_type (TEXT, NOT NULL)  │
│ config (JSON)    │       │ data (TEXT/JSON, NOT NULL)    │
│ is_active        │       │ recorded_at (TEXT, NOT NULL)  │
│ created_at       │       │ created_at (TEXT, DEFAULT now)│
│ updated_at       │       └─────────────────────────────┘
└──────────────────┘                │
                                    │ indexed by
                                    ▼
                          ┌─────────────────────┐
                          │    search_index      │
                          │    (FTS5 virtual)    │
                          ├─────────────────────┤
                          │ name = record_type   │
                          │ content_text = data  │
                          │ source_table =       │
                          │   'data_records'     │
                          │ source_id = id       │
                          └─────────────────────┘
```

## Tables

### data_records (NEW — replaces health_metrics, activities, grades, meals)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique record identifier |
| `source_id` | INTEGER | NOT NULL, FK → `data_sources(id)` | Origin data source |
| `record_type` | TEXT | NOT NULL, CHECK(length > 0) | Discriminator (e.g., "health_metric", "activity", "finance") |
| `data` | TEXT | NOT NULL | JSON object containing all record-specific fields |
| `recorded_at` | TEXT | NOT NULL | ISO 8601 timestamp of when the measurement/event occurred |
| `created_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Row creation timestamp |

**Indexes**:
- `idx_data_records_type_time ON data_records(record_type, recorded_at)` — composite index for type-filtered time-range queries

**FTS5 Triggers** (3 total, replacing 12 legacy triggers):

| Trigger | Event | Action |
|---------|-------|--------|
| `data_records_search_index_insert` | AFTER INSERT | Insert into `search_index` with `name=record_type`, `content_text=data`, `source_table='data_records'`, `source_id=id` |
| `data_records_search_index_update` | AFTER UPDATE | Delete old entry, insert new entry |
| `data_records_search_index_delete` | AFTER DELETE | Delete entry from `search_index` |

### Tables REMOVED

| Table | Record Type Mapping |
|-------|-------------------|
| `health_metrics` | `record_type = 'health_metric'` |
| `activities` | `record_type = 'activity'` |
| `grades` | `record_type = 'grade'` |
| `meals` | `record_type = 'meal'` |

### Tables UNCHANGED

- `entities` — knowledge graph nodes
- `relations` — knowledge graph edges
- `data_sources` — data source registry
- `search_index` — FTS5 virtual table (trigger sources change, schema unchanged)
- `vec_embeddings` — vector embeddings for entities
- `schema_migrations` — migration tracking

## Data Migration Mapping

### health_metrics → data_records

```sql
INSERT INTO data_records (id, source_id, record_type, data, recorded_at, created_at)
SELECT id, source_id, 'health_metric',
       json_object(
         'metric_type', metric_type,
         'value', value,
         'unit', unit,
         'metadata', json(metadata)
       ),
       recorded_at, created_at
FROM health_metrics;
```

### activities → data_records

```sql
INSERT INTO data_records (id, source_id, record_type, data, recorded_at, created_at)
SELECT id, source_id, 'activity',
       json_object(
         'activity_type', activity_type,
         'duration_minutes', duration_minutes,
         'intensity', intensity,
         'metadata', json(metadata)
       ),
       recorded_at, created_at
FROM activities;
```

**Note**: `id` values will collide across legacy tables. The migration must NOT preserve original IDs — use `NULL` for `id` to let AUTOINCREMENT assign new values. Alternatively, offset IDs per table. The safest approach is to omit `id` and let SQLite assign new sequential IDs.

**Revised approach**: Do NOT preserve legacy `id` values. The `data_records` table uses AUTOINCREMENT, and IDs from different legacy tables would collide. FTS5 triggers fire on INSERT, so search_index entries will reference the new IDs automatically.

### Revised Migration SQL Pattern

```sql
INSERT INTO data_records (source_id, record_type, data, recorded_at, created_at)
SELECT source_id, 'health_metric',
       json_object(
         'metric_type', metric_type,
         'value', value,
         'unit', unit,
         'metadata', json(metadata)
       ),
       recorded_at, created_at
FROM health_metrics;
```

### activities → data_records

```sql
INSERT INTO data_records (source_id, record_type, data, recorded_at, created_at)
SELECT source_id, 'activity',
       json_object(
         'activity_type', activity_type,
         'duration_minutes', duration_minutes,
         'intensity', intensity,
         'metadata', json(metadata)
       ),
       recorded_at, created_at
FROM activities;
```

### grades → data_records

```sql
INSERT INTO data_records (source_id, record_type, data, recorded_at, created_at)
SELECT source_id, 'grade',
       json_object(
         'subject', subject,
         'score', score,
         'scale', scale,
         'metadata', json(metadata)
       ),
       recorded_at, created_at
FROM grades;
```

### meals → data_records

```sql
INSERT INTO data_records (source_id, record_type, data, recorded_at, created_at)
SELECT source_id, 'meal',
       json_object(
         'meal_type', meal_type,
         'items', json(items),
         'nutrition', json(nutrition),
         'metadata', json(metadata)
       ),
       recorded_at, created_at
FROM meals;
```

## Validation Rules

| Rule | Enforcement | Error Message |
|------|-------------|---------------|
| `record_type` must be non-empty | CHECK constraint + JS validation | `"record_type is required and must be a non-empty string"` |
| `source_id` must reference existing data_source | FK constraint + JS pre-check | `"Data source with id {id} not found"` |
| `recorded_at` must be present in data | JS validation (extract from data object) | `"recorded_at is required"` |
| `data` must be valid JSON | Implicit (JSON.stringify in JS) | Standard JSON serialization errors |

## State Transitions

Not applicable — `data_records` has no lifecycle states. Records are inserted and can be queried or deleted. No update workflow is defined in the spec.

## JSON Data Shape by Record Type

### health_metric
```json
{
  "metric_type": "weight",
  "value": 75.5,
  "unit": "kg",
  "metadata": { "note": "morning" }
}
```

### activity
```json
{
  "activity_type": "running",
  "duration_minutes": 30,
  "intensity": "moderate",
  "metadata": {}
}
```

### grade
```json
{
  "subject": "Math",
  "score": 95,
  "scale": "100",
  "metadata": {}
}
```

### meal
```json
{
  "meal_type": "lunch",
  "items": ["sandwich", "apple"],
  "nutrition": { "calories": 450 },
  "metadata": {}
}
```

### Novel type (e.g., finance)
```json
{
  "amount": 42.50,
  "category": "groceries",
  "vendor": "Whole Foods"
}
```
