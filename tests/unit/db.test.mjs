import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  getEntity,
  updateEntity,
  deleteEntity,
  createRelation,
  getRelationsFrom,
  getRelationsTo,
  deleteRelation,
  createDataSource,
  getDataSource,
  updateDataSource,
  insertRecord,
  queryRecords,
} from '../../src/db.mjs';

beforeEach(() => {
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('Entity CRUD', () => {
  it('createEntity with name and type returns entity with defaults', () => {
    const entity = createEntity({ name: 'Alice', type: 'person' });

    expect(entity).toMatchObject({
      id: expect.any(Number),
      name: 'Alice',
      type: 'person',
      metadata: {},
    });
    expect(entity.id).toBeGreaterThan(0);
    expect(entity.created_at).toEqual(expect.any(String));
    expect(entity.updated_at).toEqual(expect.any(String));
  });

  it('createEntity with metadata returns parsed metadata object', () => {
    const metadata = { role: 'engineer', active: true };
    const entity = createEntity({ name: 'Alice', type: 'person', metadata });

    expect(entity.metadata).toEqual(metadata);
  });

  it('createEntity with empty name throws', () => {
    expect(() => createEntity({ name: '', type: 'person' })).toThrow();
  });

  it('createEntity with empty type throws', () => {
    expect(() => createEntity({ name: 'Alice', type: '' })).toThrow();
  });

  it('getEntity returns matching entity with parsed metadata', () => {
    const created = createEntity({ name: 'Neo', type: 'person', metadata: { alias: 'The One' } });
    const entity = getEntity(created.id);

    expect(entity).toEqual(created);
    expect(entity.metadata).toEqual({ alias: 'The One' });
  });

  it('getEntity with nonexistent id returns null', () => {
    expect(getEntity(999999)).toBeNull();
  });

  it('updateEntity with name returns updated entity', () => {
    const created = createEntity({ name: 'Alice', type: 'person' });
    const updated = updateEntity(created.id, { name: 'Alicia' });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Alicia');
    expect(updated.type).toBe('person');
  });

  it('updateEntity with metadata returns entity with new parsed metadata', () => {
    const created = createEntity({ name: 'Alice', type: 'person' });
    const updated = updateEntity(created.id, { metadata: { role: 'architect', level: 7 } });

    expect(updated.metadata).toEqual({ role: 'architect', level: 7 });
  });

  it('updateEntity with nonexistent id throws', () => {
    expect(() => updateEntity(999999, { name: 'Ghost' })).toThrow();
  });

  it('updateEntity with empty name throws', () => {
    const created = createEntity({ name: 'Alice', type: 'person' });
    expect(() => updateEntity(created.id, { name: '' })).toThrow();
  });

  it('deleteEntity returns true for existing entity', () => {
    const created = createEntity({ name: 'Alice', type: 'person' });
    expect(deleteEntity(created.id)).toBe(true);
  });

  it('deleteEntity returns false for nonexistent entity', () => {
    expect(deleteEntity(999999)).toBe(false);
  });
});

describe('Relation CRUD', () => {
  it('createRelation with source, target, type returns relation with defaults', () => {
    const source = createEntity({ name: 'Alice', type: 'person' });
    const target = createEntity({ name: 'Acme', type: 'company' });

    const relation = createRelation({ source_id: source.id, target_id: target.id, type: 'WORKS_AT' });

    expect(relation).toMatchObject({
      id: expect.any(Number),
      source_id: source.id,
      target_id: target.id,
      type: 'WORKS_AT',
      metadata: {},
    });
    expect(relation.id).toBeGreaterThan(0);
    expect(relation.created_at).toEqual(expect.any(String));
  });

  it('createRelation with metadata returns parsed metadata', () => {
    const source = createEntity({ name: 'Alice', type: 'person' });
    const target = createEntity({ name: 'Project X', type: 'project' });

    const relation = createRelation({
      source_id: source.id,
      target_id: target.id,
      type: 'OWNS',
      metadata: { since: 2024, priority: 'high' },
    });

    expect(relation.metadata).toEqual({ since: 2024, priority: 'high' });
  });

  it('createRelation with source_id === target_id throws', () => {
    const entity = createEntity({ name: 'Loop', type: 'concept' });
    expect(() => createRelation({ source_id: entity.id, target_id: entity.id, type: 'SELF' })).toThrow();
  });

  it('createRelation with empty type throws', () => {
    const source = createEntity({ name: 'Alice', type: 'person' });
    const target = createEntity({ name: 'Acme', type: 'company' });
    expect(() => createRelation({ source_id: source.id, target_id: target.id, type: '' })).toThrow();
  });

  it('createRelation with nonexistent source_id throws', () => {
    const target = createEntity({ name: 'Acme', type: 'company' });
    expect(() => createRelation({ source_id: 999999, target_id: target.id, type: 'WORKS_AT' })).toThrow();
  });

  it('createRelation with nonexistent target_id throws', () => {
    const source = createEntity({ name: 'Alice', type: 'person' });
    expect(() => createRelation({ source_id: source.id, target_id: 999999, type: 'WORKS_AT' })).toThrow();
  });

  it('createRelation duplicate throws', () => {
    const source = createEntity({ name: 'Alice', type: 'person' });
    const target = createEntity({ name: 'Acme', type: 'company' });
    createRelation({ source_id: source.id, target_id: target.id, type: 'WORKS_AT' });
    expect(() => createRelation({ source_id: source.id, target_id: target.id, type: 'WORKS_AT' })).toThrow();
  });

  it('getRelationsFrom returns outbound relations', () => {
    const source = createEntity({ name: 'Alice', type: 'person' });
    const targetA = createEntity({ name: 'Acme', type: 'company' });
    const targetB = createEntity({ name: 'Project X', type: 'project' });

    createRelation({ source_id: source.id, target_id: targetA.id, type: 'WORKS_AT' });
    createRelation({ source_id: source.id, target_id: targetB.id, type: 'OWNS' });

    const relations = getRelationsFrom(source.id);
    expect(relations).toHaveLength(2);
    expect(relations.map(r => r.type)).toEqual(expect.arrayContaining(['WORKS_AT', 'OWNS']));
  });

  it('getRelationsTo returns inbound relations', () => {
    const target = createEntity({ name: 'Acme', type: 'company' });
    const sourceA = createEntity({ name: 'Alice', type: 'person' });
    const sourceB = createEntity({ name: 'Bob', type: 'person' });

    createRelation({ source_id: sourceA.id, target_id: target.id, type: 'WORKS_AT' });
    createRelation({ source_id: sourceB.id, target_id: target.id, type: 'INVESTS_IN' });

    const relations = getRelationsTo(target.id);
    expect(relations).toHaveLength(2);
  });

  it('getRelationsFrom with no relations returns empty array', () => {
    const entity = createEntity({ name: 'Alice', type: 'person' });
    expect(getRelationsFrom(entity.id)).toEqual([]);
  });

  it('deleteRelation returns true for existing relation', () => {
    const source = createEntity({ name: 'Alice', type: 'person' });
    const target = createEntity({ name: 'Acme', type: 'company' });
    const relation = createRelation({ source_id: source.id, target_id: target.id, type: 'WORKS_AT' });
    expect(deleteRelation(relation.id)).toBe(true);
  });

  it('deleteRelation returns false for nonexistent relation', () => {
    expect(deleteRelation(999999)).toBe(false);
  });
});

describe('Data Source CRUD', () => {
  it('createDataSource with name and type returns source with defaults', () => {
    const source = createDataSource({ name: 'fitbit', type: 'api' });

    expect(source).toMatchObject({
      id: expect.any(Number),
      name: 'fitbit',
      type: 'api',
      config: {},
      is_active: 1,
    });
    expect(source.id).toBeGreaterThan(0);
    expect(source.created_at).toEqual(expect.any(String));
    expect(source.updated_at).toEqual(expect.any(String));
  });

  it('createDataSource with config returns parsed config object', () => {
    const config = { base_url: 'https://api.example.com', sync_enabled: true };
    const source = createDataSource({ name: 'oura', type: 'api', config });

    expect(source.config).toEqual(config);
  });

  it('createDataSource with empty name throws', () => {
    expect(() => createDataSource({ name: '', type: 'manual' })).toThrow();
  });

  it('createDataSource with duplicate name throws', () => {
    createDataSource({ name: 'grades-app', type: 'import' });

    expect(() => createDataSource({ name: 'grades-app', type: 'manual' })).toThrow();
  });

  it('getDataSource returns matching source with parsed config', () => {
    const created = createDataSource({
      name: 'nutrition-log',
      type: 'manual',
      config: { timezone: 'UTC', track_portions: true },
    });

    const source = getDataSource(created.id);

    expect(source).toEqual(created);
    expect(source.config).toEqual({ timezone: 'UTC', track_portions: true });
  });

  it('getDataSource with nonexistent id returns null', () => {
    expect(getDataSource(999999)).toBeNull();
  });

  it('updateDataSource with name returns updated source', () => {
    const created = createDataSource({ name: 'old-source', type: 'manual' });
    const updated = updateDataSource(created.id, { name: 'new-source' });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('new-source');
    expect(updated.type).toBe('manual');
  });

  it('updateDataSource with is_active returns updated source', () => {
    const created = createDataSource({ name: 'sleep-tracker', type: 'api' });
    const updated = updateDataSource(created.id, { is_active: 0 });

    expect(updated.id).toBe(created.id);
    expect(updated.is_active).toBe(0);
  });

  it('updateDataSource with nonexistent id throws', () => {
    expect(() => updateDataSource(999999, { name: 'ghost-source' })).toThrow();
  });
});

describe('insertRecord', () => {
  it('insertRecord returns record with id, source_id, record_type, data (parsed), recorded_at, created_at', () => {
    const src = createDataSource({ name: 'test-source', type: 'manual' });
    const record = insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });

    expect(record).toMatchObject({
      id: expect.any(Number),
      source_id: src.id,
      record_type: 'health_metric',
      recorded_at: '2026-04-14T10:00:00Z',
    });
    expect(record.id).toBeGreaterThan(0);
    expect(record.data).toEqual(expect.any(Object));
    expect(record.created_at).toEqual(expect.any(String));
  });

  it('insertRecord stores full data object as JSON (including source_id, recorded_at in data)', () => {
    const src = createDataSource({ name: 'test-source-2', type: 'manual' });
    const record = insertRecord('exercise', {
      source_id: src.id,
      recorded_at: '2026-04-14T14:30:00Z',
      activity: 'running',
      duration_minutes: 30,
      distance_km: 5.2,
    });

    expect(record.data).toEqual({
      source_id: src.id,
      recorded_at: '2026-04-14T14:30:00Z',
      activity: 'running',
      duration_minutes: 30,
      distance_km: 5.2,
    });
  });

  it('insertRecord throws on empty recordType', () => {
    const src = createDataSource({ name: 'test-source-3', type: 'manual' });
    expect(() =>
      insertRecord('', {
        source_id: src.id,
        recorded_at: '2026-04-14T10:00:00Z',
        value: 100,
      })
    ).toThrow();
  });

  it('insertRecord throws on missing data.source_id', () => {
    createDataSource({ name: 'test-source-4', type: 'manual' });
    expect(() =>
      insertRecord('metric', {
        recorded_at: '2026-04-14T10:00:00Z',
        value: 100,
      })
    ).toThrow();
  });

  it('insertRecord throws on nonexistent data.source_id', () => {
    expect(() =>
      insertRecord('metric', {
        source_id: 999999,
        recorded_at: '2026-04-14T10:00:00Z',
        value: 100,
      })
    ).toThrow();
  });

  it('insertRecord throws on missing data.recorded_at', () => {
    const src = createDataSource({ name: 'test-source-5', type: 'manual' });
    expect(() =>
      insertRecord('metric', {
        source_id: src.id,
        value: 100,
      })
    ).toThrow();
  });
});

