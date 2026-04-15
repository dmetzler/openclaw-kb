import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sqliteVec from 'sqlite-vec';

const moduleDir = dirname(fileURLToPath(import.meta.url));

let db = null;
let exitHandlersRegistered = false;

/** Default embedding vector dimensions. Must match vec0 table creation. */
export const EMBEDDING_DIMENSIONS = 384;

/** Chunk embedding vector dimensions. Must match vec_chunks vec0 table creation. */
export const CHUNK_EMBEDDING_DIMENSIONS = 768;

/**
 * Opens (or creates) the SQLite database, applies pragmas, loads extensions,
 * initializes schema if needed, and runs pending migrations.
 *
 * @param {string} [dbPath='jarvis.db'] - Path to the database file.
 * @returns {import('better-sqlite3').Database} Database handle (opaque — consumers should not use it directly).
 * @throws {Error} If database file is inaccessible, schema file is missing, or migration fails.
 */
export function initDatabase(dbPath = 'jarvis.db') {
  if (db?.open) {
    return db;
  }

  const database = new Database(dbPath);

  database.pragma('journal_mode = WAL', { simple: true });
  database.pragma('foreign_keys = ON', { simple: true });
  database.pragma('busy_timeout = 5000', { simple: true });
  database.pragma('synchronous = NORMAL', { simple: true });

  sqliteVec.load(database);

  const entitiesTable = database
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='entities'")
    .get();

  if (!entitiesTable) {
    const schemaPath = join(moduleDir, 'schema.sql');
    const schemaSql = readFileSync(schemaPath, 'utf8');
    database.exec(schemaSql);
  }

  db = database;
  _runMigrations();

  if (!exitHandlersRegistered) {
    process.on('exit', () => closeDatabase());
    process.on('SIGHUP', () => process.exit(128 + 1));
    process.on('SIGINT', () => process.exit(128 + 2));
    process.on('SIGTERM', () => process.exit(128 + 15));
    exitHandlersRegistered = true;
  }

  return db;
}

/**
 * Closes the database connection. Called automatically on process exit,
 * but available for explicit cleanup. Safe to call multiple times.
 */
export function closeDatabase() {
  try {
    if (db?.open) {
      db.close();
    }
  } catch {
    // Intentionally swallowed to keep close idempotent and non-throwing.
  } finally {
    db = null;
  }
}

function _runMigrations() {
  const database = _getDb();
  const migrationsDir = join(moduleDir, 'migrations');
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => /^\d{3}-.+\.sql$/.test(file))
    .sort();
  const appliedVersions = new Set(
    database.prepare('SELECT version FROM schema_migrations').all().map((row) => row.version),
  );

  for (const file of migrationFiles) {
    const version = file.slice(0, 3);

    if (appliedVersions.has(version)) {
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    const hasLegacyTables = database
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='health_metrics'")
      .get();
    const migrate = database.transaction(() => {
      if (hasLegacyTables) {
        database.exec(sql);
      } else {
        const safeSql = sql.replace(/^INSERT INTO data_records[\s\S]*?;\s*$/gm, '');
        database.exec(safeSql);
      }
      database
        .prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)')
        .run(version, file);
    });

    try {
      migrate();
    } catch (error) {
      if (error instanceof Error) {
        error.message = `Failed to apply migration ${file}: ${error.message}`;
        throw error;
      }

      throw new Error(`Failed to apply migration ${file}: ${String(error)}`);
    }
  }
}

/**
 * Returns the latest applied migration version.
 *
 * @returns {string|null} Version string (e.g. '003') or null if no migrations applied.
 */
export function getSchemaVersion() {
  const row = _getDb()
    .prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1')
    .get();

  return row?.version ?? null;
}

/**
 * Returns all applied migrations in order.
 *
 * @returns {{ version: string, name: string, applied_at: string }[]}
 */
export function getMigrationHistory() {
  return _getDb()
    .prepare('SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC')
    .all();
}

function _getDb() {
  if (db === null) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  return db;
}

/**
 * Creates a new entity in the knowledge graph.
 *
 * @param {Object} entity
 * @param {string} entity.name - Entity name (non-empty).
 * @param {string} entity.type - Entity classification.
 * @param {Object} [entity.metadata={}] - Arbitrary metadata.
 * @returns {{ id: number, name: string, type: string, metadata: Object, created_at: string, updated_at: string }}
 * @throws {Error} If name or type is empty.
 */
