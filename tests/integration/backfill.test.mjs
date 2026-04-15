import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  getChunks,
  insertChunk,
} from '../../src/db.mjs';
import { parseArgs } from '../../src/backfill.mjs';

const OLLAMA_MODEL = 'nomic-embed-text:latest';
const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_URL = `http://${OLLAMA_HOST}:11434`;
const TYPE_TO_DIR = {
  entity: 'entities',
  concept: 'concepts',
  topic: 'topics',
  comparison: 'comparisons',
};

const originalModel = process.env.OLLAMA_MODEL;
const originalUrl = process.env.OLLAMA_URL;

let wikiDir;
let dbDir;
let dbPath;

beforeEach(() => {
  wikiDir = mkdtempSync(join(tmpdir(), 'kb-backfill-wiki-'));
  dbDir = mkdtempSync(join(tmpdir(), 'kb-backfill-db-'));
  dbPath = join(dbDir, 'jarvis.db');
  process.env.OLLAMA_URL = OLLAMA_URL;
});

afterEach(() => {
  closeDatabase();
  rmSync(wikiDir, { recursive: true, force: true });
  rmSync(dbDir, { recursive: true, force: true });

  if (originalModel === undefined) {
    delete process.env.OLLAMA_MODEL;
  } else {
    process.env.OLLAMA_MODEL = originalModel;
  }

  if (originalUrl === undefined) {
    delete process.env.OLLAMA_URL;
  } else {
    process.env.OLLAMA_URL = originalUrl;
  }
});

function longMarkdown(name) {
  const words = Array.from({ length: 140 }, (_, index) => `word${index}`).join(' ');
  return `# ${name}\n\n## Overview\n\n${words}\n\n## Details\n\n${words}\n`;
}

