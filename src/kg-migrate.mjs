/**
 * Knowledge Graph Migration — imports a legacy kg-store.json file into the SQLite database.
 *
 * Usage: node src/kg-migrate.mjs [--dry-run] [--db <database-path>] [FILE]
 *
 * Exit codes:
 *   0 — success (even if some items were skipped)
 *   1 — missing/invalid argument
 *   2 — input file not found
 *   3 — JSON parse error
 *
 * @module kg-migrate
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  createRelation,
  getAllEntities,
  runTransaction,
} from './db.mjs';

/**
 * Detects the format version of a kg-store JSON structure and normalises it
 * to the internal representation expected by migrateEntities / migrateRelations.
 *
 * Supported formats:
 *   v1 (legacy) — { entities: { id: {…} }, relations: [{…}] }
 *   v2 (real)   — { version: 2, nodes: { id: {…}, … }, edges: [{…}], categories: {…}, meta: {…} }
 *
 * @param {Object} raw - Parsed JSON content.
 * @returns {{ entities: Object<string, Object>, relations: Array<Object> }}
 */
export function normalizeInput(raw) {
  // v2: top-level "nodes" — may be an object keyed by id, or an array
  if (raw.nodes && typeof raw.nodes === 'object') {
    const entities = {};
    if (Array.isArray(raw.nodes)) {
      // v2 array form: [ { id, label, … }, … ]
      for (const node of raw.nodes) {
        const id = node.id;
        if (id == null) continue;
        entities[String(id)] = node;
      }
    } else {
      // v2 object form: { "node-id": { id, label, … }, … }
      for (const [key, node] of Object.entries(raw.nodes)) {
        entities[key] = node;
      }
    }
    return { entities, relations: raw.edges || [] };
  }

  // v1 (legacy): top-level "entities" object (or empty)
  return {
    entities: raw.entities || {},
    relations: raw.relations || [],
  };
}

/**
 * Builds a metadata object from a legacy entity, packing optional fields
 * and flattening attrs at the top level. Omits absent/null/empty fields.
 *
 * @param {Object} legacyEntity - Legacy entity from kg-store.json.
 * @returns {Object} Metadata object for SQLite entity.
 */
export function buildMetadata(legacyEntity) {
  const metadata = {};

  if (legacyEntity.category && legacyEntity.category !== '') {
    metadata.category = legacyEntity.category;
  }

  if (Array.isArray(legacyEntity.tags) && legacyEntity.tags.length > 0) {
    metadata.tags = legacyEntity.tags;
  }

  if (legacyEntity.parent && legacyEntity.parent !== '') {
    metadata.parent = legacyEntity.parent;
  }

  if (legacyEntity.confidence != null) {
    metadata.confidence = legacyEntity.confidence;
  }

  if (legacyEntity.wikiPage && legacyEntity.wikiPage !== '') {
    metadata.wikiPage = legacyEntity.wikiPage;
  }

  // v2 fields: children, created, updated
  if (Array.isArray(legacyEntity.children) && legacyEntity.children.length > 0) {
    metadata.children = legacyEntity.children;
  }

  if (legacyEntity.created && legacyEntity.created !== '') {
    metadata.created = legacyEntity.created;
  }

  if (legacyEntity.updated && legacyEntity.updated !== '') {
    metadata.updated = legacyEntity.updated;
  }

  const attrs = legacyEntity.attrs;
  if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
    for (const [key, value] of Object.entries(attrs)) {
      if (
        value != null
        && value !== ''
        && !(Array.isArray(value) && value.length === 0)
        && !(typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
      ) {
        metadata[key] = value;
      }
    }
  }

  return metadata;
}

/**
 * Migrates entities from parsed kg-store data into the database.
 *
 * @param {Object} kgData - Parsed kg-store.json content.
 * @param {Object} options - Migration options.
 * @param {boolean} options.dryRun - If true, skip database writes.
 * @param {boolean} options.silent - If true, suppress output.
 * @returns {{ idMap: Map<string, number>, stats: { migrated: number, skipped: number, errors: number } }}
 */
