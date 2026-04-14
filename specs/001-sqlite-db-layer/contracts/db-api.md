# db.mjs — Public API Contract

**Branch**: `001-sqlite-db-layer` | **Date**: 2026-04-14

This document defines the complete public interface of `src/db.mjs`. All functions listed here are the ONLY way application code interacts with the database. No raw SQL, no direct driver imports.

## Module Constants

```javascript
/** Default embedding vector dimensions. Must match vec0 table creation. */
export const EMBEDDING_DIMENSIONS = 384;
```

---

## Initialization & Lifecycle

### `initDatabase(dbPath?: string): Database`

Opens (or creates) the SQLite database, applies pragmas, loads extensions, initializes schema if needed, and runs pending migrations.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dbPath` | string | `'jarvis.db'` | Path to the database file |

**Returns:** Database handle object (opaque — consumers should not use it directly).

**Behavior:**
1. Opens database file via better-sqlite3 (creates if not exists).
2. Sets pragmas: `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`, `synchronous = NORMAL`.
3. Loads sqlite-vec extension via `sqliteVec.load(db)`.
4. If no tables exist: reads `schema.sql` from the module's directory and applies it via `db.exec()`.
5. Runs pending migrations from `migrations/` directory.
6. Registers process exit handlers (`exit`, `SIGHUP`, `SIGINT`, `SIGTERM`) to close the connection.

**Throws:** `Error` if database file is inaccessible, schema file is missing, or migration fails.

---

### `closeDatabase(): void`

Closes the database connection. Called automatically on process exit, but available for explicit cleanup.

**Throws:** Nothing (safe to call multiple times).

---

## Tier 1: Knowledge Graph — Entities

### `createEntity(entity): Entity`

Creates a new entity in the knowledge graph.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entity.name` | string | Yes | Entity name (non-empty) |
| `entity.type` | string | Yes | Entity classification |
| `entity.metadata` | object | No | Arbitrary metadata (default: `{}`) |

**Returns:**
```javascript
{
  id: number,        // Auto-generated ID
  name: string,
  type: string,
  metadata: object,  // Parsed JSON
  created_at: string,
  updated_at: string
}
```

**Throws:** `Error` if name or type is empty.

---

### `getEntity(id): Entity | null`

Retrieves an entity by its ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Entity ID |

**Returns:** Entity object (with `metadata` parsed from JSON) or `null` if not found.

---

### `updateEntity(id, updates): Entity`

Updates an entity's mutable fields.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Entity ID |
| `updates.name` | string | No | New name |
| `updates.type` | string | No | New type |
| `updates.metadata` | object | No | New metadata (replaces entirely) |

**Returns:** Updated entity object.

**Throws:** `Error` if entity not found, or if name/type is set to empty string.

---

### `deleteEntity(id): boolean`

Deletes an entity and cascades to its relations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Entity ID |

**Returns:** `true` if entity existed and was deleted, `false` if not found.

---

## Tier 1: Knowledge Graph — Relations

### `createRelation(relation): Relation`

Creates a directed relationship between two entities.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `relation.source_id` | number | Yes | Source entity ID |
| `relation.target_id` | number | Yes | Target entity ID |
| `relation.type` | string | Yes | Relationship type |
| `relation.metadata` | object | No | Relation metadata (default: `{}`) |

**Returns:**
```javascript
{
  id: number,
  source_id: number,
  target_id: number,
  type: string,
  metadata: object,
  created_at: string
}
```

**Throws:** `Error` if source or target entity doesn't exist, if `source_id === target_id`, if type is empty, or if duplicate relation exists.

---

### `getRelationsFrom(entityId): Relation[]`

Gets all outbound relations from an entity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityId` | number | Yes | Source entity ID |

**Returns:** Array of relation objects (may be empty).

---

### `getRelationsTo(entityId): Relation[]`

Gets all inbound relations to an entity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityId` | number | Yes | Target entity ID |

**Returns:** Array of relation objects (may be empty).

---

### `deleteRelation(id): boolean`

Deletes a specific relation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Relation ID |

**Returns:** `true` if relation existed and was deleted, `false` if not found.

---

### `traverseGraph(startEntityId, maxDepth): TraversalResult[]`

Performs recursive graph traversal from a starting entity, following outbound relations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startEntityId` | number | Yes | Starting entity ID |
| `maxDepth` | number | Yes | Maximum hops to traverse (1-based) |

**Returns:**
```javascript
[
  {
    id: number,         // Entity ID
    name: string,
    type: string,
    depth: number,      // Distance from start (0 = start entity)
    path: string        // Comma-separated ID path from start
  },
  // ...
]
```

**Behavior:**
- Follows outbound relations recursively up to `maxDepth`.
- Detects and skips cycles (entities already in the path).
- Returns the starting entity at depth 0.
- Results ordered by depth, then by entity ID.

**Throws:** `Error` if starting entity doesn't exist.

---

## Tier 2: Data Lake — Data Sources

### `createDataSource(source): DataSource`

Registers a new data source.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source.name` | string | Yes | Unique source name |
| `source.type` | string | Yes | Source type: "api", "manual", "import" |
| `source.config` | object | No | Source configuration (default: `{}`) |

**Returns:** DataSource object with `id`, `is_active: true`, timestamps.

**Throws:** `Error` if name already exists or is empty.

---

