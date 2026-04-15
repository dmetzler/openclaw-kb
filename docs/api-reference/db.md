# db.mjs — Database Layer

The database layer provides all SQLite operations for OpenClaw KB. It manages entities, relations, data sources, data records, embeddings, full-text search, and schema migrations through a single `jarvis.db` file.

**Source:** `src/db.mjs` (809 lines)
**Driver:** `better-sqlite3` (synchronous SQLite)
**Extensions:** `sqlite-vec` (vector search via `vec0`)

---

## Constants

### `EMBEDDING_DIMENSIONS`

```js
export const EMBEDDING_DIMENSIONS = 384;
```

The dimensionality of embedding vectors stored in the `vec_embeddings` table. All embeddings must be exactly 384-dimensional Float32 arrays.

---

## Initialisation & Lifecycle

### `initDatabase(dbPath?)`

Initialises the SQLite database, creating tables and running pending migrations.

```js
import { initDatabase } from './db.mjs';

initDatabase();              // Uses default path: 'jarvis.db'
initDatabase('test.db');     // Custom path
```

**Parameters:**

| Name | Type | Default | Description |
|---|---|---|---|
| `dbPath` | string | `'jarvis.db'` | Path to the SQLite database file |

**Behaviour:**

1. Opens or creates the SQLite file
2. Enables WAL mode (`PRAGMA journal_mode = WAL`)
3. Enables foreign keys (`PRAGMA foreign_keys = ON`)
4. Loads the `sqlite-vec` extension
5. Executes `schema.sql` to create tables (uses `IF NOT EXISTS`)
6. Runs any pending migrations from `src/migrations/`

### `closeDatabase()`

Closes the database connection.

```js
import { closeDatabase } from './db.mjs';

closeDatabase();
```

---

## Schema Information

### `getSchemaVersion()`

Returns the number of applied migrations.

```js
const version = getSchemaVersion();
// → 1
```

**Returns:** `number`

### `getMigrationHistory()`

Returns all applied migrations with timestamps.

```js
const history = getMigrationHistory();
// → [{ name: '001-generic-data-records.sql', applied_at: '2024-01-15 10:00:00' }]
```

**Returns:** `Array<{ name: string, applied_at: string }>`

---

## Entity Operations

### `createEntity(name, type, attributes?)`

Creates a new entity in the knowledge graph.

```js
const entity = createEntity('React', 'technology', {
  description: 'A JavaScript library for building UIs'
});
// → { id: 1, name: 'React', type: 'technology', attributes: {...}, created_at: '...', updated_at: '...' }
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Entity name (must be non-empty) |
| `type` | string | Yes | Entity type (must be non-empty) |
| `attributes` | object | No | Arbitrary JSON metadata |

**Returns:** The created entity row.

**Constraints:** `name` and `type` must have `length > 0` (enforced by CHECK constraint).

### `getEntity(id)`

Retrieves an entity by ID.

```js
const entity = getEntity(1);
// → { id: 1, name: 'React', ... } or undefined
```

| Parameter | Type | Description |
|---|---|---|
| `id` | number | Entity ID |

**Returns:** Entity row or `undefined`.

### `updateEntity(id, updates)`

Updates an entity's fields.

```js
updateEntity(1, {
  name: 'React.js',
  attributes: { description: 'Updated description' }
});
```

| Parameter | Type | Description |
|---|---|---|
| `id` | number | Entity ID |
| `updates` | object | Fields to update (`name`, `type`, `attributes`) |

### `deleteEntity(id)`

Deletes an entity and its associated relations and embeddings (via CASCADE or manual cleanup).

```js
deleteEntity(1);
```

| Parameter | Type | Description |
|---|---|---|
| `id` | number | Entity ID |

### `getAllEntities()`

Returns all entities in the database.

```js
const entities = getAllEntities();
// → [{ id: 1, name: 'React', ... }, ...]
```

**Returns:** `Array<Entity>`

---

## Relation Operations

### `createRelation(sourceId, targetId, type, attributes?)`

Creates a directed relation between two entities.

```js
const relation = createRelation(1, 2, 'built_with', { confidence: 0.9 });
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `sourceId` | number | Yes | Source entity ID |
| `targetId` | number | Yes | Target entity ID |
| `type` | string | Yes | Relation type |
| `attributes` | object | No | Arbitrary JSON metadata |

