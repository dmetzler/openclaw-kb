import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initDatabase, closeDatabase, getChunks } from '../../src/db.mjs';
import { readPage } from '../../src/wiki.mjs';

const { markdownContent, extractionPayload } = vi.hoisted(() => ({
  markdownContent: `# Introduction

This is the introduction paragraph about machine learning and its applications in modern systems. We include enough detail to exceed the minimum token threshold and keep chunk boundaries consistent for testing purposes. The goal is to ensure the introduction section stands alone with clear, self-contained context and enough tokens to avoid merging with later sections.

## Methods

We discuss various methods for training models, including data preprocessing, feature selection, and optimization strategies that help models converge efficiently in practice. Additional detail is provided here to make sure this section stands on its own and meets the minimum token requirement for chunking without merging.

### Deep Learning

Deep learning uses neural networks with many layers to learn hierarchical representations of data. The approach relies on large datasets, strong regularization, and iterative optimization to reach strong performance on complex tasks. We add more descriptive language to ensure the deep learning subsection exceeds the minimum token threshold.

## Results

Our results show significant improvement across benchmarks, with consistent gains in accuracy, robustness, and generalization when compared to traditional baselines. The evaluation confirms the effectiveness of the proposed method and includes enough explanation to stand alone for chunking.
`,
  extractionPayload: {
    entities: [
      {
        name: 'TestEntity',
        type: 'concept',
        description: 'desc',
        attributes: {},
      },
    ],
    relations: [],
    topics: [],
    summary: 'sum',
  },
}));

vi.mock('../../src/fetcher.mjs', () => ({
  fetchUrl: vi.fn(async () => ({
    title: 'Test Page',
    content: markdownContent,
    author: 'Test',
  })),
}));

vi.mock('../../src/extractor.mjs', () => ({
  extract: vi.fn(async () => extractionPayload),
}));

import { ingestUrl } from '../../src/ingest.mjs';

const mockLlm = {
  complete: async () => JSON.stringify(extractionPayload),
};

let wikiDir;
let rawDir;

async function startEmbedServer() {
  const server = await new Promise((resolve, reject) => {
    const instance = createServer((req, res) => {
      if (req.method !== 'POST' || req.url !== '/api/embed') {
        res.statusCode = 404;
        res.end();
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        let count = 1;
        try {
          const parsed = JSON.parse(body);
          if (Array.isArray(parsed?.input)) {
            count = parsed.input.length || 1;
          }
        } catch {
          count = 1;
        }

        const embeddings = Array.from({ length: count }, () => Array(768).fill(0.1));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ embeddings }));
      });
    });

    instance.on('error', (error) => reject(error));
    instance.listen(11434, () => resolve(instance));
  });

  return server;
}

beforeEach(() => {
  initDatabase(':memory:');
  wikiDir = mkdtempSync(join(tmpdir(), 'kb-url-wiki-'));
  rawDir = mkdtempSync(join(tmpdir(), 'kb-url-raw-'));
  vi.clearAllMocks();
});

afterEach(() => {
  closeDatabase();
  rmSync(wikiDir, { recursive: true, force: true });
  rmSync(rawDir, { recursive: true, force: true });
});

describe('ingestUrl chunking', () => {
  it('produces existing outputs plus chunk records and embeddings', async () => {
    const server = await startEmbedServer();

    try {
      const result = await ingestUrl('https://example.com/test', mockLlm, { wikiDir, rawDir });

      expect(result.ok).toBe(true);
      expect(result.rawFile).toBeTruthy();
      expect(existsSync(join(rawDir, result.rawFile))).toBe(true);
      expect(result.pagesCreated.length + result.pagesUpdated.length).toBeGreaterThan(0);
      expect(result.entitiesCreated).toBeGreaterThan(0);
      expect(result.chunks.total).toBeGreaterThan(0);
      expect(result.chunks.embedded).toBeGreaterThan(0);

      const pageFile = result.pagesCreated[0] ?? result.pagesUpdated[0];
      const page = readPage(pageFile, { wikiDir });
      expect(page).not.toBeNull();
      const entityId = page.data.kg_id;
      const chunks = getChunks(entityId);
      expect(chunks.length).toBeGreaterThan(0);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('uses heading-boundary chunking with section metadata', async () => {
    const server = await startEmbedServer();

    try {
      const result = await ingestUrl('https://example.com/sections', mockLlm, { wikiDir, rawDir });
      const pageFile = result.pagesCreated[0] ?? result.pagesUpdated[0];
      const page = readPage(pageFile, { wikiDir });
      const entityId = page.data.kg_id;
      const chunks = getChunks(entityId);

      const sections = chunks.map((chunk) => chunk.metadata.section);
      expect(sections).toEqual(expect.arrayContaining([
        ['Introduction'],
        ['Introduction', 'Methods'],
        ['Introduction', 'Methods', 'Deep Learning'],
        ['Introduction', 'Results'],
      ]));
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('re-ingestion replaces chunks instead of duplicating', async () => {
    const server = await startEmbedServer();

    try {
      const first = await ingestUrl('https://example.com/reingest', mockLlm, { wikiDir, rawDir });
      const firstPage = readPage(first.pagesCreated[0] ?? first.pagesUpdated[0], { wikiDir });
      const entityId = firstPage.data.kg_id;
      const firstChunks = getChunks(entityId);
      const firstIds = new Set(firstChunks.map((chunk) => chunk.id));

      const second = await ingestUrl('https://example.com/reingest', mockLlm, { wikiDir, rawDir });
      expect(second.pagesCreated.length).toBe(0);
      const secondChunks = getChunks(entityId);
      const secondIds = new Set(secondChunks.map((chunk) => chunk.id));

      expect(secondChunks.length).toBe(firstChunks.length);
      const sharedIds = [...secondIds].filter((id) => firstIds.has(id));
      expect(sharedIds.length).toBe(0);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('stores chunks when Ollama is unavailable without embeddings', async () => {
    const result = await ingestUrl('https://example.com/no-ollama', mockLlm, { wikiDir, rawDir });

    expect(result.ok).toBe(true);
    expect(result.chunks.total).toBeGreaterThan(0);
    expect(result.chunks.embedded).toBe(0);

    const pageFile = result.pagesCreated[0] ?? result.pagesUpdated[0];
    const page = readPage(pageFile, { wikiDir });
    const chunks = getChunks(page.data.kg_id);
    expect(chunks.length).toBeGreaterThan(0);
  });
});