export function createEntity({ name, type, metadata = {} }) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Entity name must be a non-empty string');
  }

  if (!type || typeof type !== 'string' || type.trim().length === 0) {
    throw new Error('Entity type must be a non-empty string');
  }

  const serializedMetadata = JSON.stringify(metadata);
  const result = _getDb()
    .prepare('INSERT INTO entities (name, type, metadata) VALUES (?, ?, ?)')
    .run(name, type, serializedMetadata);

  return getEntity(result.lastInsertRowid);
}

/**
 * Retrieves an entity by its ID.
 *
 * @param {number} id - Entity ID.
 * @returns {{ id: number, name: string, type: string, metadata: Object, created_at: string, updated_at: string }|null}
 */
export function getEntity(id) {
  const row = _getDb().prepare('SELECT * FROM entities WHERE id = ?').get(id);

  if (!row) {
    return null;
  }

  return { ...row, metadata: JSON.parse(row.metadata) };
}

/**
 * Updates an entity's mutable fields.
 *
 * @param {number} id - Entity ID.
 * @param {Object} updates
 * @param {string} [updates.name] - New name.
 * @param {string} [updates.type] - New type.
 * @param {Object} [updates.metadata] - New metadata (replaces entirely).
 * @returns {{ id: number, name: string, type: string, metadata: Object, created_at: string, updated_at: string }}
 * @throws {Error} If entity not found, or if name/type is set to empty string.
 */
export function updateEntity(id, updates) {
  const existing = getEntity(id);

  if (!existing) {
    throw new Error(`Entity with id ${id} not found`);
  }

  if ('name' in updates) {
    if (!updates.name || typeof updates.name !== 'string' || updates.name.trim().length === 0) {
      throw new Error('Entity name must be a non-empty string');
    }
  }

  if ('type' in updates) {
    if (!updates.type || typeof updates.type !== 'string' || updates.type.trim().length === 0) {
      throw new Error('Entity type must be a non-empty string');
    }
  }

  const fields = [];
  const values = [];

  if ('name' in updates) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if ('type' in updates) {
    fields.push('type = ?');
    values.push(updates.type);
  }

  if ('metadata' in updates) {
    fields.push('metadata = ?');
    values.push(JSON.stringify(updates.metadata));
  }

  if (fields.length === 0) {
    return existing;
  }

  values.push(id);
  _getDb()
    .prepare(`UPDATE entities SET ${fields.join(', ')} WHERE id = ?`)
    .run(...values);

  return getEntity(id);
}

/**
 * Deletes an entity and cascades to its relations.
 *
 * @param {number} id - Entity ID.
 * @returns {boolean} True if entity existed and was deleted.
 */
export function deleteEntity(id) {
  const result = _getDb().prepare('DELETE FROM entities WHERE id = ?').run(id);

  return result.changes > 0;
}

/**
 * Creates a directed relationship between two entities.
 *
 * @param {Object} relation
 * @param {number} relation.source_id - Source entity ID.
 * @param {number} relation.target_id - Target entity ID.
 * @param {string} relation.type - Relationship type.
 * @param {Object} [relation.metadata={}] - Relation metadata.
 * @returns {{ id: number, source_id: number, target_id: number, type: string, metadata: Object, created_at: string }}
 * @throws {Error} If source or target entity doesn't exist, if source_id === target_id, if type is empty, or if duplicate relation exists.
 */
export function createRelation({ source_id, target_id, type, metadata = {} }) {
  if (source_id === target_id) {
    throw new Error('source_id and target_id must be different');
  }

  if (!type || typeof type !== 'string' || type.trim().length === 0) {
    throw new Error('Relation type must be a non-empty string');
  }

  if (!getEntity(source_id)) {
    throw new Error(`Source entity with id ${source_id} not found`);
  }

  if (!getEntity(target_id)) {
    throw new Error(`Target entity with id ${target_id} not found`);
  }

  const serializedMetadata = JSON.stringify(metadata);

  let result;

  try {
    result = _getDb()
      .prepare('INSERT INTO relations (source_id, target_id, type, metadata) VALUES (?, ?, ?, ?)')
      .run(source_id, target_id, type, serializedMetadata);
  } catch (error) {
    if (
      error instanceof Error
      && (error.message.includes('UNIQUE constraint failed') || error.message.includes('unique'))
    ) {
      throw new Error(
        `Duplicate relation: source_id=${source_id}, target_id=${target_id}, type=${type} already exists`,
      );
    }

    throw error;
  }

  const row = _getDb().prepare('SELECT * FROM relations WHERE id = ?').get(result.lastInsertRowid);

  return { ...row, metadata: JSON.parse(row.metadata) };
}

