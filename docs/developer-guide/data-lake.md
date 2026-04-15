# Data Lake & Record Types

The data lake is OpenClaw KB's system for storing structured, typed records that do not fit the entity-relation knowledge graph model. Health metrics, activity logs, grades, meals, and any other time-series or tabular data live in the data lake. This page covers the schema, API, and usage patterns.

## Why a Data Lake?

The knowledge graph excels at representing entities and their relationships, but not every piece of data is an entity. Consider:

- **A blood pressure reading** — It has a timestamp, two numeric values (systolic/diastolic), and a source. It is not an "entity" you would link to other entities.
- **A workout log** — A set of exercises with sets, reps, and weights, recorded at a specific time.
- **A course grade** — A score tied to a course and a date.

These are _records_ — structured data with a type, a source, a timestamp, and an arbitrary JSON payload. The data lake stores them in a single, generic table rather than creating a separate table for each record type.

## Schema

The data lake uses two tables: `data_sources` (where data comes from) and `data_records` (the data itself).

### `data_sources`

```sql
CREATE TABLE IF NOT EXISTS data_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  config TEXT,  -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

A data source represents an origin system — "Apple Health", "Fitbit", "Manual Entry", "University Portal", etc.

### `data_records`

```sql
CREATE TABLE IF NOT EXISTS data_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_type TEXT NOT NULL CHECK(length(record_type) > 0),
  source_id INTEGER NOT NULL REFERENCES data_sources(id),
  data TEXT NOT NULL,  -- JSON
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Type | Description |
|---|---|---|
| `id` | integer | Auto-increment primary key |
| `record_type` | text | Category label (e.g. `"health_metric"`, `"activity"`, `"grade"`) |
| `source_id` | integer | Foreign key to `data_sources.id` |
| `data` | JSON text | Arbitrary payload — the actual record data |
| `recorded_at` | ISO 8601 text | When the record was observed/measured |
| `created_at` | ISO 8601 text | When the row was inserted into the database |

!!! note "No fixed schema for `data`"
    The `data` column stores free-form JSON. There is no enforced schema beyond "must be valid JSON with a `source_id` and `recorded_at` field." This gives you flexibility to store any record type without schema migrations.

### Search Index Trigger

When a record is inserted, a trigger automatically adds it to the FTS5 search index:

```sql
CREATE TRIGGER IF NOT EXISTS data_records_ai AFTER INSERT ON data_records
BEGIN
  INSERT INTO search_index(source_table, source_id, name, content)
  VALUES ('data_records', NEW.id, NEW.record_type,
          NEW.record_type || ' ' || COALESCE(NEW.data, ''));
END;
```

This makes data records searchable via full-text search alongside entities.

## API

### Creating a Data Source

```js
import { createDataSource } from './db.mjs';

const source = createDataSource('Apple Health', {
  description: 'Imported from iPhone Health app',
  config: { importFormat: 'xml', lastSync: '2024-01-15' }
});
// → { id: 1, name: 'Apple Health', ... }
```

Data source names must be unique. Attempting to create a duplicate throws a constraint violation.

### Inserting Records

```js
import { insertRecord } from './db.mjs';

const record = insertRecord({
  record_type: 'health_metric',
  source_id: 1,
  data: {
    source_id: 1,
    recorded_at: '2024-01-15T08:30:00Z',
    metric: 'blood_pressure',
    systolic: 120,
    diastolic: 80,
    unit: 'mmHg'
  }
});
```

**Required fields in `data`:**

| Field | Type | Description |
|---|---|---|
| `source_id` | integer | Must match the top-level `source_id` |
| `recorded_at` | string | ISO 8601 timestamp of the observation |

Beyond these two fields, the `data` object can contain any structure.

**Validation:**

- `record_type` must be a non-empty string
- `data` must be an object (not null, not an array)
- `data.source_id` and `data.recorded_at` must be present

### Querying Records

```js
import { queryRecords } from './db.mjs';

// All health metrics from a source
const metrics = queryRecords({
  record_type: 'health_metric',
  source_id: 1
});

// Date range query
const january = queryRecords({
  record_type: 'health_metric',
  from: '2024-01-01',
  to: '2024-01-31'
});

// JSON field filtering
const highBP = queryRecords({
  record_type: 'health_metric',
  jsonFilters: [
    { path: '$.systolic', op: '>', value: 140 }
  ]
});

// Pagination
const page2 = queryRecords({
  record_type: 'health_metric',
  limit: 20,
  offset: 20
});
```

#### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `record_type` | string | — | Filter by record type (optional) |
| `source_id` | integer | — | Filter by data source (optional) |
| `from` | string | — | Start of date range (inclusive) on `recorded_at` |
| `to` | string | — | End of date range (inclusive) on `recorded_at` |
| `jsonFilters` | array | `[]` | Conditions on JSON fields (see below) |
| `limit` | integer | 100 | Maximum rows returned |
| `offset` | integer | 0 | Rows to skip (for pagination) |

#### JSON Filters

Each filter is an object with:

```js
{
  path: '$.systolic',   // json_extract path
  op: '>',              // comparison operator
  value: 140            // value to compare against
}
```

Supported operators: `=`, `!=`, `<`, `>`, `<=`, `>=`

Filters are translated to SQL `json_extract(data, path) op value` conditions and combined with `AND`.

### Retrieving Data Sources

```js
import { getDataSource, getAllDataSources } from './db.mjs';

// Single source by ID
const source = getDataSource(1);

// All sources
const sources = getAllDataSources();
```

### Updating a Data Source

```js
import { updateDataSource } from './db.mjs';

updateDataSource(1, {
  description: 'Updated description',
  config: { importFormat: 'xml', lastSync: '2024-02-01' }
});
```

## Record Type Conventions

While the system imposes no naming constraints beyond "non-empty string", the following conventions are recommended:

| Record Type | Use Case | Example Data Fields |
|---|---|---|
| `health_metric` | Vital signs, lab results | `metric`, `value`, `unit` |
| `activity` | Workouts, exercises | `activity_type`, `duration`, `calories` |
| `grade` | Academic grades | `course`, `score`, `max_score` |
| `meal` | Nutrition tracking | `meal_type`, `calories`, `items[]` |
| `sleep` | Sleep tracking | `duration`, `quality`, `stages` |
| `mood` | Mental health tracking | `rating`, `notes`, `tags[]` |

!!! tip "Naming convention"
    Use `snake_case` for record types. Keep them generic enough to avoid proliferation — `health_metric` is better than `blood_pressure_reading` because a single type can hold different metrics distinguished by a `metric` field inside the JSON data.

## Searching Data Records

Data records are included in search results via the FTS5 index (populated by the insert trigger). They appear as Tier 2 results in the hybrid search pipeline.

```js
import { search } from './wiki-search.mjs';

const results = await search('blood pressure');
// Results may include:
// - Tier 1: KG entities matching "blood pressure"
// - Tier 2: Data records with record_type or data containing "blood pressure"
// - Tier 3: Semantic matches from FTS5 + vector search
```

## Export & Import

Data sources and records are included in the full database export:

- `data_sources.jsonl` — One JSON object per line, one per data source
- `data_records.jsonl` — One JSON object per line, one per record

During import, data sources are imported first (to establish foreign key targets), then records.

See [Export & Import](../user-guide/export-import.md) for details on the export format.

## Related Pages

- [Architecture Overview](architecture.md) — System design and data model
- [Search Internals](search-internals.md) — How data records are searched
- [API: db.mjs](../api-reference/db.md) — Full function signatures for data lake operations
- [User Guide: Export & Import](../user-guide/export-import.md) — Exporting and importing data
