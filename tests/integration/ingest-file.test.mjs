import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  initDatabase,
  closeDatabase,
  getChunks,
  getEntity,
} from '../../src/db.mjs';
import { ingestFile } from '../../src/ingest-file.mjs';

const extractionPayload = {
  entities: [
    {
      name: 'machine learning',
      type: 'concept',
      description: 'ML overview',
      attributes: { details: 'Details about ML' },
    },
    {
      name: 'neural networks',
      type: 'concept',
      description: 'NN overview',
      attributes: { details: 'Details about NN' },
    },
  ],
  relations: [
    { source: 'machine learning', predicate: 'includes', target: 'neural networks' },
  ],
  topics: ['machine learning', 'neural networks'],
  summary: 'ML overview',
};

const mockLlm = {
  generateContent: async () => ({
    text: () => JSON.stringify({
      entities: [
        { name: 'Machine Learning', type: 'concept', summary: 'ML overview', details: 'Details about ML' },
        { name: 'Neural Networks', type: 'concept', summary: 'NN overview', details: 'Details about NN' },
      ],
      relations: [
        { source: 'Machine Learning', predicate: 'includes', target: 'Neural Networks' },
      ],
    }),
  }),
  complete: async () => JSON.stringify(extractionPayload),
};

let wikiDir;
let rawDir;

beforeEach(() => {
  initDatabase(':memory:');
  wikiDir = mkdtempSync(join(tmpdir(), 'kb-ingest-wiki-'));
  rawDir = mkdtempSync(join(tmpdir(), 'kb-ingest-raw-'));
});

afterEach(() => {
  closeDatabase();
  rmSync(wikiDir, { recursive: true, force: true });
  rmSync(rawDir, { recursive: true, force: true });
});

describe('ingestFile', () => {
  it('ingests sample.md and creates entities, chunks, wiki pages', async () => {
    const fixtureContent = readFileSync('tests/fixtures/sample.md', 'utf8');
    expect(fixtureContent.length).toBeGreaterThan(0);

    const result = await ingestFile('tests/fixtures/sample.md', mockLlm, {
      wikiDir,
      rawDir,
      skipEmbedding: true,
    });

    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.chunks.total).toBeGreaterThan(0);
    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.format).toBe('markdown');
  });

  it('creates chunk records in database', async () => {
    const result = await ingestFile('tests/fixtures/sample.md', mockLlm, {
      wikiDir,
      rawDir,
      skipEmbedding: true,
    });

    for (const entity of result.entities) {
      const stored = getEntity(entity.id);
      expect(stored).not.toBeNull();

      const chunks = getChunks(entity.id);
      expect(chunks.length).toBeGreaterThan(0);
      const indices = chunks.map((chunk) => chunk.chunk_index);
      const expected = Array.from({ length: chunks.length }, (_, index) => index);
      expect(indices).toEqual(expected);
    }
  });

  it('re-ingestion replaces chunks atomically', async () => {
    const first = await ingestFile('tests/fixtures/sample.md', mockLlm, {
      wikiDir,
      rawDir,
      skipEmbedding: true,
    });

    const initialCounts = new Map(
      first.entities.map((entity) => [entity.id, getChunks(entity.id).length]),
    );

    const second = await ingestFile('tests/fixtures/sample.md', mockLlm, {
      wikiDir,
      rawDir,
      skipEmbedding: true,
    });

    for (const entity of second.entities) {
      expect(getChunks(entity.id).length).toBe(initialCounts.get(entity.id));
    }
  });

  it('skipEmbedding option skips embeddings', async () => {
    const result = await ingestFile('tests/fixtures/sample.md', mockLlm, {
      wikiDir,
      rawDir,
      skipEmbedding: true,
    });

    expect(result.chunks.embedded).toBe(0);
  });

  it('throws on file not found', async () => {
    await expect(
      ingestFile('nonexistent.pdf', mockLlm, { wikiDir, rawDir, skipEmbedding: true }),
    ).rejects.toThrow('File not found');
  });

  it('throws on unsupported format', async () => {
    const unsupportedPath = join(rawDir, 'unsupported.xyz');
    writeFileSync(unsupportedPath, 'unsupported');

    await expect(
      ingestFile(unsupportedPath, mockLlm, { wikiDir, rawDir, skipEmbedding: true }),
    ).rejects.toThrow('Unsupported file format');
  });

  it('handles extraction failure gracefully', async () => {
    const failingLlm = {
      complete: async () => {
        throw new Error('LLM unavailable');
      },
    };

    const result = await ingestFile('tests/fixtures/sample.md', failingLlm, {
      wikiDir,
      rawDir,
      skipEmbedding: true,
    });

    expect(result.entities).toEqual([]);
    expect(result.pages).toEqual([]);
  });

  it('handles empty markdown without errors', async () => {
    const emptyPath = join(rawDir, 'empty.md');
    writeFileSync(emptyPath, '   ');

    const result = await ingestFile(emptyPath, mockLlm, {
      wikiDir,
      rawDir,
      skipEmbedding: true,
    });

    expect(result.entities).toEqual([]);
    expect(result.pages).toEqual([]);
    expect(result.chunks).toEqual({ total: 0, embedded: 0 });
  });
});
