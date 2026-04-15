import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  createRelation,
  createDataSource,
  getEntity,
  insertRecord,
  upsertEmbedding,
  getAllEntities,
  getAllRelations,
  getAllDataSources,
  getAllDataRecords,
  getAllEmbeddings,
  getRecordCounts,
  findNearestVectors,
  search,
  EMBEDDING_DIMENSIONS,
} from '../../src/db.mjs';
import { exportDatabase } from '../../src/kb-export.mjs';
import { importDatabase } from '../../src/kb-import.mjs';

let tmpDir;
let exportDir;
let importDbPath;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'kb-import-test-'));
  exportDir = join(tmpDir, 'export');
  importDbPath = join(tmpDir, 'imported.db');
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
  rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Seeds the database with known test data across all tables.
 */
function seedDatabase() {
  const ds1 = createDataSource({ name: 'fitbit-api', type: 'api', config: { api_key: 'abc123', endpoint: 'https://api.fitbit.com' } });
  const ds2 = createDataSource({ name: 'manual-entry', type: 'manual', config: {} });

  const e1 = createEntity({ name: 'John Doe', type: 'person', metadata: { age: 30, tags: ['engineer', 'parent'] } });
  const e2 = createEntity({ name: 'Acme Corp', type: 'organization', metadata: { industry: 'tech' } });

  createRelation({ source_id: e1.id, target_id: e2.id, type: 'works_at', metadata: { since: '2020' } });

  insertRecord('health_metric', { source_id: ds1.id, metric_type: 'heart_rate', value: 72, unit: 'bpm', recorded_at: '2026-04-10T08:00:00', metadata: { resting: true } });
  insertRecord('health_metric', { source_id: ds1.id, metric_type: 'weight', value: 75.5, unit: 'kg', recorded_at: '2026-04-10T08:00:00', metadata: {} });
  insertRecord('activity', { source_id: ds1.id, activity_type: 'running', duration_minutes: 30, intensity: 'moderate', recorded_at: '2026-04-10T07:00:00', metadata: {} });
  insertRecord('grade', { source_id: ds2.id, subject: 'Mathematics', score: 95, scale: 'percentage', recorded_at: '2026-04-10T09:00:00', metadata: {} });
  insertRecord('meal', { source_id: ds1.id, meal_type: 'breakfast', items: ['oatmeal', 'coffee'], nutrition: { calories: 350 }, recorded_at: '2026-04-10T07:00:00', metadata: {} });

  const vec = new Float32Array(EMBEDDING_DIMENSIONS);
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) vec[i] = (i - 192) / 100;
  upsertEmbedding(e1.id, vec);

  return { ds1, ds2, e1, e2 };
}

