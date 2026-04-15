import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'node:http';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  insertChunk,
  upsertChunkEmbedding,
  CHUNK_EMBEDDING_DIMENSIONS,
  upsertEmbedding,
  EMBEDDING_DIMENSIONS,
} from '../../src/db.mjs';
import { searchSemantic } from '../../src/wiki-search.mjs';

function chunkVector(dims = 768) {
  return new Float32Array(Array.from({ length: dims }, () => Math.random()));
}

function unitChunkVector(index, dims = 768) {
  const vec = new Float32Array(dims);
  vec[index] = 1;
  return vec;
}

function unitEntityVector(index, dims = EMBEDDING_DIMENSIONS) {
  const vec = new Float32Array(dims);
  vec[index] = 1;
  return vec;
}

function cosineVector(primary, dims = CHUNK_EMBEDDING_DIMENSIONS) {
  const vec = new Float32Array(dims);
  vec[0] = primary;
  vec[1] = Math.sqrt(1 - primary ** 2);
  return vec;
}

async function withEmbedServer(embedding, run) {
  const server = await new Promise((resolve, reject) => {
    const instance = createServer((req, res) => {
      if (req.method !== 'POST' || req.url !== '/api/embed') {
        res.statusCode = 404;
        res.end();
        return;
      }

      req.on('data', () => undefined);
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ embeddings: [Array.from(embedding)] }));
      });
    });

    instance.on('error', (error) => reject(error));
    instance.listen(11434, () => resolve(instance));
  });

  try {
    return await run();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

beforeEach(() => {
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('chunk-level semantic search', () => {
  it('returns chunk-level results with parent entity context', async () => {
    const entity = createEntity({ name: 'Chunk Entity', type: 'note' });
    const chunkId1 = insertChunk(entity.id, 0, 'Chunk one text', { section: ['Intro'] });
    const chunkId2 = insertChunk(entity.id, 1, 'Chunk two text', { section: ['Body'] });
    const chunkId3 = insertChunk(entity.id, 2, 'Chunk three text', { section: ['Outro'] });

    upsertChunkEmbedding(chunkId1, chunkVector());
    const targetVector = unitChunkVector(3);
    upsertChunkEmbedding(chunkId2, targetVector);
    upsertChunkEmbedding(chunkId3, chunkVector());

    await withEmbedServer(targetVector, async () => {
      const [result] = await searchSemantic('vector-only', { ftsWeight: 0, vectorWeight: 1 });

      expect(result).toBeDefined();
      expect(result.chunk).toMatchObject({
        id: chunkId2,
        text: 'Chunk two text',
        section: ['Body'],
        chunkIndex: 1,
      });
    });
  });

  it('results interleaved by relevance, not grouped by entity', async () => {
    const alpha = createEntity({ name: 'Alpha', type: 'note' });
    const beta = createEntity({ name: 'Beta', type: 'note' });

    const alphaChunk1 = insertChunk(alpha.id, 0, 'Alpha chunk one', { section: ['Alpha'] });
    const betaChunk1 = insertChunk(beta.id, 0, 'Beta chunk one', { section: ['Beta'] });
    const alphaChunk2 = insertChunk(alpha.id, 1, 'Alpha chunk two', { section: ['Alpha'] });
    const betaChunk2 = insertChunk(beta.id, 1, 'Beta chunk two', { section: ['Beta'] });

    const queryVector = unitChunkVector(0);
    upsertChunkEmbedding(alphaChunk1, cosineVector(1));
    upsertChunkEmbedding(betaChunk1, cosineVector(0.8));
    upsertChunkEmbedding(alphaChunk2, cosineVector(0.6));
    upsertChunkEmbedding(betaChunk2, cosineVector(0.4));

    await withEmbedServer(queryVector, async () => {
      const results = await searchSemantic('vector-only', { ftsWeight: 0, vectorWeight: 1 });

      expect(results.length).toBeGreaterThan(1);
      expect(results[0].chunk?.id).toBe(alphaChunk1);
      expect(results[1].chunk?.id).toBe(betaChunk1);
    });
  });

  it('includes type field on results', async () => {
    const entity = createEntity({ name: 'Typed Chunk', type: 'concept' });
    const chunkId = insertChunk(entity.id, 0, 'Typed chunk content', { section: ['Typed'] });
    const queryVector = unitChunkVector(4);
    upsertChunkEmbedding(chunkId, queryVector);

    await withEmbedServer(queryVector, async () => {
      const [result] = await searchSemantic('vector-only', { ftsWeight: 0, vectorWeight: 1 });

      expect(result.type).toBe('concept');
    });
  });

  it('includes source field indicating result origin', async () => {
    const entity = createEntity({ name: 'Source Check', type: 'note' });
    const chunkId = insertChunk(entity.id, 0, 'Source chunk content', { section: ['Source'] });
    const queryVector = unitChunkVector(5);
    upsertChunkEmbedding(chunkId, queryVector);

    await withEmbedServer(queryVector, async () => {
      const [result] = await searchSemantic('vector-only', { ftsWeight: 0, vectorWeight: 1 });

      expect(['vec_chunks', 'fts5', 'combined']).toContain(result.source);
    });
  });

  it('backward compat: explicit queryVector uses 768-dim entity vectors', async () => {
    const entity = createEntity({ name: 'Entity Vector', type: 'note' });
    const chunkId = insertChunk(entity.id, 0, 'Chunk text for entity', { section: ['Entity'] });
    upsertChunkEmbedding(chunkId, unitChunkVector(6));

    const queryVector = unitEntityVector(0);
    upsertEmbedding(entity.id, queryVector);

    const results = await searchSemantic('Entity Vector', { queryVector });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.chunk === null)).toBe(true);
  });

  it('falls back to FTS5 when no queryVector and Ollama unavailable', async () => {
    const entity = createEntity({ name: 'Fts Chunk', type: 'note' });
    insertChunk(entity.id, 0, 'Fts chunk content', { section: ['Fts'] });

    const [result] = await searchSemantic('Fts');

    const combinedMethod = result.metadata?.combined_method;
    expect(result.source === 'fts5' || combinedMethod === 'fts_only').toBe(true);
  });
});