**Constraints:**

- `source_id` must not equal `target_id` (CHECK constraint)
- `(source_id, target_id, type)` must be unique (UNIQUE constraint)
- Both entity IDs must exist (FOREIGN KEY constraint)

### `getRelationsFrom(entityId)`

Returns all relations where the given entity is the source.

```js
const outgoing = getRelationsFrom(1);
// → [{ id: 1, source_id: 1, target_id: 2, type: 'built_with', ... }]
```

### `getRelationsTo(entityId)`

Returns all relations where the given entity is the target.

```js
const incoming = getRelationsTo(2);
```

### `deleteRelation(id)`

Deletes a relation by ID.

```js
deleteRelation(1);
```

### `getAllRelations()`

Returns all relations in the database.

```js
const relations = getAllRelations();
```

**Returns:** `Array<Relation>`

---

## Embedding Operations

### `upsertEmbedding(entityId, embedding)`

Inserts or updates a vector embedding for an entity.

```js
const vec = new Float32Array(384);
// ... fill with embedding values
upsertEmbedding(1, vec);
```

| Parameter | Type | Description |
|---|---|---|
| `entityId` | number | Entity ID |
| `embedding` | Float32Array | 384-dimensional embedding vector |

The embedding must be exactly `EMBEDDING_DIMENSIONS` (384) elements.

### `deleteEmbedding(entityId)`

Removes the embedding for an entity.

```js
deleteEmbedding(1);
```

### `findNearestVectors(embedding, limit?)`

Finds the nearest embeddings by cosine distance.

```js
const nearest = findNearestVectors(queryVector, 10);
// → [{ entity_id: 5, distance: 0.12 }, ...]
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `embedding` | Float32Array | — | Query vector (384-dim) |
| `limit` | number | 10 | Maximum results |

**Returns:** `Array<{ entity_id: number, distance: number }>` sorted by ascending distance.

### `getAllEmbeddings()`

Returns all embeddings in the database.

```js
const embeddings = getAllEmbeddings();
// → [{ entity_id: 1, embedding: Float32Array(384) }, ...]
```

**Returns:** `Array<{ entity_id: number, embedding: Float32Array }>`

!!! note "Float32Array conversion"
    Embeddings are stored as raw buffers in SQLite. `getAllEmbeddings()` converts them back to `Float32Array` objects.

---

## Graph Traversal

### `traverseGraph(entityId, depth?)`

Traverses the knowledge graph outward from an entity.

```js
const graph = traverseGraph(1, 2);
// → [
//   { entity: {...}, depth: 0 },
//   { entity: {...}, depth: 1, relation: {...} },
//   { entity: {...}, depth: 2, relation: {...} }
// ]
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `entityId` | number | — | Starting entity ID |
| `depth` | number | 2 | Maximum traversal depth |

**Returns:** Array of visited nodes with their depth and the relation that led to them.

---

## Data Source Operations

### `createDataSource(name, options?)`

Creates a new data source.

```js
const source = createDataSource('Apple Health', {
  description: 'iPhone Health app data',
  config: { format: 'xml' }
});
```

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Unique source name |
| `options` | object | No | `description` and `config` fields |

**Constraints:** `name` must be unique.

### `getDataSource(id)`

Retrieves a data source by ID.

```js
const source = getDataSource(1);
```

### `updateDataSource(id, updates)`

Updates a data source's description or config.

```js
updateDataSource(1, { description: 'Updated', config: { format: 'json' } });
```

### `getAllDataSources()`

Returns all data sources.

```js
const sources = getAllDataSources();
```

---

## Data Record Operations

### `insertRecord(record)`

Inserts a data record into the data lake.

