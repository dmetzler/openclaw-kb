# Data Model: Data Schema Registry

**Feature**: 010-data-schema-registry  
**Date**: 2026-04-15

## Entities

### DataSchema

Represents the contract definition for a data record type. Stored in the `data_schemas` table.

| Field | SQLite Type | Constraints | Description |
|-------|------------|-------------|-------------|
| `record_type` | TEXT | PRIMARY KEY, CHECK(length > 0), CHECK(matches `^[a-zA-Z0-9_-]+$`) | Unique identifier for the data type (e.g., `health_metric`) |
| `label` | TEXT | NOT NULL, CHECK(length > 0) | Human-readable name (e.g., "Health Metric") |
| `description` | TEXT | NOT NULL | Purpose and usage description |
| `json_schema` | TEXT | NOT NULL | JSON Schema (draft-07) definition, stored as JSON string |
| `example` | TEXT | NOT NULL | Complete example record, stored as JSON string |
| `created_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Registration timestamp (ISO 8601) |
| `updated_at` | TEXT | NOT NULL, DEFAULT datetime('now') | Last update timestamp (ISO 8601) |

**DDL** (migration `003-data-schema-registry.sql`):

```sql
CREATE TABLE IF NOT EXISTS data_schemas (
  record_type TEXT PRIMARY KEY CHECK(length(record_type) > 0),
  label TEXT NOT NULL CHECK(length(label) > 0),
  description TEXT NOT NULL DEFAULT '',
  json_schema TEXT NOT NULL DEFAULT '{}',
  example TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS data_schemas_updated_at
AFTER UPDATE ON data_schemas
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE data_schemas
  SET updated_at = datetime('now')
  WHERE record_type = NEW.record_type;
END;
```

### DataRecord (existing — no changes to table)

The existing `data_records` table is unchanged. The relationship between `DataRecord.record_type` and `DataSchema.record_type` is a **soft reference** — no foreign key constraint, since unregistered types are explicitly allowed.

| Field | SQLite Type | Constraints | Relationship |
|-------|------------|-------------|--------------|
| `record_type` | TEXT | NOT NULL, CHECK(length > 0) | Soft reference → `data_schemas.record_type` (validated in application layer when schema exists) |

## Relationships

```
DataSchema 1 ──── 0..* DataRecord
  (record_type)        (record_type)
  
  Soft reference: No FK constraint.
  Application-level validation in insertRecord().
  Records allowed without matching schema (with warning).
```

## Pre-registered Schemas

Six schemas are seeded on first initialization:

| record_type | label | Required Fields | Optional Fields |
|------------|-------|-----------------|-----------------|
| `health_metric` | Health Metric | metric_type (string), value (number), unit (string), recorded_at (string) | device (string) |
| `activity` | Activity | activity_type (string), duration_minutes (number), recorded_at (string) | distance_km (number), calories (number), avg_hr (number) |
| `grade` | Grade | student (string), subject (string), score (number), max_score (number), school_year (string), recorded_at (string) | coefficient (number), trimester (string) |
| `meal` | Meal | meal_type (string), items (array of strings), recorded_at (string) | calories_est (number) |
| `sleep` | Sleep | duration_hours (number), recorded_at (string) | quality (string), deep_sleep_pct (number), device (string) |
| `finance` | Finance | category (string), amount (number), currency (string), recorded_at (string) | description (string) |

## State Transitions

DataSchema has no state machine — it is a simple CRUD entity with upsert semantics:

- **Register (new)**: INSERT → triggers wiki page creation
- **Register (existing)**: UPDATE (replace) → triggers wiki page regeneration
- **Read**: SELECT by PK or full table scan — no state change

## Validation Rules

1. `record_type` MUST match `/^[a-zA-Z0-9_-]+$/` (FR-010)
2. `json_schema` MUST be a valid JSON object (parseable, typeof === 'object') (FR-011)
3. `json_schema` MUST be compilable by Ajv (valid JSON Schema draft-07)
4. `example` MUST be a valid JSON object
5. `label` MUST be a non-empty string
