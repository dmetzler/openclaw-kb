import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  createRelation,
  createDataSource,
  insertHealthMetric,
  insertActivity,
  insertGrade,
  insertMeal,
  upsertEmbedding,
  EMBEDDING_DIMENSIONS,
} from '../../src/db.mjs';

// We'll import the export function once it exists
// For now these tests should fail
import { exportDatabase } from '../../src/kb-export.mjs';

let tmpDir;

beforeEach(() => {
  initDatabase(':memory:');
  tmpDir = mkdtempSync(join(tmpdir(), 'kb-export-test-'));
});

afterEach(() => {
  closeDatabase();
  rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Seeds the database with known test data across all tables.
 * Returns the seed data for assertions.
 */
function seedDatabase() {
  // Data sources
  const ds1 = createDataSource({ name: 'fitbit-api', type: 'api', config: { api_key: 'abc123', endpoint: 'https://api.fitbit.com' } });
  const ds2 = createDataSource({ name: 'manual-entry', type: 'manual', config: {} });

  // Entities
  const e1 = createEntity({ name: 'John Doe', type: 'person', metadata: { age: 30, tags: ['engineer', 'parent'] } });
  const e2 = createEntity({ name: 'Acme Corp', type: 'organization', metadata: { industry: 'tech' } });

  // Relations
  const r1 = createRelation({ source_id: e1.id, target_id: e2.id, type: 'works_at', metadata: { since: '2020' } });

  // Health metrics
  const hm1 = insertHealthMetric({ source_id: ds1.id, metric_type: 'heart_rate', value: 72, unit: 'bpm', recorded_at: '2026-04-10T08:00:00', metadata: { resting: true } });
  const hm2 = insertHealthMetric({ source_id: ds1.id, metric_type: 'weight', value: 75.5, unit: 'kg', recorded_at: '2026-04-10T08:00:00' });

  // Activities
  const act1 = insertActivity({ source_id: ds1.id, activity_type: 'running', duration_minutes: 30, intensity: 'moderate', recorded_at: '2026-04-10T07:00:00' });

  // Grades
  const gr1 = insertGrade({ source_id: ds2.id, subject: 'Mathematics', score: 95, scale: 'percentage', recorded_at: '2026-04-10T09:00:00' });

  // Meals
  const ml1 = insertMeal({ source_id: ds1.id, meal_type: 'breakfast', items: ['oatmeal', 'coffee'], nutrition: { calories: 350 }, recorded_at: '2026-04-10T07:00:00' });

  // Embeddings
  const vec = new Float32Array(EMBEDDING_DIMENSIONS);
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) vec[i] = (i - 192) / 100;
  upsertEmbedding(e1.id, vec);

  return { ds1, ds2, e1, e2, r1, hm1, hm2, act1, gr1, ml1, vec };
}

describe('Full export integration', () => {
  it('creates all 9 expected files', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const expectedFiles = [
      'metadata.json',
      'data_sources.jsonl',
      'entities.jsonl',
      'relations.jsonl',
      'health_metrics.csv',
      'activities.csv',
      'grades.csv',
      'meals.csv',
      'embeddings.jsonl',
    ];

    for (const file of expectedFiles) {
      expect(existsSync(join(tmpDir, file)), `Missing file: ${file}`).toBe(true);
    }
  });

  it('entities.jsonl has correct JSON per line with parsed metadata', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const lines = readFileSync(join(tmpDir, 'entities.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);

    const e1 = JSON.parse(lines[0]);
    expect(e1.name).toBe('John Doe');
    expect(e1.type).toBe('person');
    expect(typeof e1.metadata).toBe('object');
    expect(e1.metadata.age).toBe(30);
    expect(e1.metadata.tags).toEqual(['engineer', 'parent']);

    const e2 = JSON.parse(lines[1]);
    expect(e2.name).toBe('Acme Corp');
    expect(e2.metadata.industry).toBe('tech');
  });

  it('relations.jsonl has correct JSON per line', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const lines = readFileSync(join(tmpDir, 'relations.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);

    const r = JSON.parse(lines[0]);
    expect(r.type).toBe('works_at');
    expect(typeof r.metadata).toBe('object');
    expect(r.metadata.since).toBe('2020');
  });

  it('data_sources.jsonl has correct JSON per line with parsed config', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const lines = readFileSync(join(tmpDir, 'data_sources.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);

    const ds1 = JSON.parse(lines[0]);
    expect(ds1.name).toBe('fitbit-api');
    expect(typeof ds1.config).toBe('object');
    expect(ds1.config.api_key).toBe('abc123');
  });

  it('health_metrics.csv has header and correct rows', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const csv = readFileSync(join(tmpDir, 'health_metrics.csv'), 'utf8');
    const lines = csv.split('\r\n').filter((l) => l.length > 0);
    expect(lines[0]).toBe('id,source_id,metric_type,value,unit,metadata,recorded_at,created_at');
    expect(lines.length).toBe(3); // header + 2 rows
  });

  it('activities.csv has header and correct rows', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const csv = readFileSync(join(tmpDir, 'activities.csv'), 'utf8');
    const lines = csv.split('\r\n').filter((l) => l.length > 0);
    expect(lines[0]).toBe('id,source_id,activity_type,duration_minutes,intensity,metadata,recorded_at,created_at');
    expect(lines.length).toBe(2); // header + 1 row
  });

  it('grades.csv has header and correct rows', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const csv = readFileSync(join(tmpDir, 'grades.csv'), 'utf8');
    const lines = csv.split('\r\n').filter((l) => l.length > 0);
    expect(lines[0]).toBe('id,source_id,subject,score,scale,metadata,recorded_at,created_at');
    expect(lines.length).toBe(2); // header + 1 row
  });

  it('meals.csv has header and correct rows', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const csv = readFileSync(join(tmpDir, 'meals.csv'), 'utf8');
    const lines = csv.split('\r\n').filter((l) => l.length > 0);
    expect(lines[0]).toBe('id,source_id,meal_type,items,nutrition,metadata,recorded_at,created_at');
    expect(lines.length).toBe(2); // header + 1 row
  });

  it('embeddings.jsonl has correct float data', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const lines = readFileSync(join(tmpDir, 'embeddings.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);

    const emb = JSON.parse(lines[0]);
    expect(emb).toHaveProperty('entity_id');
    expect(emb).toHaveProperty('embedding');
    expect(Array.isArray(emb.embedding)).toBe(true);
    expect(emb.embedding).toHaveLength(EMBEDDING_DIMENSIONS);
    // Check precision — values should round-trip
    expect(typeof emb.embedding[0]).toBe('number');
  });

  it('metadata.json has correct counts and schema version', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const metadata = JSON.parse(readFileSync(join(tmpDir, 'metadata.json'), 'utf8'));
    expect(metadata).toHaveProperty('schema_version');
    expect(metadata).toHaveProperty('exported_at');
    expect(metadata).toHaveProperty('record_counts');

    expect(metadata.record_counts.entities).toBe(2);
    expect(metadata.record_counts.relations).toBe(1);
    expect(metadata.record_counts.data_sources).toBe(2);
    expect(metadata.record_counts.health_metrics).toBe(2);
    expect(metadata.record_counts.activities).toBe(1);
    expect(metadata.record_counts.grades).toBe(1);
    expect(metadata.record_counts.meals).toBe(1);
    expect(metadata.record_counts.embeddings).toBe(1);

    // Keys in fixed order
    const keys = Object.keys(metadata);
    expect(keys).toEqual(['schema_version', 'exported_at', 'record_counts']);

    // record_counts keys in alphabetical order
    const countKeys = Object.keys(metadata.record_counts);
    expect(countKeys).toEqual([...countKeys].sort());
  });

  it('metadata.json is pretty-printed with 2-space indent', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const raw = readFileSync(join(tmpDir, 'metadata.json'), 'utf8');
    // Pretty-printed means the second line should start with spaces
    expect(raw).toContain('\n  "');
  });

  it('empty table export produces correct empty files', () => {
    // No data seeded — all tables empty
    exportDatabase(tmpDir);

    // JSONL files should be empty
    expect(readFileSync(join(tmpDir, 'entities.jsonl'), 'utf8')).toBe('');
    expect(readFileSync(join(tmpDir, 'relations.jsonl'), 'utf8')).toBe('');
    expect(readFileSync(join(tmpDir, 'data_sources.jsonl'), 'utf8')).toBe('');
    expect(readFileSync(join(tmpDir, 'embeddings.jsonl'), 'utf8')).toBe('');

    // CSV files should have header only
    const hmCsv = readFileSync(join(tmpDir, 'health_metrics.csv'), 'utf8');
    expect(hmCsv).toBe('id,source_id,metric_type,value,unit,metadata,recorded_at,created_at\r\n');

    // metadata.json should have zero counts
    const metadata = JSON.parse(readFileSync(join(tmpDir, 'metadata.json'), 'utf8'));
    for (const count of Object.values(metadata.record_counts)) {
      expect(count).toBe(0);
    }
  });
});
