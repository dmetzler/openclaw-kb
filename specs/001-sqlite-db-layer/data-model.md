# Data Model: SQLite Unified Schema & Database Abstraction Layer

**Branch**: `001-sqlite-db-layer` | **Date**: 2026-04-14

## Overview

All tables reside in a single SQLite file (`jarvis.db`). The schema is organized into three logical tiers plus infrastructure tables.

---

## Tier 1: Knowledge Graph

### entities

The core node table for the knowledge graph. Each entity represents a piece of knowledge (person, concept, fact, event).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique entity identifier |
| `name` | TEXT | NOT NULL | Human-readable entity name |
| `type` | TEXT | NOT NULL | Classification (person, concept, fact, event, etc.) |
| `metadata` | TEXT | DEFAULT '{}' | JSON-encoded extensible metadata |
| `created_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | ISO 8601 creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | ISO 8601 last-modified timestamp |

**Indexes:**
- `idx_entities_type` ON `entities(type)` — filter by classification
- `idx_entities_name` ON `entities(name)` — lookup by name

**Validation rules:**
- `name` must be non-empty (CHECK constraint: `length(name) > 0`)
- `type` must be non-empty (CHECK constraint: `length(type) > 0`)
- `metadata` must be valid JSON (validated at application level in db.mjs, not via SQL constraint)
- `updated_at` must be updated on every modification (handled via UPDATE trigger)

**Triggers:**
- `entities_updated_at`: AFTER UPDATE — sets `updated_at = datetime('now')`

---

### relations

Directed, typed edges connecting two entities in the knowledge graph.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique relation identifier |
| `source_id` | INTEGER | NOT NULL, FK → entities(id) ON DELETE CASCADE | Source entity |
| `target_id` | INTEGER | NOT NULL, FK → entities(id) ON DELETE CASCADE | Target entity |
| `type` | TEXT | NOT NULL | Relationship type (works_at, related_to, caused_by, etc.) |
| `metadata` | TEXT | DEFAULT '{}' | JSON-encoded relation metadata |
| `created_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | ISO 8601 creation timestamp |

**Indexes:**
- `idx_relations_source` ON `relations(source_id)` — outbound traversal
- `idx_relations_target` ON `relations(target_id)` — inbound traversal
- `idx_relations_type` ON `relations(type)` — filter by relationship type
- UNIQUE constraint on `(source_id, target_id, type)` — prevent duplicate edges

**Validation rules:**
- `source_id` and `target_id` must reference existing entities (FK enforced)
- `source_id != target_id` (CHECK constraint — no self-loops)
- `type` must be non-empty (CHECK constraint: `length(type) > 0`)

---

## Tier 2: Data Lake

### data_sources

Registry of data origins feeding into the data lake tables.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique source identifier |
| `name` | TEXT | NOT NULL, UNIQUE | Source name (e.g., "fitbit", "manual", "school_api") |
| `type` | TEXT | NOT NULL | Source type: "api", "manual", "import" |
| `config` | TEXT | DEFAULT '{}' | JSON-encoded source configuration |
| `is_active` | INTEGER | NOT NULL, DEFAULT 1 | Active flag (1=active, 0=inactive) |
| `created_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | ISO 8601 creation timestamp |
| `updated_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | ISO 8601 last-modified timestamp |

**Indexes:**
- `idx_data_sources_active` ON `data_sources(is_active)` — filter active sources

**Triggers:**
- `data_sources_updated_at`: AFTER UPDATE — sets `updated_at = datetime('now')`

---

### health_metrics