function migrateEntities(kgData, options) {
  const idMap = new Map();
  const stats = { migrated: 0, skipped: 0, errors: 0 };
  const log = options.silent ? () => {} : (msg) => process.stderr.write(msg + '\n');

  const entities = kgData.entities || {};

  // Pre-load existing entities for duplicate detection
  const existingEntities = new Set();
  if (!options.dryRun) {
    for (const e of getAllEntities()) {
      existingEntities.add(`${e.name}\0${e.type}`);
    }
  } else {
    // In dry-run mode, still load existing for accurate skip counts
    for (const e of getAllEntities()) {
      existingEntities.add(`${e.name}\0${e.type}`);
    }
  }

  // Also build an idMap from existing entities for relation resolution on re-runs
  if (!options.dryRun) {
    const allExisting = getAllEntities();
    for (const e of allExisting) {
      // Find which legacy ID maps to this entity
      for (const [legacyId, legacyEntity] of Object.entries(entities)) {
        if (legacyEntity.label === e.name && legacyEntity.type === e.type) {
          idMap.set(legacyId, e.id);
        }
      }
    }
  }

  let fakeIdCounter = 1;

  for (const [legacyId, legacyEntity] of Object.entries(entities)) {
    // Validate required fields
    if (!legacyEntity.label || typeof legacyEntity.label !== 'string' || legacyEntity.label.trim().length === 0) {
      log(`Warning: Skipping entity "${legacyId}": missing required field "label"`);
      stats.errors++;
      continue;
    }

    if (!legacyEntity.type || typeof legacyEntity.type !== 'string' || legacyEntity.type.trim().length === 0) {
      log(`Warning: Skipping entity "${legacyId}": missing required field "type"`);
      stats.errors++;
      continue;
    }

    const name = legacyEntity.label;
    const type = legacyEntity.type;
    const compositeKey = `${name}\0${type}`;

    // Check for duplicates
    if (existingEntities.has(compositeKey)) {
      stats.skipped++;
      // For re-runs, idMap was already populated above for existing entities
      if (options.dryRun) {
        idMap.set(legacyId, fakeIdCounter++);
      }
      continue;
    }

    const metadata = buildMetadata(legacyEntity);

    if (options.dryRun) {
      idMap.set(legacyId, fakeIdCounter++);
      stats.migrated++;
    } else {
      try {
        const created = createEntity({ name, type, metadata });
        idMap.set(legacyId, created.id);
        existingEntities.add(compositeKey);
        stats.migrated++;
      } catch (err) {
        log(`Warning: Error creating entity "${legacyId}": ${err.message}`);
        stats.errors++;
      }
    }
  }

  return { idMap, stats };
}

/**
 * Migrates relations from parsed kg-store data into the database.
 *
 * @param {Object} kgData - Parsed kg-store.json content.
 * @param {Map<string, number>} idMap - Legacy string ID to SQLite integer ID mapping.
 * @param {Object} options - Migration options.
 * @param {boolean} options.dryRun - If true, skip database writes.
 * @param {boolean} options.silent - If true, suppress output.
 * @returns {{ migrated: number, skipped: number, errors: number }}
 */
function migrateRelations(kgData, idMap, options) {
  const stats = { migrated: 0, skipped: 0, errors: 0 };
  const log = options.silent ? () => {} : (msg) => process.stderr.write(msg + '\n');

  const relations = kgData.relations || [];

  for (const rel of relations) {
    const fromId = rel.from;
    const toId = rel.to;
    const relType = rel.rel;
    const metadata = (rel.attrs && typeof rel.attrs === 'object' && !Array.isArray(rel.attrs))
      ? rel.attrs
      : {};

    // Validate from/to exist in idMap
    if (!idMap.has(fromId)) {
      log(`Warning: Skipping relation ${fromId} -> ${toId} (rel: ${relType}): source entity "${fromId}" not found`);
      stats.errors++;
      continue;
    }

    if (!idMap.has(toId)) {
      log(`Warning: Skipping relation ${fromId} -> ${toId} (rel: ${relType}): target entity "${toId}" not found`);
      stats.errors++;
      continue;
    }

    const sourceId = idMap.get(fromId);
    const targetId = idMap.get(toId);

    // Check self-referential
    if (sourceId === targetId) {
      log(`Warning: Skipping relation ${fromId} -> ${toId} (rel: ${relType}): source and target are the same entity`);
      stats.errors++;
      continue;
    }

    if (options.dryRun) {
      stats.migrated++;
    } else {
      try {
        createRelation({ source_id: sourceId, target_id: targetId, type: relType, metadata });
        stats.migrated++;
      } catch (err) {
        if (err.message.includes('Duplicate relation') || err.message.includes('UNIQUE constraint')) {
          stats.skipped++;
        } else {
          log(`Warning: Error creating relation ${fromId} -> ${toId} (rel: ${relType}): ${err.message}`);
          stats.errors++;
        }
      }
    }
  }

  return stats;
}

