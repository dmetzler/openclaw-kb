# API Contract: db.mjs — Generic Data Records

**Feature**: 004-generic-data-records
**Date**: 2026-04-14

This document defines the public API contract for the generic data records functions in `db.mjs`. These functions replace the 16 legacy functions for health_metrics, activities, grades, and meals.

## Functions Added

### `insertRecord(recordType, data)`

Inserts a single data record into the `data_records` table.

**Signature**:
```javascript
/**
 * Inserts a generic data record.
 *
 * @param {string} recordType - Non-empty record type discriminator (e.g., "health_metric", "finance").
 * @param {Object} data - Record payload. Must contain `source_id` (number) and `recorded_at` (string, ISO 8601).
 * @returns {{ id: number, source_id: number, record_type: string, data: Object, recorded_at: string, created_at: string }}
 * @throws {Error} If recordType is empty/missing, source_id is missing or references non-existent data_source, or recorded_at is missing.
 */
export function insertRecord(recordType, data)
```

**Input Validation**:
| Field | Rule | Error |
|-------|------|-------|
| `recordType` | Must be non-empty string | `"record_type is required and must be a non-empty string"` |
| `data.source_id` | Must be a number referencing an existing `data_sources` row | `"Data source with id {id} not found"` |
| `data.recorded_at` | Must be a non-empty string present in `data` | `"recorded_at is required"` |

**Behavior**:
1. Validate `recordType` is non-empty string.
2. Validate `data.source_id` exists in `data_sources`.
3. Validate `data.recorded_at` exists and is non-empty.
4. Extract `source_id` and `recorded_at` from `data` for the top-level columns.
5. Store the entire `data` object (including `source_id` and `recorded_at`) as JSON in the `data` column.
6. Return the inserted row with `data` parsed back to an object.

**Return shape**:
```json
{
  "id": 1,
  "source_id": 1,
  "record_type": "finance",
  "data": { "source_id": 1, "recorded_at": "2026-01-15", "amount": 42.50 },
  "recorded_at": "2026-01-15",
  "created_at": "2026-04-14T10:00:00"
}
```

---

### `queryRecords(recordType, filters)`

Queries data records by type with flexible filtering.

**Signature**:
```javascript
/**
 * Queries data records by type with optional filters.
 *
 * @param {string} recordType - Record type to filter by.
 * @param {Object} [filters={}]
 * @param {number} [filters.source_id] - Filter by data source.
 * @param {string} [filters.from] - Start of time range (recorded_at >=, inclusive).
 * @param {string} [filters.to] - End of time range (recorded_at <=, inclusive).
 * @param {number} [filters.limit=100] - Max results.
 * @param {number} [filters.offset=0] - Pagination offset.
 * @param {Object} [filters.jsonFilters] - Key-value pairs for top-level JSON field filtering via json_extract.
 * @returns {Object[]} Records ordered by recorded_at DESC.
 */
export function queryRecords(recordType, filters = {})
```

**Filter behavior**:
| Filter | SQL Translation |
|--------|----------------|
| `source_id` | `AND source_id = ?` |
| `from` | `AND recorded_at >= ?` |
| `to` | `AND recorded_at <= ?` |
| `jsonFilters.{key}` | `AND json_extract(data, '$.{key}') = ?` per key |
| `limit` | `LIMIT ?` (default: 100) |
| `offset` | `OFFSET ?` (default: 0) |

**Return**: Array of record objects with `data` parsed from JSON. Empty array if no matches (never throws for empty results).

**Sort order**: `ORDER BY recorded_at DESC` (spec FR-015).

---

### `getAllDataRecords()`

Returns all data records ordered by id ASC. Used by export.

**Signature**:
```javascript
/**
 * Returns all data records ordered by id ASC.
 *
 * @returns {{ id: number, source_id: number, record_type: string, data: Object, recorded_at: string, created_at: string }[]}
 */
export function getAllDataRecords()
```

---

### `importDataRecord(row)`

Imports a data record with explicit id and timestamps. Bypasses validation (used during import).

**Signature**:
```javascript
/**
 * Imports a data record with explicit id and timestamps.
 *
 * @param {{ id: number, source_id: number, record_type: string, data: Object, recorded_at: string, created_at: string }} row
 */
export function importDataRecord(row)
```

---

## Functions Modified

### `getRecordCounts()`

**Before** (returns static keys):
```javascript
{
  activities: 3,
  data_sources: 1,
  embeddings: 0,
  entities: 5,
  grades: 2,
  health_metrics: 4,
  meals: 1,
  relations: 3
}
```

**After** (dynamic keys for data records):
```javascript
{
  data_records: { health_metric: 4, activity: 3, grade: 2, meal: 1 },
  data_sources: 1,
  embeddings: 0,
  entities: 5,
  relations: 3
}
```

The `data_records` key contains an object mapping `record_type` to count. The four legacy keys (`health_metrics`, `activities`, `grades`, `meals`) are removed.

---

## Functions Removed (16 total)

| Function | Replacement |
|----------|-------------|
| `insertHealthMetric(record)` | `insertRecord('health_metric', data)` |
| `queryHealthMetrics(filters)` | `queryRecords('health_metric', filters)` |
| `insertActivity(record)` | `insertRecord('activity', data)` |
| `queryActivities(filters)` | `queryRecords('activity', filters)` |
| `insertGrade(record)` | `insertRecord('grade', data)` |
| `queryGrades(filters)` | `queryRecords('grade', filters)` |
| `insertMeal(record)` | `insertRecord('meal', data)` |
| `queryMeals(filters)` | `queryRecords('meal', filters)` |
| `getAllHealthMetrics()` | `getAllDataRecords()` or `queryRecords('health_metric', {})` |
| `getAllActivities()` | `getAllDataRecords()` or `queryRecords('activity', {})` |
| `getAllGrades()` | `getAllDataRecords()` or `queryRecords('grade', {})` |
| `getAllMeals()` | `getAllDataRecords()` or `queryRecords('meal', {})` |
| `importHealthMetric(row)` | `importDataRecord(row)` |
| `importActivity(row)` | `importDataRecord(row)` |
| `importGrade(row)` | `importDataRecord(row)` |
| `importMeal(row)` | `importDataRecord(row)` |

---

## Export/Import File Format Change

### Export: `data_records.jsonl`

One JSON object per line. Each line contains all columns from the `data_records` table.

```jsonl
{"id":1,"source_id":1,"record_type":"health_metric","data":{"metric_type":"weight","value":75.5,"unit":"kg","metadata":{}},"recorded_at":"2026-01-15","created_at":"2026-01-15T10:00:00"}
{"id":2,"source_id":1,"record_type":"finance","data":{"amount":42.50,"category":"groceries","source_id":1,"recorded_at":"2026-01-15"},"recorded_at":"2026-01-15","created_at":"2026-01-15T11:00:00"}
```

### Import: `REQUIRED_FILES` update

**Before**: `['metadata.json', 'data_sources.jsonl', 'entities.jsonl', 'relations.jsonl', 'health_metrics.csv', 'activities.csv', 'grades.csv', 'meals.csv', 'embeddings.jsonl']`

**After**: `['metadata.json', 'data_sources.jsonl', 'entities.jsonl', 'relations.jsonl', 'data_records.jsonl', 'embeddings.jsonl']`

9 files → 6 files.