describe('queryRecords', () => {
  it('queryRecords filters by record_type', () => {
    const src = createDataSource({ name: 'query-source-1', type: 'manual' });
    insertRecord('weight', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      value: 80,
    });
    insertRecord('weight', {
      source_id: src.id,
      recorded_at: '2026-04-14T11:00:00Z',
      value: 81,
    });
    insertRecord('heart_rate', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:30:00Z',
      value: 70,
    });

    const results = queryRecords('weight', { limit: 100 });
    expect(results).toHaveLength(2);
    expect(results.every(r => r.record_type === 'weight')).toBe(true);
  });

  it('queryRecords filters by source_id', () => {
    const src1 = createDataSource({ name: 'query-source-2', type: 'manual' });
    const src2 = createDataSource({ name: 'query-source-3', type: 'manual' });

    insertRecord('weight', {
      source_id: src1.id,
      recorded_at: '2026-04-14T10:00:00Z',
      value: 80,
    });
    insertRecord('weight', {
      source_id: src2.id,
      recorded_at: '2026-04-14T10:00:00Z',
      value: 75,
    });

    const results = queryRecords('weight', { source_id: src1.id, limit: 100 });
    expect(results).toHaveLength(1);
    expect(results[0].source_id).toBe(src1.id);
  });

  it('queryRecords filters by time range (from/to)', () => {
    const src = createDataSource({ name: 'query-source-4', type: 'manual' });

    insertRecord('metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T08:00:00Z',
      value: 1,
    });
    insertRecord('metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T12:00:00Z',
      value: 2,
    });
    insertRecord('metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T16:00:00Z',
      value: 3,
    });

    const results = queryRecords('metric', {
      from: '2026-04-14T10:00:00Z',
      to: '2026-04-14T15:00:00Z',
      limit: 100,
    });
    expect(results).toHaveLength(1);
    expect(results[0].data.value).toBe(2);
  });

  it('queryRecords supports limit and offset', () => {
    const src = createDataSource({ name: 'query-source-5', type: 'manual' });

    insertRecord('metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      value: 1,
    });
    insertRecord('metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T11:00:00Z',
      value: 2,
    });
    insertRecord('metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T12:00:00Z',
      value: 3,
    });
    insertRecord('metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T13:00:00Z',
      value: 4,
    });

    const page1 = queryRecords('metric', { limit: 2, offset: 0 });
    expect(page1).toHaveLength(2);

    const page2 = queryRecords('metric', { limit: 2, offset: 2 });
    expect(page2).toHaveLength(2);

    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('queryRecords supports jsonFilters', () => {
    const src = createDataSource({ name: 'query-source-6', type: 'manual' });

    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T11:00:00Z',
      metric_type: 'heart_rate',
      value: 70,
      unit: 'bpm',
    });
    insertRecord('health_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T12:00:00Z',
      metric_type: 'weight',
      value: 81,
      unit: 'kg',
    });

    const results = queryRecords('health_metric', {
      jsonFilters: { metric_type: 'weight' },
      limit: 100,
    });
    expect(results).toHaveLength(2);
    expect(results.every(r => r.data.metric_type === 'weight')).toBe(true);
  });

  it('queryRecords returns results ordered by recorded_at DESC (not ASC)', () => {
    const src = createDataSource({ name: 'query-source-7', type: 'manual' });

    insertRecord('metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      value: 1,
    });
    insertRecord('metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T11:00:00Z',
      value: 2,
    });
    insertRecord('metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T12:00:00Z',
      value: 3,
    });

    const results = queryRecords('metric', { limit: 100 });
    expect(results).toHaveLength(3);
    expect(results[0].data.value).toBe(3); // Latest first
    expect(results[1].data.value).toBe(2);
    expect(results[2].data.value).toBe(1); // Oldest last
  });

  it('queryRecords returns empty array for nonexistent record_type', () => {
    const src = createDataSource({ name: 'query-source-8', type: 'manual' });

    insertRecord('real_metric', {
      source_id: src.id,
      recorded_at: '2026-04-14T10:00:00Z',
      value: 100,
    });

    const results = queryRecords('nonexistent_type', { limit: 100 });
    expect(results).toEqual([]);
  });
});