/**
 * Gets all outbound relations from an entity.
 *
 * @param {number} entityId - Source entity ID.
 * @returns {{ id: number, source_id: number, target_id: number, type: string, metadata: Object, created_at: string }[]}
 */
export function getRelationsFrom(entityId) {
  const rows = _getDb().prepare('SELECT * FROM relations WHERE source_id = ?').all(entityId);

  return rows.map((row) => ({ ...row, metadata: JSON.parse(row.metadata) }));
}

/**
 * Gets all inbound relations to an entity.
 *
 * @param {number} entityId - Target entity ID.
 * @returns {{ id: number, source_id: number, target_id: number, type: string, metadata: Object, created_at: string }[]}
 */
export function getRelationsTo(entityId) {
  const rows = _getDb().prepare('SELECT * FROM relations WHERE target_id = ?').all(entityId);

  return rows.map((row) => ({ ...row, metadata: JSON.parse(row.metadata) }));
}

/**
 * Deletes a specific relation.
 *
 * @param {number} id - Relation ID.
 * @returns {boolean} True if relation existed and was deleted.
 */
export function deleteRelation(id) {
  const result = _getDb().prepare('DELETE FROM relations WHERE id = ?').run(id);

  return result.changes > 0;
}

/**
 * Stores or replaces a vector embedding for an entity.
 *
 * @param {number} entityId - Entity ID.
 * @param {number[]|Float32Array} vector - Embedding vector.
 * @throws {Error} If entity doesn't exist, or if vector dimensions don't match EMBEDDING_DIMENSIONS.
 */
export function upsertEmbedding(entityId, vector) {
  if (!getEntity(entityId)) {
    throw new Error(`Entity with id ${entityId} not found`);
  }

  const arr = vector instanceof Float32Array ? vector : new Float32Array(vector);
  if (arr.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Vector must have ${EMBEDDING_DIMENSIONS} dimensions, got ${arr.length}`);
  }

  const database = _getDb();
  database.prepare('DELETE FROM vec_embeddings WHERE entity_id = ?').run(BigInt(entityId));
  database.prepare('INSERT INTO vec_embeddings(entity_id, embedding) VALUES (?, ?)').run(BigInt(entityId), arr);
}

/**
 * Removes a vector embedding for an entity.
 *
 * @param {number} entityId - Entity ID.
 * @returns {boolean} True if embedding existed and was removed.
 */
export function deleteEmbedding(entityId) {
  const result = _getDb().prepare('DELETE FROM vec_embeddings WHERE entity_id = ?').run(BigInt(entityId));
  return result.changes > 0;
}

/**
 * Performs K-nearest-neighbor vector search.
 *
 * @param {number[]|Float32Array} queryVector - Query vector.
 * @param {number} [k=5] - Number of neighbors to return.
 * @returns {{ entity_id: number, distance: number }[]} Nearest vectors sorted by distance (0 = identical).
 * @throws {Error} If vector dimensions don't match EMBEDDING_DIMENSIONS.
 */
export function findNearestVectors(queryVector, k = 5) {
  const arr = queryVector instanceof Float32Array ? queryVector : new Float32Array(queryVector);
  if (arr.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Vector must have ${EMBEDDING_DIMENSIONS} dimensions, got ${arr.length}`);
  }

  const rows = _getDb()
    .prepare('SELECT entity_id, distance FROM vec_embeddings WHERE embedding MATCH ? ORDER BY distance LIMIT ?')
    .all(arr, k);

  return rows.map(row => ({ entity_id: Number(row.entity_id), distance: row.distance }));
}

