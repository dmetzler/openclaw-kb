/**
 * Knowledge Base Import — restores a flat-file export into a fresh SQLite database.
 *
 * Usage: node src/kb-import.mjs <export-directory> [--db <database-path>]
 *
 * Exit codes:
 *   0 — success
 *   1 — missing required argument
 *   2 — export directory not found
 *   3 — missing export files
 *   4 — target database already exists
 *   5 — schema version incompatible
 *   6 — data validation error (malformed JSONL)
 *
 * @module kb-import
 */

import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import {
  initDatabase,
  closeDatabase,
  getSchemaVersion,
  importEntity,
  importRelation,
  importDataSource,
  importDataRecord,
  upsertEmbedding,
  runTransaction,
} from './db.mjs';

const REQUIRED_FILES = [
  'metadata.json',
  'data_sources.jsonl',
  'entities.jsonl',
  'relations.jsonl',
  'data_records.jsonl',
  'embeddings.jsonl',
];

/**
 * Reads a JSONL file and returns an array of parsed objects.
 *
 * @param {string} filePath - Path to the JSONL file.
 * @param {string} fileName - File name for error messages.
 * @returns {Object[]}
 * @throws {Error} On malformed JSON with file:line context.
 */
function readJsonl(filePath, fileName) {
  const content = readFileSync(filePath, 'utf8');
  if (content.trim().length === 0) return [];

  const lines = content.trim().split('\n');
  return lines.map((line, idx) => {
    try {
      return JSON.parse(line);
    } catch (err) {
      throw new Error(`Malformed JSON at ${fileName}:${idx + 1}: ${err.message}`);
    }
  });
}

/**
 * Validates that a directory is a valid export directory.
 *
 * @param {string} exportDir - Path to the export directory.
 * @returns {{ metadata: Object }} Parsed metadata.
 * @throws {Error} On validation failure.
 */
function validateExportDir(exportDir) {
  if (!existsSync(exportDir)) {
    throw new Error(`Export directory not found: ${exportDir}`);
  }

  const missingFiles = REQUIRED_FILES.filter((f) => !existsSync(join(exportDir, f)));
  if (missingFiles.length > 0) {
    throw new Error(`Missing required files in export directory: ${missingFiles.join(', ')}`);
  }

  const metadataRaw = readFileSync(join(exportDir, 'metadata.json'), 'utf8');
  let metadata;
  try {
    metadata = JSON.parse(metadataRaw);
  } catch {
    throw new Error('Invalid metadata.json: failed to parse JSON');
  }

  return { metadata };
}

/**
 * Imports a previously exported directory into a fresh database.
 * This is the programmatic API used by both CLI and tests.
 *
 * @param {string} exportDir - Path to the export directory.
 * @param {string} dbPath - Path for the new database file.
 * @param {{ silent?: boolean }} [options] - Options. Set silent=true to suppress stdout.
 * @throws {Error} On validation failure, data error, or if target DB already exists.
 */
export function importDatabase(exportDir, dbPath, options = {}) {
  const silent = options.silent ?? false;
  const log = silent ? () => {} : (msg) => process.stdout.write(msg + '\n');

  // Pre-import validation
  const { metadata } = validateExportDir(exportDir);
  log('  Validating export directory... OK');

  if (existsSync(dbPath)) {
    throw new Error(`Target database already exists: ${dbPath}. Import requires a fresh (non-existent) database path.`);
  }

  // Create fresh database
  initDatabase(dbPath);

  // Check schema version compatibility
  const currentVersion = getSchemaVersion();
  const exportVersion = metadata.schema_version;
  // If export has a schema version and it's newer than current (or current has no migrations),
  // the export is incompatible.
  if (exportVersion !== null && exportVersion !== undefined) {
    if (currentVersion === null || exportVersion > currentVersion) {
      closeDatabase();
      try { unlinkSync(dbPath); } catch {}
      throw new Error(`Export schema version ${exportVersion} is newer than current version ${currentVersion}. Cannot import from a newer schema.`);
    }
  }
  log(`  Schema version: ${exportVersion} (compatible)`);

  // Get the raw database handle for transaction
  // We use a try/catch to rollback + cleanup on any error
  try {
    runTransaction(() => {
      // Import data_sources (JSONL)
      const dataSources = readJsonl(join(exportDir, 'data_sources.jsonl'), 'data_sources.jsonl');
      for (const row of dataSources) importDataSource(row);
      log(`  data_sources: ${dataSources.length} records imported`);

      // Import entities (JSONL)
      const entities = readJsonl(join(exportDir, 'entities.jsonl'), 'entities.jsonl');
      for (const row of entities) importEntity(row);
      log(`  entities: ${entities.length} records imported`);

      // Import relations (JSONL)
      const relations = readJsonl(join(exportDir, 'relations.jsonl'), 'relations.jsonl');
      for (const row of relations) importRelation(row);
      log(`  relations: ${relations.length} records imported`);

      // Import data_records (JSONL)
      const dataRecords = readJsonl(join(exportDir, 'data_records.jsonl'), 'data_records.jsonl');
      for (const row of dataRecords) importDataRecord(row);
      log(`  data_records: ${dataRecords.length} records imported`);

      // Import embeddings (JSONL)
      const embeddings = readJsonl(join(exportDir, 'embeddings.jsonl'), 'embeddings.jsonl');
      for (const row of embeddings) {
        upsertEmbedding(row.entity_id, new Float32Array(row.embedding));
      }
      log(`  embeddings: ${embeddings.length} records imported`);
    });

    log(`Import complete. Database created at ${dbPath}`);
  } catch (err) {
    closeDatabase();
    try { unlinkSync(dbPath); } catch {}
    throw err;
  }
}

// ---- CLI entry point ----
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
  const args = process.argv.slice(2);

  let exportDir = null;
  let dbPath = 'jarvis.db';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && i + 1 < args.length) {
      dbPath = args[++i];
    } else if (!exportDir) {
      exportDir = args[i];
    }
  }

  if (!exportDir) {
    process.stderr.write('Error: Export directory path is required.\nUsage: node src/kb-import.mjs <export-directory> [--db <database-path>]\n');
    process.exit(1);
  }

  try {
    process.stdout.write(`Importing knowledge base from ${exportDir} to ${dbPath}\n`);
    importDatabase(exportDir, dbPath);
    closeDatabase();
  } catch (err) {
    const msg = err.message;
    if (msg.includes('not found') && msg.includes('directory')) process.exit(2);
    if (msg.includes('Missing required files')) process.exit(3);
    if (msg.includes('already exists')) process.exit(4);
    if (msg.includes('version')) process.exit(5);
    if (msg.includes('Malformed')) process.exit(6);
    process.stderr.write(`Error: ${msg}\n`);
    process.exit(1);
  }
}
