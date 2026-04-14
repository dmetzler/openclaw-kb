# Research: SQLite Unified Schema & Database Abstraction Layer

**Branch**: `001-sqlite-db-layer` | **Date**: 2026-04-14

## R1: SQLite Driver — better-sqlite3

### Decision
Use `better-sqlite3` as the sole SQLite driver.

### Rationale
- Synchronous API is intentional — eliminates callback/promise complexity for a single-process database layer.
- Native C++ binding delivers the fastest SQLite performance in the Node.js ecosystem.
- Full ES module support: `import Database from 'better-sqlite3'`.
- Built-in support for `loadExtension()` — required for sqlite-vec.
- Transaction API (`db.transaction()`) auto-commits on success, auto-rolls back on throw — ideal for migration safety.
- `db.exec()` executes raw SQL strings (multi-statement) — perfect for applying schema.sql and migration files.
- `db.pragma()` for WAL mode and foreign key setup with `{ simple: true }` option.

### Alternatives Considered
- **sql.js** (Emscripten WASM port): Slower, no native extension loading, no `loadExtension()`.
- **node:sqlite** (built-in, Node.js 22+): Too new, limited API surface, extension loading support is experimental.

### Key API Patterns

**Connection lifecycle:**
```javascript
import Database from 'better-sqlite3';
const db = new Database('jarvis.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
```

**Cleanup on process exit:**
```javascript
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));
```

**Transaction with auto-rollback:**
```javascript
const migrate = db.transaction((sql) => {
  db.exec(sql);
});
// Throws on failure → automatic rollback
migrate(migrationSQL);
```

**Extension loading:**
```javascript
db.loadExtension('/path/to/extension.so');
```

---

## R2: Vector Search — sqlite-vec

### Decision
Use `sqlite-vec` (npm: `sqlite-vec`) for vector storage and KNN search via `vec0` virtual tables.

### Rationale
- Pure C extension — small, fast, no external dependencies.
- Designed by Alex Garcia (author of sqlite-utils ecosystem) — well-maintained, high-quality.
- Supports `float[N]` dimension syntax at table creation time.
- KNN via `WHERE embedding MATCH ? ORDER BY distance LIMIT k` — clean SQL syntax.
- Supports cosine and L2 distance metrics via `distance_metric=cosine` column option.
- Auxiliary columns (prefixed with `+`) for metadata storage alongside vectors.
- Node.js integration: `sqliteVec.load(db)` handles extension loading automatically.
- Vectors passed as `Float32Array` for efficient binary serialization.

### Alternatives Considered
- **sqlite-vss** (Faiss-based): Heavier, deprecated in favor of sqlite-vec by the same author.
- **sqlite-vector** (SQLiteAI): Different API, less community adoption for Node.js.
- **pgvector + PostgreSQL**: Violates the single-file SQLite constraint.

### Key API Patterns

**Loading:**
```javascript
import * as sqliteVec from 'sqlite-vec';
sqliteVec.load(db);
```

**Table creation:**
```sql
CREATE VIRTUAL TABLE vec_embeddings USING vec0(
  entity_id INTEGER PRIMARY KEY,
  embedding float[384] distance_metric=cosine
);
```

**Insert (Node.js):**
```javascript
const stmt = db.prepare('INSERT INTO vec_embeddings(rowid, embedding) VALUES (?, ?)');
stmt.run(BigInt(entityId), new Float32Array(vector));
```

**KNN query:**
```sql
SELECT rowid, distance
FROM vec_embeddings
WHERE embedding MATCH ?
ORDER BY distance
LIMIT ?;
```

### Open Decision: Embedding Dimensions
The spec says "configurable dimension" — we will default to 384 (MiniLM/all-MiniLM-L6-v2 output size) as the initial dimension, defined as a constant in `db.mjs`. This can be changed before first database creation. Dimension is fixed per table after creation.

---

## R3: Full-Text Search — FTS5

### Decision
Use SQLite FTS5 with external content tables and trigger-based auto-sync.

### Rationale
- FTS5 is built into the `better-sqlite3` distribution — no extension loading needed.
- External content mode (`content='source_table', content_rowid='id'`) avoids data duplication.
- Trigger-based sync (INSERT/UPDATE/DELETE) keeps the index in lockstep with source tables automatically — satisfies FR-008.
- Supports `rank` for relevance ordering and `snippet()` for result highlighting.
- Prefix indexing (`prefix='2 3 4'`) enables autocomplete-style searches.

### Alternatives Considered
- **FTS5 content table (default mode)**: Duplicates all text data — wasteful for our use case.
- **FTS5 contentless (`content=''`)**: Cannot rebuild index from source — too fragile.
- **External search engine (Meilisearch, Typesense)**: Violates single-file constraint.

### Key Patterns

**External content FTS table:**
```sql
CREATE VIRTUAL TABLE search_index USING fts5(
  name,
  content_text,
  source_type,
  content='entities',
  content_rowid='id',
  prefix='2 3'
);
```

**Auto-sync triggers (INSERT):**
```sql
CREATE TRIGGER entities_ai AFTER INSERT ON entities BEGIN
  INSERT INTO search_index(rowid, name, content_text, source_type)
  VALUES (new.id, new.name, new.description, 'entity');
END;
```

**Auto-sync triggers (DELETE):**
```sql
CREATE TRIGGER entities_ad AFTER DELETE ON entities BEGIN
  INSERT INTO search_index(search_index, rowid, name, content_text, source_type)
  VALUES ('delete', old.id, old.name, old.description, 'entity');
END;
```