/**
 * Prints the migration summary report to stdout.
 *
 * @param {{ entities: { migrated: number, skipped: number, errors: number }, relations: { migrated: number, skipped: number, errors: number } }} stats
 * @param {Object} options - Migration options.
 * @param {boolean} options.dryRun - If true, use dry-run wording.
 */
function printReport(stats, options) {
  if (options.dryRun) {
    process.stdout.write(`\nEntities: ${stats.entities.migrated} would be migrated, ${stats.entities.skipped} would be skipped, ${stats.entities.errors} errors\n`);
    process.stdout.write(`Relations: ${stats.relations.migrated} would be migrated, ${stats.relations.skipped} would be skipped, ${stats.relations.errors} errors\n`);
    process.stdout.write('\nDry run complete. No changes written.\n');
  } else {
    process.stdout.write(`\nEntities: ${stats.entities.migrated} migrated, ${stats.entities.skipped} skipped, ${stats.entities.errors} errors\n`);
    process.stdout.write(`Relations: ${stats.relations.migrated} migrated, ${stats.relations.skipped} skipped, ${stats.relations.errors} errors\n`);
    process.stdout.write('\nMigration complete.\n');
  }
}

/**
 * Migrates a legacy kg-store.json knowledge graph into the SQLite database.
 * This is the programmatic API used by both CLI and tests.
 *
 * @param {string} filePath - Path to the kg-store.json file.
 * @param {string} [dbPath='jarvis.db'] - Path to the SQLite database.
 * @param {{ dryRun?: boolean, silent?: boolean }} [options={}] - Migration options.
 * @returns {{ entities: { migrated: number, skipped: number, errors: number }, relations: { migrated: number, skipped: number, errors: number } }}
 * @throws {Error} If file not found or JSON parse error.
 */
export function migrateKnowledgeGraph(filePath, dbPath = 'jarvis.db', options = {}) {
  const dryRun = options.dryRun ?? false;
  const silent = options.silent ?? false;
  const log = silent ? () => {} : (msg) => process.stdout.write(msg + '\n');

  const resolvedPath = resolve(filePath);

  // Read and parse JSON file
  let rawContent;
  try {
    rawContent = readFileSync(resolvedPath, 'utf8');
  } catch (err) {
    throw new Error(`File not found: ${filePath}`);
  }

  let kgData;
  try {
    kgData = JSON.parse(rawContent);
  } catch (err) {
    throw new Error(`Failed to parse ${filePath}: ${err.message}`);
  }

  // Normalise v1/v2 input format to internal representation
  const normalised = normalizeInput(kgData);

  // Initialize database
  initDatabase(dbPath);

  if (dryRun) {
    log(`Dry run: validating ${filePath} against ${dbPath}`);
  } else {
    log(`Migrating knowledge graph from ${filePath} to ${dbPath}`);
  }

  const opts = { dryRun, silent };

  let entityResult;
  let relationStats;

  if (dryRun) {
    // Dry run: no transaction needed
    entityResult = migrateEntities(normalised, opts);
    relationStats = migrateRelations(normalised, entityResult.idMap, opts);
  } else {
    // Wrap entire migration in a transaction for atomicity
    runTransaction(() => {
      entityResult = migrateEntities(normalised, opts);
      relationStats = migrateRelations(normalised, entityResult.idMap, opts);
    });
  }

  const stats = {
    entities: entityResult.stats,
    relations: relationStats,
  };

  if (!silent) {
    printReport(stats, opts);
  }

  return stats;
}

// ---- CLI entry point ----
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
  const args = process.argv.slice(2);

  let filePath = null;
  let dbPath = 'jarvis.db';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--db' && i + 1 < args.length) {
      dbPath = args[++i];
    } else if (!filePath) {
      filePath = args[i];
    }
  }

  if (!filePath) {
    filePath = 'kg-store.json';
  }

  try {
    migrateKnowledgeGraph(filePath, dbPath, { dryRun });
    closeDatabase();
  } catch (err) {
    const msg = err.message;
    process.stderr.write(`Error: ${msg}\n`);
    closeDatabase();

    if (msg.includes('File not found')) {
      process.exit(2);
    }

    if (msg.includes('Failed to parse')) {
      process.exit(3);
    }

    process.exit(1);
  }
}