```js
const record = insertRecord({
  record_type: 'health_metric',
  source_id: 1,
  data: {
    source_id: 1,
    recorded_at: '2024-01-15T08:30:00Z',
    metric: 'blood_pressure',
    systolic: 120,
    diastolic: 80
  }
});
```

| Field | Type | Required | Description |
|---|---|---|---|
| `record_type` | string | Yes | Record category (non-empty) |
| `source_id` | number | Yes | Foreign key to `data_sources.id` |
| `data` | object | Yes | JSON payload (must include `source_id` and `recorded_at`) |

### `queryRecords(filters?)`

Queries data records with optional filtering.

```js
const records = queryRecords({
  record_type: 'health_metric',
  source_id: 1,
  from: '2024-01-01',
  to: '2024-01-31',
  jsonFilters: [{ path: '$.systolic', op: '>', value: 140 }],
  limit: 50,
  offset: 0
});
```

| Filter | Type | Default | Description |
|---|---|---|---|
| `record_type` | string | — | Filter by record type |
| `source_id` | number | — | Filter by data source |
| `from` | string | — | Start date (inclusive) on `recorded_at` |
| `to` | string | — | End date (inclusive) on `recorded_at` |
| `jsonFilters` | array | `[]` | JSON field conditions (`path`, `op`, `value`) |
| `limit` | number | 100 | Maximum rows |
| `offset` | number | 0 | Rows to skip |

**Returns:** `Array<DataRecord>`

### `getAllDataRecords()`

Returns all data records.

```js
const records = getAllDataRecords();
```

---

## Search

### `search(query, options?)`

Full-text search across entities and data records using FTS5.

```js
const results = search('machine learning');
// → [{ source_table: 'entities', source_id: 5, name: 'Machine Learning', snippet: '...', rank: -2.5 }]
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `query` | string | — | Search query (FTS5 special chars are auto-escaped) |
| `options.limit` | number | 20 | Maximum results |

**Query escaping:** Characters `* " ( ) : ^ ~ + - { } [ ]` are replaced with spaces before the FTS5 MATCH query.

**Returns:** `Array<{ source_table: string, source_id: number, name: string, snippet: string, rank: number }>`

---

## Bulk Retrieval

### `getRecordCounts()`

Returns row counts for all major tables.

```js
const counts = getRecordCounts();
// → { entities: 150, relations: 200, data_sources: 3, data_records: 500, embeddings: 100 }
```

---

## Import Functions

These functions are used by `kb-import.mjs` for database restoration. They bypass some validation checks to allow importing data with specific IDs.

### `importEntity(entity)`

Imports an entity with a specific ID (used during database restore).

```js
importEntity({ id: 1, name: 'React', type: 'technology', attributes: {}, created_at: '...', updated_at: '...' });
```

### `importRelation(relation)`

Imports a relation with a specific ID.

```js
importRelation({ id: 1, source_id: 1, target_id: 2, type: 'built_with', attributes: {} });
```

### `importDataSource(dataSource)`

Imports a data source with a specific ID.

### `importDataRecord(record)`

Imports a data record with a specific ID.

---

## Transaction Support

### `runTransaction(fn)`

Runs a function inside a SQLite transaction.

```js
runTransaction(() => {
  createEntity('A', 'type');
  createEntity('B', 'type');
  createRelation(1, 2, 'related');
});
```

| Parameter | Type | Description |
|---|---|---|
| `fn` | function | Synchronous function to execute inside the transaction |

If `fn` throws, the transaction is rolled back. Otherwise, it is committed.

---

## Database Configuration

The database is configured with these pragmas on initialisation:

| Pragma | Value | Purpose |
|---|---|---|
| `journal_mode` | WAL | Write-Ahead Logging for concurrent reads |
| `foreign_keys` | ON | Enforce foreign key constraints |

## Schema Reference

See [`schema.sql`](https://github.com/dmetzler/openclaw-kb/blob/main/src/schema.sql) for the complete table definitions, triggers, and virtual table configurations.
