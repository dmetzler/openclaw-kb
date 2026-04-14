# Quickstart: SQLite Database Layer

**Branch**: `001-sqlite-db-layer` | **Date**: 2026-04-14

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
# Install dependencies
npm install better-sqlite3 sqlite-vec

# Dev dependencies (testing)
npm install --save-dev vitest
```

## Initialize the Database

```javascript
import { initDatabase } from './src/db.mjs';

// Creates jarvis.db in current directory, applies schema, runs migrations
const db = initDatabase();

// Or specify a custom path
const db = initDatabase('/path/to/my.db');
```

That's it. The database file is created, schema applied, extensions loaded, and migrations run — all in one call.

## Basic Usage

### Knowledge Graph

```javascript
import {
  initDatabase,
  createEntity,
  createRelation,
  traverseGraph,
  search,
  upsertEmbedding,
  findNearestVectors
} from './src/db.mjs';

initDatabase();

// Create entities
const alice = createEntity({ name: 'Alice', type: 'person' });
const acme = createEntity({
  name: 'Acme Corp',
  type: 'organization',
  metadata: { industry: 'tech', founded: 2010 }
});

// Create relationship
const rel = createRelation({
  source_id: alice.id,
  target_id: acme.id,
  type: 'works_at'
});

// Traverse the graph (find everything within 3 hops of Alice)
const subgraph = traverseGraph(alice.id, 3);
// → [{ id: 1, name: 'Alice', depth: 0, ... }, { id: 2, name: 'Acme Corp', depth: 1, ... }]
```

### Data Lake

```javascript
import {
  initDatabase,
  createDataSource,
  insertHealthMetric,
  queryHealthMetrics
} from './src/db.mjs';

initDatabase();

// Register a data source
const fitbit = createDataSource({ name: 'fitbit', type: 'api' });

// Insert health data
insertHealthMetric({
  source_id: fitbit.id,
  metric_type: 'heart_rate',
  value: 72,
  unit: 'bpm',
  recorded_at: '2026-04-14T10:30:00Z'
});

// Query by time range and source
const metrics = queryHealthMetrics({
  source_id: fitbit.id,
  from: '2026-04-14T00:00:00Z',
  to: '2026-04-14T23:59:59Z'
});
```

### Full-Text Search

```javascript
import { initDatabase, search } from './src/db.mjs';

initDatabase();

// Search across all indexed content
const results = search('machine learning');
// → [{ source_table: 'entities', source_id: 5, name: 'ML Basics', snippet: '...', rank: -2.3 }]

// Search within a specific table
const entityResults = search('machine learning', { source_table: 'entities', limit: 10 });
```

### Vector Similarity Search

```javascript
import {
  initDatabase,
  createEntity,
  upsertEmbedding,
  findNearestVectors,
  EMBEDDING_DIMENSIONS
} from './src/db.mjs';

initDatabase();

const entity = createEntity({ name: 'Neural Networks', type: 'concept' });

// Store an embedding (must be EMBEDDING_DIMENSIONS length — 384 by default)
const vector = new Array(EMBEDDING_DIMENSIONS).fill(0).map(() => Math.random());
upsertEmbedding(entity.id, vector);

// Find 5 nearest neighbors
const similar = findNearestVectors(vector, 5);
// → [{ entity_id: 3, distance: 0.12 }, { entity_id: 7, distance: 0.34 }, ...]
```

### Schema Migrations

Add SQL files to `src/migrations/`:

```
src/migrations/
├── 001-add-tags-column.sql
├── 002-add-entity-index.sql
```

Migrations are applied automatically on `initDatabase()`. Each runs in a transaction — if one fails, it rolls back and the database stays at the previous version.

```javascript
import { getSchemaVersion, getMigrationHistory } from './src/db.mjs';

console.log(getSchemaVersion());      // "002"
console.log(getMigrationHistory());   // [{ version: "001", ... }, { version: "002", ... }]
```

## Running Tests

```bash
# Install dev dependency
npm install --save-dev vitest

# Run all tests
npx vitest run

# Run tests in watch mode
npx vitest

# Run a specific test file
npx vitest run tests/unit/db.test.mjs
```

## Project Structure

```
src/
├── db.mjs               # Import this — sole public entry point
├── schema.sql           # Initial database schema (all 3 tiers)
└── migrations/          # Sequential SQL migration files
    └── .gitkeep

tests/
├── unit/
│   ├── db.test.mjs              # db.mjs public API unit tests
│   └── migrations.test.mjs      # Migration system tests
└── integration/
    ├── knowledge-graph.test.mjs # Graph CRUD + recursive traversal
    ├── data-lake.test.mjs       # Data lake CRUD + filtering
    ├── search.test.mjs          # FTS5 + vector search
    ├── schema-init.test.mjs     # Schema init + WAL/FK setup
    └── benchmark.test.mjs       # Performance benchmarks
```

## Key Design Decisions

1. **Synchronous API**: `better-sqlite3` is intentionally synchronous. No async/await needed — just call functions.
2. **No ORM**: Plain SQL inside `db.mjs`, plain objects outside. You never write SQL.
3. **Single file**: Everything in `jarvis.db`. Copy one file to backup/restore.
4. **Auto-sync search**: Insert an entity → it's immediately searchable. No rebuild needed.
5. **Migrations are automatic**: Just drop a `.sql` file in `migrations/` and restart.