Timestamped health measurements attributed to a data source.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique record identifier |
| `source_id` | INTEGER | NOT NULL, FK → data_sources(id) | Origin data source |
| `metric_type` | TEXT | NOT NULL | Measurement type (weight, heart_rate, blood_pressure, sleep_duration, etc.) |
| `value` | REAL | NOT NULL | Numeric measurement value |
| `unit` | TEXT | NOT NULL | Unit of measurement (kg, bpm, mmHg, hours, etc.) |
| `metadata` | TEXT | DEFAULT '{}' | JSON-encoded additional context |
| `recorded_at` | TEXT | NOT NULL | ISO 8601 timestamp of measurement |
| `created_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | ISO 8601 insert timestamp |

**Indexes:**
- `idx_health_metrics_time` ON `health_metrics(recorded_at)` — time-range queries
- `idx_health_metrics_source` ON `health_metrics(source_id)` — filter by source
- `idx_health_metrics_type` ON `health_metrics(metric_type)` — filter by metric

---

### activities

Timestamped physical or tracked activity records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique record identifier |
| `source_id` | INTEGER | NOT NULL, FK → data_sources(id) | Origin data source |
| `activity_type` | TEXT | NOT NULL | Activity type (exercise, steps, workout, etc.) |
| `duration_minutes` | REAL | | Duration in minutes |
| `intensity` | TEXT | | Intensity level (low, moderate, high) |
| `metadata` | TEXT | DEFAULT '{}' | JSON-encoded additional data (distance, calories, etc.) |
| `recorded_at` | TEXT | NOT NULL | ISO 8601 timestamp of activity |
| `created_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | ISO 8601 insert timestamp |

**Indexes:**
- `idx_activities_time` ON `activities(recorded_at)` — time-range queries
- `idx_activities_source` ON `activities(source_id)` — filter by source
- `idx_activities_type` ON `activities(activity_type)` — filter by activity type

---

### grades

Academic or evaluation scores.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique record identifier |
| `source_id` | INTEGER | NOT NULL, FK → data_sources(id) | Origin data source |
| `subject` | TEXT | NOT NULL | Subject or course name |
| `score` | REAL | NOT NULL | Numeric score value |
| `scale` | TEXT | | Grading scale context (e.g., "0-100", "A-F", "GPA 4.0") |
| `metadata` | TEXT | DEFAULT '{}' | JSON-encoded additional context (semester, teacher, etc.) |
| `recorded_at` | TEXT | NOT NULL | ISO 8601 date of evaluation |
| `created_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | ISO 8601 insert timestamp |

**Indexes:**
- `idx_grades_time` ON `grades(recorded_at)` — time-range queries
- `idx_grades_source` ON `grades(source_id)` — filter by source
- `idx_grades_subject` ON `grades(subject)` — filter by subject

---

### meals

Food consumption records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique record identifier |
| `source_id` | INTEGER | NOT NULL, FK → data_sources(id) | Origin data source |
| `meal_type` | TEXT | NOT NULL | Meal classification: "breakfast", "lunch", "dinner", "snack" |
| `items` | TEXT | NOT NULL | JSON-encoded array of food items |
| `nutrition` | TEXT | DEFAULT '{}' | JSON-encoded nutritional data (calories, macros, etc.) |
| `metadata` | TEXT | DEFAULT '{}' | JSON-encoded additional context |
| `recorded_at` | TEXT | NOT NULL | ISO 8601 timestamp of meal |
| `created_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | ISO 8601 insert timestamp |

**Indexes:**
- `idx_meals_time` ON `meals(recorded_at)` — time-range queries
- `idx_meals_source` ON `meals(source_id)` — filter by source
- `idx_meals_type` ON `meals(meal_type)` — filter by meal type

**Validation rules (all data lake tables):**
- `source_id` must reference an existing data source (FK enforced)
- `recorded_at` must be a valid ISO 8601 string (validated at application level)

---

## Tier 3: Search Infrastructure

### search_index (FTS5)

Unified full-text search index aggregating searchable content from entities and data lake tables.

```sql
CREATE VIRTUAL TABLE search_index USING fts5(
  name,
  content_text,
  source_table,
  source_id UNINDEXED,
  prefix='2 3'
);
```

| Column | Type | Description |
|--------|------|-------------|
| `rowid` | INTEGER | FTS5 internal row ID (auto-assigned) |
| `name` | TEXT | Primary searchable name/title |
| `content_text` | TEXT | Searchable body text (description, metadata summary, items) |
| `source_table` | TEXT | Discriminator: "entities", "health_metrics", "activities", "grades", "meals" |
| `source_id` | INTEGER (UNINDEXED) | ID in the source table — for joining back to full records |