/**
 * Performs recursive graph traversal from a starting entity, following outbound relations.
 * Detects and skips cycles. Returns the starting entity at depth 0.
 *
 * @param {number} startEntityId - Starting entity ID.
 * @param {number} maxDepth - Maximum hops to traverse (1-based).
 * @returns {{ id: number, name: string, type: string, depth: number, path: string }[]} Results ordered by depth, then by entity ID.
 * @throws {Error} If starting entity doesn't exist.
 */
export function traverseGraph(startEntityId, maxDepth) {
  const start = getEntity(startEntityId);

  if (!start) {
    throw new Error(`Entity with id ${startEntityId} not found`);
  }

  return _getDb()
    .prepare(`WITH RECURSIVE traverse(id, name, type, depth, path) AS (
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
    SELECT * FROM traverse ORDER BY depth, id`)
    .all(startEntityId, maxDepth);
}

function _parseJsonFields(row, ...fields) {
  if (!row) return null;

  const result = { ...row };

  for (const field of fields) {
    if (result[field] !== undefined) {
      result[field] = JSON.parse(result[field]);
    }
  }

  return result;
}

/**
 * Registers a new data source.
 *
 * @param {Object} source
 * @param {string} source.name - Unique source name.
 * @param {string} source.type - Source type: "api", "manual", "import".
 * @param {Object} [source.config={}] - Source configuration.
 * @returns {{ id: number, name: string, type: string, config: Object, is_active: boolean, created_at: string, updated_at: string }}
 * @throws {Error} If name already exists or is empty.
 */
export function createDataSource({ name, type, config = {} }) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Data source name must be a non-empty string');
  }

  const serializedConfig = JSON.stringify(config);

  let result;

  try {
    result = _getDb()
      .prepare('INSERT INTO data_sources (name, type, config) VALUES (?, ?, ?)')
      .run(name, type, serializedConfig);
  } catch (error) {
    if (
      error instanceof Error
      && (error.message.includes('UNIQUE constraint failed') || error.message.includes('unique'))
    ) {
      throw new Error(`Data source with name '${name}' already exists`);
    }

    throw error;
  }

  return getDataSource(result.lastInsertRowid);
}

/**
 * Retrieves a data source by ID.
 *
 * @param {number} id - Data source ID.
 * @returns {{ id: number, name: string, type: string, config: Object, is_active: boolean, created_at: string, updated_at: string }|null}
 */
export function getDataSource(id) {
  const row = _getDb().prepare('SELECT * FROM data_sources WHERE id = ?').get(id);

  return _parseJsonFields(row, 'config');
}

/**
 * Updates a data source. Supports changing name, type, config, is_active.
 *
 * @param {number} id - Data source ID.
 * @param {Object} updates
 * @param {string} [updates.name] - New name.
 * @param {string} [updates.type] - New type.
 * @param {Object} [updates.config] - New configuration.
 * @param {boolean} [updates.is_active] - Active status.
 * @returns {{ id: number, name: string, type: string, config: Object, is_active: boolean, created_at: string, updated_at: string }}
 * @throws {Error} If data source not found.
 */
export function updateDataSource(id, updates) {
  const existing = getDataSource(id);

  if (!existing) {
    throw new Error(`Data source with id ${id} not found`);
  }

  if ('name' in updates) {
    if (!updates.name || typeof updates.name !== 'string' || updates.name.trim().length === 0) {
      throw new Error('Data source name must be a non-empty string');
    }
  }

  const fields = [];
  const values = [];

  if ('name' in updates) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if ('type' in updates) {
    fields.push('type = ?');
    values.push(updates.type);
  }

  if ('config' in updates) {
    fields.push('config = ?');
    values.push(JSON.stringify(updates.config));
  }

  if ('is_active' in updates) {
    fields.push('is_active = ?');
    values.push(updates.is_active);
  }

  if (fields.length === 0) {
    return existing;
  }

  values.push(id);

  _getDb()
    .prepare(`UPDATE data_sources SET ${fields.join(', ')} WHERE id = ?`)
    .run(...values);

  return getDataSource(id);
}