describe('Full import integration', () => {
  it('all tables have correct row counts after import', () => {
    seedDatabase();
    exportDatabase(exportDir, { silent: true });
    closeDatabase();

    importDatabase(exportDir, importDbPath, { silent: true });
    closeDatabase();
    initDatabase(importDbPath);

    const counts = getRecordCounts();
    expect(counts.entities).toBe(2);
    expect(counts.relations).toBe(1);
    expect(counts.data_sources).toBe(2);
    expect(counts.data_records).toEqual({
      health_metric: 2,
      activity: 1,
      grade: 1,
      meal: 1,
    });
    expect(counts.embeddings).toBe(1);
  });

  it('entity data matches after import', () => {
    seedDatabase();
    exportDatabase(exportDir, { silent: true });
    closeDatabase();

    importDatabase(exportDir, importDbPath, { silent: true });
    closeDatabase();
    initDatabase(importDbPath);

    const entities = getAllEntities();
    expect(entities).toHaveLength(2);
    expect(entities[0].name).toBe('John Doe');
    expect(entities[0].metadata).toEqual({ age: 30, tags: ['engineer', 'parent'] });
    expect(entities[1].name).toBe('Acme Corp');
  });

  it('relation data matches after import', () => {
    seedDatabase();
    exportDatabase(exportDir, { silent: true });
    closeDatabase();

    importDatabase(exportDir, importDbPath, { silent: true });
    closeDatabase();
    initDatabase(importDbPath);

    const relations = getAllRelations();
    expect(relations).toHaveLength(1);
    expect(relations[0].type).toBe('works_at');
    expect(relations[0].metadata).toEqual({ since: '2020' });
  });

  it('data records match after import', () => {
    seedDatabase();
    exportDatabase(exportDir, { silent: true });
    closeDatabase();

    importDatabase(exportDir, importDbPath, { silent: true });
    closeDatabase();
    initDatabase(importDbPath);

    const records = getAllDataRecords();
    expect(records).toHaveLength(5);

    const healthMetrics = records.filter((r) => r.record_type === 'health_metric');
    expect(healthMetrics).toHaveLength(2);
    const heartRate = healthMetrics.find((r) => r.data.metric_type === 'heart_rate');
    expect(heartRate.data.metadata).toEqual({ resting: true });

    const activities = records.filter((r) => r.record_type === 'activity');
    expect(activities).toHaveLength(1);
    expect(activities[0].data.activity_type).toBe('running');

    const grades = records.filter((r) => r.record_type === 'grade');
    expect(grades).toHaveLength(1);
    expect(grades[0].data.subject).toBe('Mathematics');

    const meals = records.filter((r) => r.record_type === 'meal');
    expect(meals).toHaveLength(1);
    expect(meals[0].data.items).toEqual(['oatmeal', 'coffee']);
    expect(meals[0].data.nutrition).toEqual({ calories: 350 });
  });

  it('embeddings are queryable via KNN after import', () => {
    seedDatabase();
    exportDatabase(exportDir, { silent: true });
    closeDatabase();

    importDatabase(exportDir, importDbPath, { silent: true });
    closeDatabase();
    initDatabase(importDbPath);

    const queryVec = new Float32Array(EMBEDDING_DIMENSIONS);
    for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) queryVec[i] = (i - 192) / 100;

    const nearest = findNearestVectors(queryVec, 1);
    expect(nearest).toHaveLength(1);
    expect(nearest[0].distance).toBeCloseTo(0, 5);
  });

  it('FTS5 search returns results after import', () => {
    seedDatabase();
    exportDatabase(exportDir, { silent: true });
    closeDatabase();

    importDatabase(exportDir, importDbPath, { silent: true });
    closeDatabase();
    initDatabase(importDbPath);

    const results = search('John');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('Import error cases', () => {
  it('throws on missing export directory', () => {
    closeDatabase();
    expect(() => {
      importDatabase(join(tmpDir, 'nonexistent'), importDbPath, { silent: true });
    }).toThrow(/not found/i);
  });

  it('throws on missing required files', () => {
    // Create empty export directory
    const emptyDir = join(tmpDir, 'empty-export');
    mkdirSync(emptyDir, { recursive: true });

    closeDatabase();
    expect(() => {
      importDatabase(emptyDir, importDbPath, { silent: true });
    }).toThrow(/missing/i);
  });

  it('throws when target database already exists', () => {
    seedDatabase();
    exportDatabase(exportDir, { silent: true });
    closeDatabase();

    // Create the target DB first
    writeFileSync(importDbPath, '');

    expect(() => {
      importDatabase(exportDir, importDbPath, { silent: true });
    }).toThrow(/already exists/i);
  });

  it('throws on schema version mismatch', () => {
    seedDatabase();
    exportDatabase(exportDir, { silent: true });
    closeDatabase();

    // Tamper with metadata to have a future schema version
    const metadataPath = join(exportDir, 'metadata.json');
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    metadata.schema_version = '999';
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    expect(() => {
      importDatabase(exportDir, importDbPath, { silent: true });
    }).toThrow(/version/i);
  });
});
