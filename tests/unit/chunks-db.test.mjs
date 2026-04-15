import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  insertChunk,
  getChunks,
  deleteChunksForEntity,
  upsertChunkEmbedding,
  findNearestChunks,
  getChunkWithEntity,
  search,
  CHUNK_EMBEDDING_DIMENSIONS,
} from '../../src/db.mjs';

beforeEach(() => {
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('Chunk CRUD', () => {
  it('insertChunk returns numeric id and stores content/metadata', () => {
    const entity = createEntity({ name: 'Test Doc', type: 'document' });
    const metadata = { section: 'intro', order: 1 };

    const id = insertChunk(entity.id, 0, 'Chunk content', metadata);

    expect(Number(id)).toBeGreaterThan(0);

    const chunks = getChunks(entity.id);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      id: Number(id),
      entity_id: entity.id,
      chunk_index: 0,
      content: 'Chunk content',
      metadata,
    });
  });

  it('insertChunk throws if entity does not exist', () => {
    expect(() => insertChunk(999999, 0, 'content')).toThrow();
  });

  it('insertChunk throws if content is empty', () => {
    const entity = createEntity({ name: 'Test Doc', type: 'document' });
    expect(() => insertChunk(entity.id, 0, '')).toThrow();
    expect(() => insertChunk(entity.id, 0, '   ')).toThrow();
  });

  it('getChunks returns chunks ordered by chunk_index ASC with parsed metadata', () => {
    const entity = createEntity({ name: 'Test Doc', type: 'document' });
    insertChunk(entity.id, 2, 'third', { idx: 2 });
    insertChunk(entity.id, 0, 'first', { idx: 0 });
    insertChunk(entity.id, 1, 'second', { idx: 1 });

    const chunks = getChunks(entity.id);
    expect(chunks).toHaveLength(3);
    expect(chunks.map((chunk) => chunk.chunk_index)).toEqual([0, 1, 2]);
    expect(chunks[0].metadata).toEqual({ idx: 0 });
    expect(chunks[1].metadata).toEqual({ idx: 1 });
    expect(chunks[2].metadata).toEqual({ idx: 2 });
  });

  it('getChunks returns empty array for nonexistent entity', () => {
    expect(getChunks(999999)).toEqual([]);
  });

  it('deleteChunksForEntity returns deleted count', () => {
    const entity = createEntity({ name: 'Test Doc', type: 'document' });
    insertChunk(entity.id, 0, 'first');
    insertChunk(entity.id, 1, 'second');

    const deleted = deleteChunksForEntity(entity.id);
    expect(deleted).toBe(2);
    expect(getChunks(entity.id)).toEqual([]);
  });

  it('deleteChunksForEntity returns 0 for nonexistent entity', () => {
    expect(deleteChunksForEntity(999999)).toBe(0);
  });
});

describe('FTS5 chunk triggers (T021)', () => {
  it('insertChunk creates search_index entry', () => {
    const entity = createEntity({ name: 'Searchable Doc', type: 'document' });
    const content = 'Chunk content for search index';
    const metadata = { section: ['intro'] };

    const chunkId = insertChunk(entity.id, 0, content, metadata);
    const db = initDatabase();
    const row = db
      .prepare(
        'SELECT name, content_text, source_table, source_id FROM search_index WHERE source_table = ? AND source_id = ?',
      )
      .get('chunks', chunkId);

    expect(row).toBeTruthy();
    expect(row).toMatchObject({
      name: 'intro',
      content_text: content,
      source_table: 'chunks',
      source_id: Number(chunkId),
    });
  });

  it('chunk content is searchable via FTS5 MATCH', () => {
    const entity = createEntity({ name: 'FTS Doc', type: 'document' });
    const content = 'supercalifragilistic quantum mechanics';
    const chunkId = insertChunk(entity.id, 0, content, { section: ['search'] });

    const results = search('supercalifragilistic', { source_table: 'chunks' });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      source_table: 'chunks',
      source_id: Number(chunkId),
    });
  });

  it('deleteChunksForEntity removes search_index entries', () => {
    const entity = createEntity({ name: 'Delete Doc', type: 'document' });
    const chunkIdA = insertChunk(entity.id, 0, 'first delete target', { section: ['delete'] });
    const chunkIdB = insertChunk(entity.id, 1, 'second delete target', { section: ['delete'] });
    const db = initDatabase();

    const beforeCount = db
      .prepare(
        'SELECT COUNT(*) AS count FROM search_index WHERE source_table = ? AND source_id IN (?, ?)',
      )
      .get('chunks', chunkIdA, chunkIdB).count;

    expect(beforeCount).toBe(2);

    const deleted = deleteChunksForEntity(entity.id);
    expect(deleted).toBe(2);

    const afterCount = db
      .prepare(
        'SELECT COUNT(*) AS count FROM search_index WHERE source_table = ? AND source_id IN (?, ?)',
      )
      .get('chunks', chunkIdA, chunkIdB).count;

    expect(afterCount).toBe(0);
  });

  it("unique phrase in chunk returns chunk's source_id", () => {
    const entity = createEntity({ name: 'Unique Doc', type: 'document' });
    const content = 'zebraquark singularity beacon';
    const chunkId = insertChunk(entity.id, 0, content, { section: ['unique'] });

    const results = search('zebraquark', { source_table: 'chunks' });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      source_table: 'chunks',
      source_id: Number(chunkId),
    });
  });
});