export function insertRecord(recordType, data) {
  if (!recordType || typeof recordType !== 'string' || recordType.trim().length === 0) {
    throw new Error('record_type is required and must be a non-empty string');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('data is required and must be an object');
  }

  const sourceId = data.source_id;
  if (sourceId === undefined || sourceId === null) {
    throw new Error('data.source_id is required');
  }

  if (!getDataSource(sourceId)) {
    throw new Error(`Data source with id ${sourceId} not found`);
  }

  if (!data.recorded_at || typeof data.recorded_at !== 'string' || data.recorded_at.trim().length === 0) {
    throw new Error('recorded_at is required');
  }

  const result = _getDb()
    .prepare('INSERT INTO data_records (source_id, record_type, data, recorded_at) VALUES (?, ?, ?, ?)')
    .run(sourceId, recordType, JSON.stringify(data), data.recorded_at);

  const row = _getDb().prepare('SELECT * FROM data_records WHERE id = ?').get(result.lastInsertRowid);

  return { ...row, data: JSON.parse(row.data) };
}

export function queryRecords(recordType, filters = {}) {
  let sql = 'SELECT * FROM data_records WHERE record_type = ?';
  const params = [recordType];

  if (filters.source_id !== undefined) {
    sql += ' AND source_id = ?';
    params.push(filters.source_id);
  }

  if (filters.from !== undefined) {
    sql += ' AND recorded_at >= ?';
    params.push(filters.from);
  }

  if (filters.to !== undefined) {
    sql += ' AND recorded_at <= ?';
    params.push(filters.to);
  }

  if (filters.jsonFilters) {
    for (const [key, value] of Object.entries(filters.jsonFilters)) {
      sql += ` AND json_extract(data, '$.${key}') = ?`;
      params.push(value);
    }
  }

  sql += ' ORDER BY recorded_at DESC';
  sql += ' LIMIT ? OFFSET ?';
  params.push(filters.limit ?? 100, filters.offset ?? 0);

  return _getDb()
    .prepare(sql)
    .all(...params)
    .map((row) => ({ ...row, data: JSON.parse(row.data) }));
}

/**
 * Performs full-text search across all indexed content using FTS5.
 * Special characters in the query are escaped to prevent FTS5 syntax errors.
 *
 * @param {string} query - FTS5 search query.
 * @param {Object} [options={}]
 * @param {string} [options.source_table] - Filter to specific table (e.g. "entities").
 * @param {number} [options.limit=20] - Max results.
 * @returns {{ source_table: string, source_id: number, name: string, snippet: string, rank: number }[]} Results ordered by relevance.
 * @throws {Error} If query is empty.
 */
export function search(query, options = {}) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Search query must be a non-empty string');
  }

  const escapedQuery = query.replace(/[*"():^~+\-{}\[\]]/g, ' ').trim();

  if (escapedQuery.length === 0) {
    return [];
  }

  const limit = options.limit ?? 20;
  let sql = `SELECT source_table, source_id, name,
    snippet(search_index, 0, '<b>', '</b>', '...', 20) AS snippet,
    rank
    FROM search_index
    WHERE search_index MATCH ?`;
  const params = [escapedQuery];

  if (options.source_table) {
    sql += ' AND source_table = ?';
    params.push(options.source_table);
  }

  sql += ' ORDER BY rank LIMIT ?';
  params.push(limit);

  return _getDb().prepare(sql).all(...params);
}

/**
 * Returns all entities ordered by id ASC.
 *
 * @returns {{ id: number, name: string, type: string, metadata: Object, created_at: string, updated_at: string }[]}
 */
export function getAllEntities() {
  return _getDb()
    .prepare('SELECT * FROM entities ORDER BY id ASC')
    .all()
    .map((row) => ({ ...row, metadata: JSON.parse(row.metadata) }));
}

/**
 * Returns all relations ordered by id ASC.
 *
 * @returns {{ id: number, source_id: number, target_id: number, type: string, metadata: Object, created_at: string }[]}
 */
export function getAllRelations() {
  return _getDb()
    .prepare('SELECT * FROM relations ORDER BY id ASC')
    .all()
    .map((row) => ({ ...row, metadata: JSON.parse(row.metadata) }));
}

/**
 * Returns all data sources ordered by id ASC.
 *
 * @returns {{ id: number, name: string, type: string, config: Object, is_active: number, created_at: string, updated_at: string }[]}
 */
export function getAllDataSources() {
  return _getDb()
    .prepare('SELECT * FROM data_sources ORDER BY id ASC')
    .all()
    .map((row) => ({ ...row, config: JSON.parse(row.config) }));
}

export function getAllDataRecords() {
  return _getDb()
    .prepare('SELECT * FROM data_records ORDER BY id ASC')
    .all()
    .map((row) => ({ ...row, data: JSON.parse(row.data) }));
}

/**
 * Returns all embeddings ordered by entity_id ASC.
 *
 * @returns {{ entity_id: number, embedding: Float32Array }[]}
 */
export function getAllEmbeddings() {
  return _getDb()
    .prepare('SELECT entity_id, embedding FROM vec_embeddings ORDER BY entity_id ASC')
    .all()
    .map((row) => ({
      entity_id: Number(row.entity_id),
      embedding: new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4),
    }));
}

