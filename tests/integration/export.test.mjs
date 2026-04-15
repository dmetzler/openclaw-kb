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
  insertRecord,
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

function seedDatabase() {
  const ds1 = createDataSource({ name: 'fitbit-api', type: 'api', config: { api_key: 'abc123', endpoint: 'https://api.fitbit.com' } });
  const ds2 = createDataSource({ name: 'manual-entry', type: 'manual', config: {} });

  const e1 = createEntity({ name: 'John Doe', type: 'person', metadata: { age: 30, tags: ['engineer', 'parent'] } });
  const e2 = createEntity({ name: 'Acme Corp', type: 'organization', metadata: { industry: 'tech' } });

  const r1 = createRelation({ source_id: e1.id, target_id: e2.id, type: 'works_at', metadata: { since: '2020' } });

  insertRecord('health_metric', {
    source_id: ds1.id,
    metric_type: 'heart_rate',
    value: 72,
    unit: 'bpm',
    recorded_at: '2026-04-10T08:00:00',
    device: 'Fitbit Sense',
  });
  insertRecord('health_metric', {
    source_id: ds1.id,
    metric_type: 'weight',
    value: 75.5,
    unit: 'kg',
    recorded_at: '2026-04-10T08:00:00',
    device: 'Withings Scale',
  });
  insertRecord('activity', {
    source_id: ds1.id,
    activity_type: 'running',
    duration_minutes: 30,
    distance_km: 5.2,
    calories: 320,
    recorded_at: '2026-04-10T07:00:00',
  });
  insertRecord('grade', {
    source_id: ds2.id,
    student: 'John Doe',
    subject: 'Mathematics',
    score: 95,
    max_score: 100,
    school_year: '2025-2026',
    recorded_at: '2026-04-10T09:00:00',
  });
  insertRecord('meal', {
    source_id: ds1.id,
    meal_type: 'breakfast',
    items: ['oatmeal', 'coffee'],
    calories_est: 350,
    recorded_at: '2026-04-10T07:00:00',
  });

  const vec = new Float32Array(EMBEDDING_DIMENSIONS);
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) vec[i] = (i - 192) / 100;
  upsertEmbedding(e1.id, vec);

  return { ds1, ds2, e1, e2, r1, vec };
}

describe('Full export integration', () => {
  it('creates all 6 expected files', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const expectedFiles = [
      'metadata.json',
      'data_sources.jsonl',
      'entities.jsonl',
      'relations.jsonl',
      'data_records.jsonl',
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

  it('data_records.jsonl has correct JSONL lines with all record types', () => {
    seedDatabase();
    exportDatabase(tmpDir);

    const lines = readFileSync(join(tmpDir, 'data_records.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(5); // 2 health_metric + 1 activity + 1 grade + 1 meal

    const records = lines.map((l) => JSON.parse(l));
    const types = records.map((r) => r.record_type);
    expect(types.filter((t) => t === 'health_metric')).toHaveLength(2);
    expect(types.filter((t) => t === 'activity')).toHaveLength(1);
    expect(types.filter((t) => t === 'grade')).toHaveLength(1);
    expect(types.filter((t) => t === 'meal')).toHaveLength(1);

    // Verify data is a parsed object (not a string)
    for (const record of records) {
      expect(typeof record.data).toBe('object');
      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('source_id');
      expect(record).toHaveProperty('record_type');
      expect(record).toHaveProperty('recorded_at');
    }
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
    expect(metadata.record_counts.data_records).toEqual({
      health_metric: 2,
      activity: 1,
      grade: 1,
      meal: 1,
    });
    expect(metadata.record_counts.embeddings).toBe(1);

    const keys = Object.keys(metadata);
    expect(keys).toEqual(['schema_version', 'exported_at', 'record_counts']);

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
    exportDatabase(tmpDir);

    // JSONL files should be empty
    expect(readFileSync(join(tmpDir, 'entities.jsonl'), 'utf8')).toBe('');
    expect(readFileSync(join(tmpDir, 'relations.jsonl'), 'utf8')).toBe('');
    expect(readFileSync(join(tmpDir, 'data_sources.jsonl'), 'utf8')).toBe('');
    expect(readFileSync(join(tmpDir, 'data_records.jsonl'), 'utf8')).toBe('');
    expect(readFileSync(join(tmpDir, 'embeddings.jsonl'), 'utf8')).toBe('');

    const metadata = JSON.parse(readFileSync(join(tmpDir, 'metadata.json'), 'utf8'));
    expect(metadata.record_counts.data_records).toEqual({});
    expect(metadata.record_counts.entities).toBe(0);
    expect(metadata.record_counts.relations).toBe(0);
    expect(metadata.record_counts.data_sources).toBe(0);
    expect(metadata.record_counts.embeddings).toBe(0);
  });
});
