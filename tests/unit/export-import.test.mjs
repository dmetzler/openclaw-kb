import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  createRelation,
  createDataSource,
  getSchemaVersion,
  getRecordCounts,
  getAllEntities,
  getAllRelations,
  getAllDataSources,
  getAllDataRecords,
  insertRecord,
} from '../../src/db.mjs';

beforeEach(() => {
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('getAll* functions return parsed JSON fields', () => {
  it('getAllEntities returns entities with parsed metadata', () => {
    createEntity({ name: 'Alice', type: 'person', metadata: { age: 30, tags: ['engineer'] } });
    createEntity({ name: 'Bob', type: 'person', metadata: { age: 25 } });

    const entities = getAllEntities();
    expect(entities).toHaveLength(2);
    expect(entities[0].name).toBe('Alice');
    expect(entities[0].metadata).toEqual({ age: 30, tags: ['engineer'] });
    expect(entities[1].name).toBe('Bob');
    expect(entities[1].metadata).toEqual({ age: 25 });
    // Ordered by id ASC
    expect(entities[0].id).toBeLessThan(entities[1].id);
  });

  it('getAllRelations returns relations with parsed metadata', () => {
    const e1 = createEntity({ name: 'Alice', type: 'person' });
    const e2 = createEntity({ name: 'Acme', type: 'org' });
    createRelation({ source_id: e1.id, target_id: e2.id, type: 'WORKS_AT', metadata: { since: 2020 } });

    const relations = getAllRelations();
    expect(relations).toHaveLength(1);
    expect(relations[0].metadata).toEqual({ since: 2020 });
    expect(relations[0].source_id).toBe(e1.id);
    expect(relations[0].target_id).toBe(e2.id);
  });

  it('getAllDataSources returns sources with parsed config', () => {
    createDataSource({ name: 'fitbit', type: 'api', config: { endpoint: 'https://api.fitbit.com' } });

    const sources = getAllDataSources();
    expect(sources).toHaveLength(1);
    expect(sources[0].config).toEqual({ endpoint: 'https://api.fitbit.com' });
    expect(sources[0].name).toBe('fitbit');
  });

  it('getAllDataRecords returns records with parsed data', () => {
    const src = createDataSource({ name: 'dr-src', type: 'manual' });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });
    insertRecord('activity', {
      source_id: src.id,
      recorded_at: '2026-04-14T07:00:00Z',
      activity_type: 'running',
      duration_minutes: 30,
      distance_km: 5.2,
      calories: 320,
    });

    const records = getAllDataRecords();
    expect(records).toHaveLength(2);
    // Ordered by id ASC
    expect(records[0].id).toBeLessThan(records[1].id);
    expect(records[0].record_type).toBe('health_metric');
    expect(typeof records[0].data).toBe('object');
    expect(records[0].data.metric_type).toBe('weight');
    expect(records[1].record_type).toBe('activity');
    expect(records[1].data.activity_type).toBe('running');
  });
});

describe('getRecordCounts', () => {
  it('returns zero counts for empty database', () => {
    const counts = getRecordCounts();
    expect(counts).toEqual({
      data_records: {},
      data_sources: 0,
      embeddings: 0,
      entities: 0,
      relations: 0,
    });
  });

  it('returns correct counts after insertions', () => {
    createEntity({ name: 'A', type: 'x' });
    createEntity({ name: 'B', type: 'x' });
    const src = createDataSource({ name: 'src1', type: 'manual' });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });

    const counts = getRecordCounts();
    expect(counts.entities).toBe(2);
    expect(counts.data_sources).toBe(1);
    expect(counts.data_records).toEqual({ health_metric: 1 });
    expect(counts.relations).toBe(0);
  });

  it('returns keys in alphabetical order', () => {
    const counts = getRecordCounts();
    const keys = Object.keys(counts);
    expect(keys).toEqual([...keys].sort());
  });
});

describe('JSONL line generation for export', () => {
  it('entity serializes to deterministic JSON line', () => {
    createEntity({ name: 'Alice', type: 'person', metadata: { age: 30 } });
    const entities = getAllEntities();
    const line = JSON.stringify(entities[0]);
    const parsed = JSON.parse(line);
    expect(parsed.name).toBe('Alice');
    expect(parsed.metadata).toEqual({ age: 30 });
    // metadata is an object, not a string
    expect(typeof parsed.metadata).toBe('object');
  });

  it('relation serializes with metadata as nested object', () => {
    const e1 = createEntity({ name: 'A', type: 'x' });
    const e2 = createEntity({ name: 'B', type: 'y' });
    createRelation({ source_id: e1.id, target_id: e2.id, type: 'KNOWS', metadata: { since: 2020 } });
    const relations = getAllRelations();
    const line = JSON.stringify(relations[0]);
    const parsed = JSON.parse(line);
    expect(typeof parsed.metadata).toBe('object');
    expect(parsed.metadata.since).toBe(2020);
  });

  it('data source config serializes as nested object', () => {
    createDataSource({ name: 'api-src', type: 'api', config: { url: 'https://example.com' } });
    const sources = getAllDataSources();
    const line = JSON.stringify(sources[0]);
    const parsed = JSON.parse(line);
    expect(typeof parsed.config).toBe('object');
    expect(parsed.config.url).toBe('https://example.com');
  });
});

describe('metadata.json structure', () => {
  it('has correct shape with schema_version, exported_at, and record_counts', () => {
    const schemaVersion = getSchemaVersion();
    const counts = getRecordCounts();
    const exportedAt = new Date().toISOString();

    const metadata = {
      schema_version: schemaVersion,
      exported_at: exportedAt,
      record_counts: counts,
    };

    expect(metadata).toHaveProperty('schema_version');
    expect(metadata).toHaveProperty('exported_at');
    expect(metadata).toHaveProperty('record_counts');
    expect(typeof metadata.record_counts).toBe('object');
  });

  it('record_counts keys are in alphabetical order', () => {
    const counts = getRecordCounts();
    const keys = Object.keys(counts);
    expect(keys).toEqual([...keys].sort());
  });

  it('schema_version is a string or null', () => {
    const version = getSchemaVersion();
    expect(version === null || typeof version === 'string').toBe(true);
  });
});