function writeWikiPage({ entityId, name, type }) {
  const dirName = TYPE_TO_DIR[type] ?? 'entities';
  const dirPath = join(wikiDir, dirName);
  mkdirSync(dirPath, { recursive: true });
  const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.md`;
  const filePath = join(dirPath, fileName);
  const frontmatter = `---\n`
    + `title: ${name}\n`
    + `type: ${type}\n`
    + `kg_id: ${entityId}\n`
    + `sources: []\n`
    + `tags: []\n`
    + `---\n`;
  writeFileSync(filePath, `${frontmatter}${longMarkdown(name)}`, 'utf8');
  return filePath;
}

async function loadBackfill() {
  return await vi.importActual('../../src/backfill.mjs');
}

function clearEmbedderCache() {
  vi.resetModules();
}

async function withMockOllama(run) {
  const server = await new Promise((resolve, reject) => {
    const instance = createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/api/tags') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          models: [
            { name: OLLAMA_MODEL },
            { name: 'nomic-embed-text' },
          ],
        }));
        return;
      }

      if (req.method === 'POST' && req.url === '/api/embed') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          let count = 1;
          try {
            const payload = JSON.parse(body || '{}');
            if (Array.isArray(payload.input)) {
              count = payload.input.length;
            }
          } catch {
            count = 1;
          }
          const embeddings = Array.from({ length: count }, () => Array(768).fill(0.1));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ embeddings }));
        });
        return;
      }

      res.statusCode = 404;
      res.end();
    });

    instance.on('error', (error) => reject(error));
    instance.listen(11434, OLLAMA_HOST, () => resolve(instance));
  });

  try {
    return await run();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

describe.sequential('backfillWikiPages', () => {
  it('processes only pages without chunks', async () => {
    initDatabase(dbPath);
    const alpha = createEntity({ name: 'Alpha Concept', type: 'concept' });
    const beta = createEntity({ name: 'Beta Concept', type: 'concept' });
    const gamma = createEntity({ name: 'Gamma Concept', type: 'concept' });
    insertChunk(beta.id, 0, 'Existing chunk content', { source: 'seed' });
    closeDatabase();

    writeWikiPage({ entityId: alpha.id, name: alpha.name, type: alpha.type });
    writeWikiPage({ entityId: beta.id, name: beta.name, type: beta.type });
    writeWikiPage({ entityId: gamma.id, name: gamma.name, type: gamma.type });

    process.env.OLLAMA_MODEL = OLLAMA_MODEL;
    const result = await withMockOllama(async () => {
      clearEmbedderCache();
      const module = await loadBackfill();
      return module.backfillWikiPages({ dbPath, wikiDir, verbose: false });
    });

    expect(result.total).toBe(3);
    expect(result.processed).toBe(2);
    expect(result.skipped).toBe(1);

    initDatabase(dbPath);
    expect(getChunks(alpha.id).length).toBeGreaterThan(0);
    expect(getChunks(gamma.id).length).toBeGreaterThan(0);
    expect(getChunks(beta.id).length).toBe(1);
  });

  it('skips already-chunked pages', async () => {
    initDatabase(dbPath);
    const first = createEntity({ name: 'First Concept', type: 'concept' });
    const second = createEntity({ name: 'Second Concept', type: 'concept' });
    insertChunk(first.id, 0, 'Seed chunk', { source: 'seed' });
    closeDatabase();

    writeWikiPage({ entityId: first.id, name: first.name, type: first.type });
    writeWikiPage({ entityId: second.id, name: second.name, type: second.type });

    process.env.OLLAMA_MODEL = OLLAMA_MODEL;
    const result = await withMockOllama(async () => {
      clearEmbedderCache();
      const module = await loadBackfill();
      return module.backfillWikiPages({ dbPath, wikiDir, verbose: false });
    });

    expect(result.skipped).toBeGreaterThan(0);
    expect(result.processed).toBeGreaterThan(0);

    initDatabase(dbPath);
    expect(getChunks(first.id).length).toBe(1);
    expect(getChunks(second.id).length).toBeGreaterThan(0);
  });

  it('dry-run creates no database changes', async () => {
    initDatabase(dbPath);
    const alpha = createEntity({ name: 'Dry Alpha', type: 'concept' });
    const beta = createEntity({ name: 'Dry Beta', type: 'concept' });
    closeDatabase();

    writeWikiPage({ entityId: alpha.id, name: alpha.name, type: alpha.type });
    writeWikiPage({ entityId: beta.id, name: beta.name, type: beta.type });

    process.env.OLLAMA_MODEL = OLLAMA_MODEL;
    const result = await withMockOllama(async () => {
      clearEmbedderCache();
      const module = await loadBackfill();
      return module.backfillWikiPages({ dbPath, wikiDir, dryRun: true });
    });

    expect(result.processed).toBeGreaterThan(0);
    expect(result.failed).toBe(0);

    initDatabase(dbPath);
    expect(getChunks(alpha.id)).toEqual([]);
    expect(getChunks(beta.id)).toEqual([]);
  });

  it('throws when Ollama is unavailable', async () => {
    initDatabase(dbPath);
    const entity = createEntity({ name: 'Offline Concept', type: 'concept' });
    closeDatabase();
    writeWikiPage({ entityId: entity.id, name: entity.name, type: entity.type });

    process.env.OLLAMA_MODEL = OLLAMA_MODEL;
    clearEmbedderCache();
    const module = await loadBackfill();

    await expect(
      module.backfillWikiPages({ dbPath, wikiDir, verbose: false }),
    ).rejects.toThrow('Ollama is not available');
  });

  it('verbose mode logs progress messages', async () => {
    initDatabase(dbPath);
    const alpha = createEntity({ name: 'Verbose Alpha', type: 'concept' });
    closeDatabase();

    writeWikiPage({ entityId: alpha.id, name: alpha.name, type: alpha.type });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    process.env.OLLAMA_MODEL = OLLAMA_MODEL;
    const result = await withMockOllama(async () => {
      clearEmbedderCache();
      const module = await loadBackfill();
      return module.backfillWikiPages({ dbPath, wikiDir, verbose: true });
    });

    expect(result.processed).toBeGreaterThan(0);
    const progressLogs = logSpy.mock.calls.filter(
      ([msg]) => typeof msg === 'string' && msg.includes('Processing'),
    );
    expect(progressLogs.length).toBeGreaterThan(0);
    logSpy.mockRestore();
  });

  it('handles file processing errors gracefully', async () => {
    initDatabase(dbPath);
    const alpha = createEntity({ name: 'Error Entity', type: 'concept' });
    closeDatabase();

    // Write a wiki page with a kg_id that will exist but cause an internal error
    // by writing invalid frontmatter that gray-matter can still parse but
    // with a kg_id pointing to a nonexistent entity  
    const dirPath = join(wikiDir, 'concepts');
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(
      join(dirPath, 'bad-entity.md'),
      '---\ntitle: Bad\ntype: concept\nkg_id: 999999\n---\n# Bad\n\nContent here.',
      'utf8',
    );
    // Also write a valid page
    writeWikiPage({ entityId: alpha.id, name: alpha.name, type: alpha.type });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    process.env.OLLAMA_MODEL = OLLAMA_MODEL;
    const result = await withMockOllama(async () => {
      clearEmbedderCache();
      const module = await loadBackfill();
      return module.backfillWikiPages({ dbPath, wikiDir, verbose: false });
    });

    // bad-entity has kg_id=999999 which doesn't exist → skipped (entity not found)
    // alpha → processed
    expect(result.total).toBe(2);
    expect(result.processed).toBeGreaterThan(0);
    warnSpy.mockRestore();
  });
});

describe('parseArgs', () => {
  it('parses --db flag', () => {
    expect(parseArgs(['--db', '/path/to/db'])).toEqual({ dbPath: '/path/to/db' });
  });

  it('parses --wiki flag', () => {
    expect(parseArgs(['--wiki', '/path/to/wiki'])).toEqual({ wikiDir: '/path/to/wiki' });
  });

  it('parses --dry-run flag', () => {
    expect(parseArgs(['--dry-run'])).toEqual({ dryRun: true });
  });

  it('parses --verbose flag', () => {
    expect(parseArgs(['--verbose'])).toEqual({ verbose: true });
  });

  it('parses all flags together', () => {
    const result = parseArgs(['--db', 'test.db', '--wiki', 'w', '--dry-run', '--verbose']);
    expect(result).toEqual({ dbPath: 'test.db', wikiDir: 'w', dryRun: true, verbose: true });
  });

  it('throws for missing --db value', () => {
    expect(() => parseArgs(['--db'])).toThrow('Missing value for --db');
  });

  it('throws for missing --wiki value', () => {
    expect(() => parseArgs(['--wiki'])).toThrow('Missing value for --wiki');
  });

  it('throws for unknown argument', () => {
    expect(() => parseArgs(['--unknown'])).toThrow('Unknown argument: --unknown');
  });
});