### `getDataSource(id): DataSource | null`

Retrieves a data source by ID.

---

### `updateDataSource(id, updates): DataSource`

Updates a data source. Supports changing `name`, `type`, `config`, `is_active`.

**Throws:** `Error` if data source not found.

---

## Tier 2: Data Lake — Records

Each data lake table has a consistent set of functions following this pattern:

### `insertHealthMetric(record): HealthMetric`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `record.source_id` | number | Yes | Data source ID |
| `record.metric_type` | string | Yes | Measurement type |
| `record.value` | number | Yes | Numeric measurement |
| `record.unit` | string | Yes | Unit of measurement |
| `record.metadata` | object | No | Additional context (default: `{}`) |
| `record.recorded_at` | string | Yes | ISO 8601 timestamp |

**Returns:** Inserted record with `id` and `created_at`.

### `queryHealthMetrics(filters): HealthMetric[]`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters.source_id` | number | No | Filter by data source |
| `filters.metric_type` | string | No | Filter by metric type |
| `filters.from` | string | No | Start of time range (inclusive) |
| `filters.to` | string | No | End of time range (inclusive) |
| `filters.limit` | number | No | Max results (default: 100) |
| `filters.offset` | number | No | Pagination offset (default: 0) |

**Returns:** Array of records ordered by `recorded_at` ASC.

---

### `insertActivity(record): Activity`

Same pattern as `insertHealthMetric` with fields: `source_id`, `activity_type`, `duration_minutes`, `intensity`, `metadata`, `recorded_at`.

### `queryActivities(filters): Activity[]`

Same filter pattern: `source_id`, `activity_type`, `from`, `to`, `limit`, `offset`.

---

### `insertGrade(record): Grade`

Fields: `source_id`, `subject`, `score`, `scale`, `metadata`, `recorded_at`.

### `queryGrades(filters): Grade[]`

Filter pattern: `source_id`, `subject`, `from`, `to`, `limit`, `offset`.

---

### `insertMeal(record): Meal`

Fields: `source_id`, `meal_type`, `items` (array), `nutrition`, `metadata`, `recorded_at`.

### `queryMeals(filters): Meal[]`

Filter pattern: `source_id`, `meal_type`, `from`, `to`, `limit`, `offset`.

---

## Tier 3: Search Infrastructure

### `search(query, options?): SearchResult[]`

Performs full-text search across all indexed content.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | FTS5 search query |
| `options.source_table` | string | No | Filter to specific table (e.g., "entities") |
| `options.limit` | number | No | Max results (default: 20) |

**Returns:**
```javascript
[
  {
    source_table: string,  // "entities", "health_metrics", etc.
    source_id: number,     // ID in the source table
    name: string,          // Matched name/title
    snippet: string,       // Highlighted excerpt
    rank: number           // Relevance score (lower = more relevant)
  },
  // ...
]
```

**Behavior:**
- Uses FTS5 MATCH syntax.
- Results ordered by relevance rank.
- Special characters in query are escaped to prevent FTS5 syntax errors.

**Throws:** `Error` if query is empty.

---

### `upsertEmbedding(entityId, vector): void`

Stores or replaces a vector embedding for an entity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityId` | number | Yes | Entity ID |
| `vector` | number[] \| Float32Array | Yes | Embedding vector |

**Throws:** `Error` if entity doesn't exist, or if vector dimensions don't match `EMBEDDING_DIMENSIONS`.

---

### `deleteEmbedding(entityId): boolean`

Removes a vector embedding for an entity.

**Returns:** `true` if embedding existed and was removed, `false` otherwise.

---

### `findNearestVectors(queryVector, k?): VectorResult[]`

Performs K-nearest-neighbor search.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queryVector` | number[] \| Float32Array | Yes | Query vector |
| `k` | number | No | Number of neighbors (default: 5) |

**Returns:**
```javascript
[
  {
    entity_id: number,
    distance: number     // Cosine distance (0 = identical)
  },
  // ...
]
```

**Throws:** `Error` if vector dimensions don't match `EMBEDDING_DIMENSIONS`.

---

## Migrations

### `getSchemaVersion(): string | null`

Returns the latest applied migration version, or `null` if no migrations have been applied.

---

### `getMigrationHistory(): MigrationRecord[]`

Returns all applied migrations in order.

**Returns:**
```javascript
[
  { version: "001", name: "001-add-tags.sql", applied_at: "2026-04-14T..." },
  // ...
]
```

---

## Error Handling Contract

All functions follow these rules:
- **Validation errors** (empty name, wrong dimensions) → throw `Error` with descriptive message.
- **Not found** (getEntity, updateEntity) → return `null` for get, throw `Error` for update/delete.
- **Constraint violations** (duplicate relation, FK violation) → throw `Error` with specific cause.
- **Database errors** (corruption, disk full) → throw the underlying better-sqlite3 error with original message preserved.

No function silently ignores errors. No function returns error codes — exceptions only.

---

## Return Value Contract

- All returned objects are **plain JavaScript objects** (no class instances, no proxies).
- All `metadata`, `config`, `items`, and `nutrition` fields are **parsed JSON** (objects/arrays), never raw JSON strings.
- All timestamp fields are **ISO 8601 strings**.
- All ID fields are **numbers** (not BigInt).
- Arrays are returned even for single results in list operations.
- `null` is returned for single-item lookups that find nothing.