**Design notes:**
- Standalone FTS table (not external content) because it aggregates multiple source tables.
- `source_id` is UNINDEXED — stored for joining but not searchable.
- `source_table` is indexed — allows filtering search to a specific tier.
- Trigger sets on `entities`, `health_metrics`, `activities`, `grades`, `meals` keep the index in sync.
- Each source table has INSERT/UPDATE/DELETE triggers that mirror relevant fields into `search_index`.

**Trigger mapping per source table:**

| Source Table | `name` column maps to | `content_text` column maps to |
|-------------|----------------------|------------------------------|
| entities | `name` | `metadata` (JSON text) |
| health_metrics | `metric_type` | `unit \|\| ' ' \|\| value` |
| activities | `activity_type` | `metadata` |
| grades | `subject` | `score \|\| ' ' \|\| COALESCE(scale, '')` |
| meals | `meal_type` | `items` |

---

### vec_embeddings (vec0)

Vector storage for semantic similarity search, associated with entities.

```sql
CREATE VIRTUAL TABLE vec_embeddings USING vec0(
  entity_id INTEGER PRIMARY KEY,
  embedding float[768] distance_metric=cosine
);
```

| Column | Type | Description |
|--------|------|-------------|
| `entity_id` | INTEGER | References entities(id) — the entity this embedding represents |
| `embedding` | float[768] | 768-dimensional float vector (cosine distance metric) |

**Design notes:**
- `entity_id` maps to `entities.id` (not enforced by FK — vec0 is a virtual table).
- Application-level validation in db.mjs ensures `entity_id` references a valid entity.
- Dimension (768) is a module-level constant, configurable before first database creation.
- Vectors passed as `Float32Array` from JavaScript.
- KNN query: `WHERE embedding MATCH ? ORDER BY distance LIMIT k`.
- Application validates vector dimensions match before INSERT (sqlite-vec rejects mismatches, but we provide a clear error first).

---

## Infrastructure Tables

### schema_migrations

Tracks applied database migrations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `version` | TEXT | PRIMARY KEY | Migration version (e.g., "001") |
| `name` | TEXT | NOT NULL | Full migration filename |
| `applied_at` | TEXT | NOT NULL, DEFAULT `datetime('now')` | ISO 8601 timestamp of application |

---

## Entity Relationship Diagram (Text)

```
┌─────────────┐     ┌─────────────┐
│  entities    │◄────│  relations   │ (source_id, target_id → entities.id)
│             │────►│             │
└──────┬──────┘     └─────────────┘
       │
       │ entity_id
       ▼
┌──────────────┐
│vec_embeddings│ (vec0 virtual table)
└──────────────┘

┌──────────────┐     ┌────────────────┐
│ data_sources │◄────│ health_metrics │ (source_id → data_sources.id)
│              │◄────│ activities     │
│              │◄────│ grades         │
│              │◄────│ meals          │
└──────────────┘     └────────────────┘

┌──────────────┐
│ search_index │ (FTS5 — fed by triggers on entities + all lake tables)
└──────────────┘

┌───────────────────┐
│ schema_migrations │ (infrastructure — tracks applied migrations)
└───────────────────┘
```

## State Transitions

### Entity Lifecycle
- Created → exists in `entities` table, auto-indexed in `search_index` via trigger
- Updated → `updated_at` auto-set via trigger, `search_index` updated via trigger
- Deleted → CASCADE removes related `relations` rows, trigger removes from `search_index`
- Embedding added → row in `vec_embeddings` with matching `entity_id`
- Embedding removed → row deleted from `vec_embeddings`

### Data Source Lifecycle
- Created → `is_active = 1` by default
- Deactivated → `is_active = 0`, existing records remain accessible
- Records always reference their source via `source_id` FK

### Migration Lifecycle
- Pending → file exists in `migrations/` but version not in `schema_migrations`
- Applied → version recorded in `schema_migrations` with timestamp
- Failed → transaction rolled back, version NOT recorded, error reported