**Auto-sync triggers (UPDATE — delete-then-insert pattern):**
```sql
CREATE TRIGGER entities_au AFTER UPDATE ON entities BEGIN
  INSERT INTO search_index(search_index, rowid, name, content_text, source_type)
  VALUES ('delete', old.id, old.name, old.description, 'entity');
  INSERT INTO search_index(rowid, name, content_text, source_type)
  VALUES (new.id, new.name, new.description, 'entity');
END;
```

**Search query:**
```sql
SELECT rowid, rank, snippet(search_index, 1, '<b>', '</b>', '...', 20) AS snippet
FROM search_index
WHERE search_index MATCH ?
ORDER BY rank;
```

### Design Decision: Unified vs Per-Table FTS
We will use a **unified search index** that aggregates searchable content from multiple source tables (entities + data lake tables) into a single FTS5 table. This requires a `source_type` discriminator column and separate trigger sets per source table.

Rationale: A single search endpoint is simpler for consumers. Per-table FTS would require union queries and separate rank normalization.

Trade-off: The unified FTS table cannot use `content='table_name'` since it spans multiple tables. It will be a **standalone FTS table** (not external content) with triggers that mirror data. This means slight data duplication in the FTS index, but guarantees cross-table search consistency.

---

## R4: Migration System Design

### Decision
File-based sequential migrations with a `schema_migrations` tracking table, one transaction per migration.

### Rationale
- Simple, proven pattern that requires no dependencies.
- Files named `NNN-description.sql` (zero-padded 3-digit prefix).
- A `schema_migrations` table tracks applied migrations by version number and timestamp.
- Each migration wrapped in `db.transaction()` — rollback on any failure.
- `db.exec()` applies multi-statement SQL files.
- Migration runner reads the `migrations/` directory, sorts by prefix, skips already-applied, applies remaining in order.

### Alternatives Considered
- **Knex migrations**: Adds a heavy ORM dependency — violates the "no ORM" assumption.
- **umzug**: Generic migration framework — overkill for SQL-only migrations.
- **Manual schema versioning (single version number)**: Doesn't track individual migrations — can't detect gaps or partial states.

### Key Design

**Tracking table:**
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Migration file naming:** `001-initial-indexes.sql`, `002-add-tags-column.sql`

**Runner pseudocode:**
```javascript
const files = readdirSync('migrations/').filter(f => /^\d{3}-.+\.sql$/.test(f)).sort();
const applied = db.prepare('SELECT version FROM schema_migrations').all().map(r => r.version);
for (const file of files) {
  const version = file.slice(0, 3);
  if (applied.includes(version)) continue;
  const sql = readFileSync(join('migrations/', file), 'utf8');
  const migrate = db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(version, file);
  });
  migrate(); // auto-rollback on failure
}
```

---

## R5: Recursive Graph Traversal

### Decision
Use SQLite recursive CTEs (`WITH RECURSIVE`) for graph traversal with cycle detection via visited-set tracking.

### Rationale
- Native SQLite feature — no extensions or application-level recursion needed.
- Cycle detection via a `visited` text column that accumulates visited IDs (comma-separated), checked with `INSTR()` or `NOT IN`.
- Depth limiting via a `depth` counter column in the CTE.
- Returns full paths for debugging and visualization.

### Alternatives Considered
- **Application-level BFS/DFS**: More flexible but requires multiple round-trips to the database — slower for large graphs.
- **Graph database (Neo4j)**: Violates single-file constraint.

### Key Pattern
```sql
WITH RECURSIVE traverse(id, name, type, depth, path) AS (
  SELECT id, name, type, 0, CAST(id AS TEXT)
  FROM entities WHERE id = ?
  UNION ALL
  SELECT e.id, e.name, e.type, t.depth + 1,
         t.path || ',' || CAST(e.id AS TEXT)
  FROM entities e
  JOIN relations r ON r.target_id = e.id
  JOIN traverse t ON t.id = r.source_id
  WHERE t.depth < ?
    AND INSTR(t.path, CAST(e.id AS TEXT)) = 0
)
SELECT * FROM traverse;
```

---

## R6: Connection Management and Concurrency

### Decision
Singleton connection pattern with WAL mode. Single-process access assumed.

### Rationale
- `better-sqlite3` is synchronous — one connection per process is standard.
- WAL mode enables concurrent readers with a single writer — sufficient for the spec's single-process assumption.
- Connection opened on module initialization, closed on process exit.
- `PRAGMA busy_timeout = 5000` provides graceful handling if a rare write lock occurs.

### Key Configuration
```javascript
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL'); // Safe with WAL, better write performance
```

---

## Summary of All Decisions

| Area | Decision | Key Dependency |
|------|----------|---------------|
| SQLite driver | better-sqlite3 | `better-sqlite3` npm |
| Vector search | sqlite-vec vec0 tables | `sqlite-vec` npm |
| Full-text search | FTS5 standalone with triggers | Built-in |
| Migrations | File-based sequential, transaction-per-migration | None |
| Graph traversal | Recursive CTEs with cycle detection | Built-in |
| Connection | Singleton, WAL, foreign keys ON | None |
| Module system | ES modules (.mjs) | Node.js 18+ |
| Embedding dimensions | 384 (configurable constant) | None |
| Distance metric | Cosine similarity | sqlite-vec |
