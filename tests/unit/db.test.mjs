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