export function getRecordCounts() {
  const database = _getDb();
  const count = (table) => database.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;

  const dataRecordRows = database
    .prepare('SELECT record_type, COUNT(*) AS c FROM data_records GROUP BY record_type')
    .all();
  const dataRecords = {};
  for (const row of dataRecordRows) {
    dataRecords[row.record_type] = row.c;
  }

  return {
    data_records: dataRecords,
    data_sources: count('data_sources'),
    embeddings: count('vec_embeddings'),
    entities: count('entities'),
    relations: count('relations'),
  };
}

/**
 * Imports an entity with explicit id and timestamps. Bypasses name/type validation.
 *
 * @param {{ id: number, name: string, type: string, metadata: Object, created_at: string, updated_at: string }} row
 */
export function importEntity(row) {
  _getDb()
    .prepare('INSERT INTO entities (id, name, type, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(row.id, row.name, row.type, JSON.stringify(row.metadata), row.created_at, row.updated_at);
}

/**
 * Imports a relation with explicit id and timestamps.
 *
 * @param {{ id: number, source_id: number, target_id: number, type: string, metadata: Object, created_at: string }} row
 */
export function importRelation(row) {
  _getDb()
    .prepare('INSERT INTO relations (id, source_id, target_id, type, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(row.id, row.source_id, row.target_id, row.type, JSON.stringify(row.metadata), row.created_at);
}

/**
 * Imports a data source with explicit id and timestamps.
 *
 * @param {{ id: number, name: string, type: string, config: Object, is_active: number, created_at: string, updated_at: string }} row
 */
export function importDataSource(row) {
  _getDb()
    .prepare('INSERT INTO data_sources (id, name, type, config, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(row.id, row.name, row.type, JSON.stringify(row.config), row.is_active, row.created_at, row.updated_at);
}

export function importDataRecord(row) {
  _getDb()
    .prepare('INSERT INTO data_records (id, source_id, record_type, data, recorded_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(row.id, row.source_id, row.record_type, JSON.stringify(row.data), row.recorded_at, row.created_at);
}

/**
 * Wraps a callback in a SQLite transaction. The entire callback runs
 * atomically — if any statement throws, all changes are rolled back.
 *
 * @param {Function} fn - Callback containing database operations.
 * @returns {*} Return value of fn.
 * @throws {Error} If database not initialized or fn throws.
 */
export function runTransaction(fn) {
  const transaction = _getDb().transaction(fn);
  return transaction();
}

// ---------------------------------------------------------------------------
// Chunk CRUD & Chunk Embedding Operations
// ---------------------------------------------------------------------------

/**
 * Inserts a new chunk for an entity.
 *
 * @param {number} entityId - FK to entities.id.
 * @param {number} chunkIndex - Position within the entity (0-based).
 * @param {string} content - Chunk text content.
 * @param {Object} [metadata={}] - JSON-serializable metadata.
 * @returns {number} Inserted chunk ID.
 * @throws {Error} If entity does not exist or content is empty.
 */
export function insertChunk(entityId, chunkIndex, content, metadata = {}) {
  if (!getEntity(entityId)) {
    throw new Error(`Entity with id ${entityId} not found`);
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Chunk content must be a non-empty string');
  }

  const result = _getDb()
    .prepare('INSERT INTO chunks (entity_id, chunk_index, content, metadata) VALUES (?, ?, ?, ?)')
    .run(entityId, chunkIndex, content, JSON.stringify(metadata));

  return result.lastInsertRowid;
}

/**
 * Returns all chunks for an entity, ordered by chunk_index ASC.
 *
 * @param {number} entityId - Entity ID.
 * @returns {{ id: number, entity_id: number, chunk_index: number, content: string, metadata: Object, created_at: string }[]}
 */
export function getChunks(entityId) {
  return _getDb()
    .prepare('SELECT * FROM chunks WHERE entity_id = ? ORDER BY chunk_index ASC')
    .all(entityId)
    .map((row) => ({ ...row, metadata: JSON.parse(row.metadata) }));
}

/**
 * Deletes all chunks for an entity. CASCADE deletes vec_chunks entries
 * and FTS5 index entries via triggers.
 *
 * @param {number} entityId - Entity ID.
 * @returns {number} Number of deleted chunks.
 */
export function deleteChunksForEntity(entityId) {
  const result = _getDb()
    .prepare('DELETE FROM chunks WHERE entity_id = ?')
    .run(entityId);

  return result.changes;
}

/**
 * Stores or replaces a 768-dimensional vector embedding for a chunk.
 *
 * @param {number} chunkId - FK to chunks.id.
 * @param {Float32Array} vector - 768-dimensional embedding vector.
 * @throws {Error} If vector dimensions don't match CHUNK_EMBEDDING_DIMENSIONS.
 */
export function upsertChunkEmbedding(chunkId, vector) {
  const arr = vector instanceof Float32Array ? vector : new Float32Array(vector);

  if (arr.length !== CHUNK_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Vector must have ${CHUNK_EMBEDDING_DIMENSIONS} dimensions, got ${arr.length}`,
    );
  }

  const database = _getDb();
  database.prepare('DELETE FROM vec_chunks WHERE chunk_id = ?').run(BigInt(chunkId));
  database
    .prepare('INSERT INTO vec_chunks(chunk_id, embedding) VALUES (?, ?)')
    .run(BigInt(chunkId), arr);
}

/**
 * Performs K-nearest-neighbor vector search on chunk embeddings.
 *
 * @param {Float32Array|number[]} queryVector - 768-dimensional query vector.
 * @param {number} [k=20] - Number of nearest neighbors to return.
 * @returns {{ chunk_id: number, distance: number }[]} Results sorted by distance ASC.
 * @throws {Error} If vector dimensions don't match CHUNK_EMBEDDING_DIMENSIONS.
 */
export function findNearestChunks(queryVector, k = 20) {
  const arr = queryVector instanceof Float32Array ? queryVector : new Float32Array(queryVector);

  if (arr.length !== CHUNK_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Vector must have ${CHUNK_EMBEDDING_DIMENSIONS} dimensions, got ${arr.length}`,
    );
  }

  const rows = _getDb()
    .prepare(
      'SELECT chunk_id, distance FROM vec_chunks WHERE embedding MATCH ? ORDER BY distance LIMIT ?',
    )
    .all(arr, k);

  return rows.map((row) => ({ chunk_id: Number(row.chunk_id), distance: row.distance }));
}

/**
 * Returns a chunk record joined with its parent entity.
 * Used to enrich search results with entity context.
 *
 * @param {number} chunkId - Chunk ID.
 * @returns {{ chunk: Object, entity: Object }|null}
 */
export function getChunkWithEntity(chunkId) {
  const row = _getDb()
    .prepare(
      `SELECT c.id AS c_id, c.entity_id, c.chunk_index, c.content, c.metadata AS c_metadata, c.created_at AS c_created_at,
              e.id AS e_id, e.name, e.type, e.metadata AS e_metadata, e.created_at AS e_created_at, e.updated_at
       FROM chunks c
       JOIN entities e ON e.id = c.entity_id
       WHERE c.id = ?`,
    )
    .get(chunkId);

  if (!row) {
    return null;
  }

  return {
    chunk: {
      id: row.c_id,
      entity_id: row.entity_id,
      chunk_index: row.chunk_index,
      content: row.content,
      metadata: JSON.parse(row.c_metadata),
      created_at: row.c_created_at,
    },
    entity: {
      id: row.e_id,
      name: row.name,
      type: row.type,
      metadata: JSON.parse(row.e_metadata),
      created_at: row.e_created_at,
      updated_at: row.updated_at,
    },
  };
}
