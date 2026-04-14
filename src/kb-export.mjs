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
import { csvStringify } from './csv.mjs';
import {
  initDatabase,
  closeDatabase,
  getSchemaVersion,
  getRecordCounts,
  getAllEntities,
  getAllRelations,
  getAllDataSources,
  getAllHealthMetrics,
  getAllActivities,
  getAllGrades,
  getAllMeals,
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
 * Writes rows as RFC 4180 CSV to a file. Always includes header row.
 * Empty rows produce a header-only file.
 *
 * @param {string} filePath - Output file path.
 * @param {string[]} headers - Column names.
 * @param {Object[]} rows - Array of row objects.
 * @param {string[]} columns - Column keys to extract from each row (same order as headers).
 */
function writeCsv(filePath, headers, rows, columns) {
  const dataRows = rows.map((row) =>
    columns.map((col) => {
      const val = row[col];
      // JSON fields (metadata, items, nutrition) come as objects from getAll*
      // Serialize them back to JSON strings for CSV (FR-023)
      if (val !== null && val !== undefined && typeof val === 'object') {
        return JSON.stringify(val);
      }
      return val;
    }),
  );
  writeFileSync(filePath, csvStringify(headers, dataRows));
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

  // Export health_metrics (CSV)
  const hmHeaders = ['id', 'source_id', 'metric_type', 'value', 'unit', 'metadata', 'recorded_at', 'created_at'];
  const healthMetrics = getAllHealthMetrics();
  writeCsv(join(outputDir, 'health_metrics.csv'), hmHeaders, healthMetrics, hmHeaders);
  log(`  health_metrics: ${healthMetrics.length} records`);

  // Export activities (CSV)
  const actHeaders = ['id', 'source_id', 'activity_type', 'duration_minutes', 'intensity', 'metadata', 'recorded_at', 'created_at'];
  const activities = getAllActivities();
  writeCsv(join(outputDir, 'activities.csv'), actHeaders, activities, actHeaders);
  log(`  activities: ${activities.length} records`);

  // Export grades (CSV)
  const grHeaders = ['id', 'source_id', 'subject', 'score', 'scale', 'metadata', 'recorded_at', 'created_at'];
  const grades = getAllGrades();
  writeCsv(join(outputDir, 'grades.csv'), grHeaders, grades, grHeaders);
  log(`  grades: ${grades.length} records`);

  // Export meals (CSV)
  const mlHeaders = ['id', 'source_id', 'meal_type', 'items', 'nutrition', 'metadata', 'recorded_at', 'created_at'];
  const meals = getAllMeals();
  writeCsv(join(outputDir, 'meals.csv'), mlHeaders, meals, mlHeaders);
  log(`  meals: ${meals.length} records`);

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
  log(`Export complete. 9 files written to ${outputDir}`);
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
