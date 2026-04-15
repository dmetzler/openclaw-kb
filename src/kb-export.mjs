/**
 * Knowledge Base Export — exports the entire SQLite KB to flat files.
 *
 * Usage: node src/kb-export.mjs <output-directory> [--db <database-path>]
 *
 * Exit codes:
 *   0 — success
 *   1 — missing required argument
 *   2 — database file not found or cannot be opened
 *
 * @module kb-export
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  initDatabase,
  closeDatabase,
  getSchemaVersion,
  getRecordCounts,
  getAllEntities,
  getAllRelations,
  getAllDataSources,
  getAllDataRecords,
  getAllEmbeddings,
} from './db.mjs';

/**
 * Writes an array of rows as JSONL to a file. One JSON object per line, no trailing newline.
 * Empty arrays produce an empty file.
 *
 * @param {string} filePath - Output file path.
 * @param {Object[]} rows - Array of row objects to serialize.
 */
function writeJsonl(filePath, rows) {
  if (rows.length === 0) {
    writeFileSync(filePath, '');
    return;
  }
  const content = rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
  writeFileSync(filePath, content);
}

/**
 * Exports the entire database to the given output directory as flat files.
 * This is the programmatic API used by both CLI and tests.
 *
 * @param {string} outputDir - Path to the output directory (created if needed).
 * @param {{ silent?: boolean }} [options] - Options. Set silent=true to suppress stdout.
 */
export function exportDatabase(outputDir, options = {}) {
  const silent = options.silent ?? false;
  const log = silent ? () => {} : (msg) => process.stdout.write(msg + '\n');

  mkdirSync(outputDir, { recursive: true });

  // Export data_sources (JSONL)
  const dataSources = getAllDataSources();
  writeJsonl(join(outputDir, 'data_sources.jsonl'), dataSources);
  log(`  data_sources: ${dataSources.length} records`);

  // Export entities (JSONL)
  const entities = getAllEntities();
  writeJsonl(join(outputDir, 'entities.jsonl'), entities);
  log(`  entities: ${entities.length} records`);

  // Export relations (JSONL)
  const relations = getAllRelations();
  writeJsonl(join(outputDir, 'relations.jsonl'), relations);
  log(`  relations: ${relations.length} records`);

  // Export data_records (JSONL)
  const dataRecords = getAllDataRecords();
  writeJsonl(join(outputDir, 'data_records.jsonl'), dataRecords);
  log(`  data_records: ${dataRecords.length} records`);

  // Export embeddings (JSONL) — convert Float32Array to regular array
  const rawEmbeddings = getAllEmbeddings();
  const embeddings = rawEmbeddings.map((row) => ({
    entity_id: row.entity_id,
    embedding: Array.from(row.embedding),
  }));
  writeJsonl(join(outputDir, 'embeddings.jsonl'), embeddings);
  log(`  embeddings: ${embeddings.length} records`);

  // Export metadata.json
  const schemaVersion = getSchemaVersion();
  const recordCounts = getRecordCounts();
  const metadata = {
    schema_version: schemaVersion,
    exported_at: new Date().toISOString(),
    record_counts: recordCounts,
  };
  writeFileSync(join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
  log(`Export complete. 6 files written to ${outputDir}`);
}

// ---- CLI entry point ----
// Only run CLI when this file is executed directly (not imported)
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
  const args = process.argv.slice(2);

  // Parse arguments
  let outputDir = null;
  let dbPath = 'jarvis.db';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && i + 1 < args.length) {
      dbPath = args[++i];
    } else if (!outputDir) {
      outputDir = args[i];
    }
  }

  if (!outputDir) {
    process.stderr.write('Error: Output directory path is required.\nUsage: node src/kb-export.mjs <output-directory> [--db <database-path>]\n');
    process.exit(1);
  }

  if (!existsSync(dbPath)) {
    process.stderr.write(`Error: Database file not found: ${dbPath}\n`);
    process.exit(2);
  }

  try {
    process.stdout.write(`Exporting knowledge base from ${dbPath} to ${outputDir}\n`);
    initDatabase(dbPath);
    exportDatabase(outputDir);
    closeDatabase();
  } catch (err) {
    process.stderr.write(`Error: Failed to open database: ${err.message}\n`);
    closeDatabase();
    process.exit(2);
  }
}