describe('Chunk Embeddings', () => {
  it('upsertChunkEmbedding accepts 768-dim Float32Array', () => {
    const entity = createEntity({ name: 'Test Doc', type: 'document' });
    const chunkId = insertChunk(entity.id, 0, 'content');
    const vector = new Float32Array(CHUNK_EMBEDDING_DIMENSIONS).fill(0.25);

    expect(() => upsertChunkEmbedding(chunkId, vector)).not.toThrow();
  });

  it('upsertChunkEmbedding throws for wrong dimensions', () => {
    const entity = createEntity({ name: 'Test Doc', type: 'document' });
    const chunkId = insertChunk(entity.id, 0, 'content');
    const vector = new Float32Array(384).fill(0.1);

    expect(() => upsertChunkEmbedding(chunkId, vector)).toThrow();
  });

  it('findNearestChunks returns results sorted by distance and respects k', () => {
    const entity = createEntity({ name: 'Test Doc', type: 'document' });
    const chunkIds = [
      insertChunk(entity.id, 0, 'first'),
      insertChunk(entity.id, 1, 'second'),
      insertChunk(entity.id, 2, 'third'),
    ];
    const query = new Float32Array(CHUNK_EMBEDDING_DIMENSIONS).fill(0);

    const vectors = [
      new Float32Array(CHUNK_EMBEDDING_DIMENSIONS).fill(0.1),
      new Float32Array(CHUNK_EMBEDDING_DIMENSIONS).fill(0.2),
      new Float32Array(CHUNK_EMBEDDING_DIMENSIONS).fill(0.3),
    ];

    chunkIds.forEach((chunkId, index) => {
      upsertChunkEmbedding(chunkId, vectors[index]);
    });

    const results = findNearestChunks(query, 2);
    expect(results).toHaveLength(2);
    const distances = results.map((result) => Number(result.distance));
    expect(distances[0]).toBeLessThanOrEqual(distances[1]);
  });

  it('findNearestChunks throws for wrong query dimensions', () => {
    const query = new Float32Array(384).fill(0.2);
    expect(() => findNearestChunks(query, 2)).toThrow();
  });
});

describe('getChunkWithEntity', () => {
  it('getChunkWithEntity returns chunk and entity with parsed metadata', () => {
    const entity = createEntity({
      name: 'Test Doc',
      type: 'document',
      metadata: { source: 'unit-test' },
    });
    const chunkMetadata = { section: 'summary' };
    const chunkId = insertChunk(entity.id, 0, 'content', chunkMetadata);

    const result = getChunkWithEntity(chunkId);

    expect(result).not.toBeNull();
    expect(result.chunk).toMatchObject({
      id: Number(chunkId),
      entity_id: entity.id,
      chunk_index: 0,
      content: 'content',
      metadata: chunkMetadata,
    });
    expect(result.entity).toMatchObject({
      id: entity.id,
      name: 'Test Doc',
      type: 'document',
      metadata: { source: 'unit-test' },
    });
  });

  it('getChunkWithEntity returns null for nonexistent chunk', () => {
    expect(getChunkWithEntity(999999)).toBeNull();
  });
});
