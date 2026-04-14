import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  deleteEntity,
  createRelation,
  getRelationsFrom,
  traverseGraph,
} from '../../src/db.mjs';

beforeEach(() => {
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('Knowledge Graph Integration', () => {
  it('traverseGraph returns a chain ordered by depth then id', () => {
    const a = createEntity({ name: 'A', type: 'node' });
    const b = createEntity({ name: 'B', type: 'node' });
    const c = createEntity({ name: 'C', type: 'node' });

    createRelation({ source_id: a.id, target_id: b.id, type: 'LINKS_TO' });
    createRelation({ source_id: b.id, target_id: c.id, type: 'LINKS_TO' });

    const result = traverseGraph(a.id, 3);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ id: a.id, name: 'A', type: 'node', depth: 0 });
    expect(result[1]).toMatchObject({ id: b.id, name: 'B', type: 'node', depth: 1 });
    expect(result[2]).toMatchObject({ id: c.id, name: 'C', type: 'node', depth: 2 });
  });

  it('traverseGraph with maxDepth=1 returns only start and first hop', () => {
    const a = createEntity({ name: 'A', type: 'node' });
    const b = createEntity({ name: 'B', type: 'node' });
    const c = createEntity({ name: 'C', type: 'node' });

    createRelation({ source_id: a.id, target_id: b.id, type: 'LINKS_TO' });
    createRelation({ source_id: b.id, target_id: c.id, type: 'LINKS_TO' });

    const result = traverseGraph(a.id, 1);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(a.id);
    expect(result[0].depth).toBe(0);
    expect(result[1].id).toBe(b.id);
    expect(result[1].depth).toBe(1);
  });

  it('traverseGraph always includes start entity at depth 0', () => {
    const a = createEntity({ name: 'A', type: 'node' });

    const result = traverseGraph(a.id, 0);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: a.id, depth: 0 });
  });

  it('traverseGraph detects cycles and returns each entity once', () => {
    const a = createEntity({ name: 'A', type: 'node' });
    const b = createEntity({ name: 'B', type: 'node' });
    const c = createEntity({ name: 'C', type: 'node' });

    createRelation({ source_id: a.id, target_id: b.id, type: 'LINKS_TO' });
    createRelation({ source_id: b.id, target_id: c.id, type: 'LINKS_TO' });
    createRelation({ source_id: c.id, target_id: a.id, type: 'LINKS_TO' });

    const result = traverseGraph(a.id, 10);
    expect(result).toHaveLength(3);
    const ids = result.map(r => r.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('traverseGraph respects maxDepth on longer chains', () => {
    const a = createEntity({ name: 'A', type: 'node' });
    const b = createEntity({ name: 'B', type: 'node' });
    const c = createEntity({ name: 'C', type: 'node' });
    const d = createEntity({ name: 'D', type: 'node' });
    const e = createEntity({ name: 'E', type: 'node' });

    createRelation({ source_id: a.id, target_id: b.id, type: 'LINKS_TO' });
    createRelation({ source_id: b.id, target_id: c.id, type: 'LINKS_TO' });
    createRelation({ source_id: c.id, target_id: d.id, type: 'LINKS_TO' });
    createRelation({ source_id: d.id, target_id: e.id, type: 'LINKS_TO' });

    const result = traverseGraph(a.id, 2);
    expect(result).toHaveLength(3);
    expect(result.map(r => r.depth)).toEqual([0, 1, 2]);
  });

  it('deleteEntity cascades relation deletion', () => {
    const a = createEntity({ name: 'A', type: 'node' });
    const b = createEntity({ name: 'B', type: 'node' });

    createRelation({ source_id: a.id, target_id: b.id, type: 'LINKS_TO' });
    deleteEntity(a.id);

    expect(getRelationsFrom(a.id)).toEqual([]);
  });

  it('traverseGraph with nonexistent start entity throws', () => {
    expect(() => traverseGraph(999999, 3)).toThrow();
  });

  it('traverseGraph returns comma-separated path', () => {
    const a = createEntity({ name: 'A', type: 'node' });
    const b = createEntity({ name: 'B', type: 'node' });
    const c = createEntity({ name: 'C', type: 'node' });

    createRelation({ source_id: a.id, target_id: b.id, type: 'LINKS_TO' });
    createRelation({ source_id: b.id, target_id: c.id, type: 'LINKS_TO' });

    const result = traverseGraph(a.id, 3);
    expect(result[0].path).toBe(`${a.id}`);
    expect(result[1].path).toBe(`${a.id},${b.id}`);
    expect(result[2].path).toBe(`${a.id},${b.id},${c.id}`);
  });
});
