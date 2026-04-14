import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  initDatabase,
  closeDatabase,
} from '../../src/db.mjs';
import { ingestUrl } from '../../src/ingest.mjs';
import { ingestText } from '../../src/ingest.mjs';
import { fetchUrl } from '../../src/fetcher.mjs';
import { extract } from '../../src/extractor.mjs';
import { createPage, regenerateIndex, readPage, findPage } from '../../src/wiki.mjs';

const TEST_WIKI_DIR = 'test-wiki-qs';
const TEST_RAW_DIR = 'test-raw-qs';

/** Mock LLM provider that returns a valid extraction result. */
const mockLlm = {
  complete: async (_system, _user) => JSON.stringify({
    entities: [
      {
        name: 'javascript',
        type: 'concept',
        description: 'A high-level, interpreted programming language used primarily for web development.',
        attributes: { paradigm: 'multi-paradigm' },
      },
      {
        name: 'web development',
        type: 'topic',
        description: 'The work involved in developing websites for the Internet.',
        attributes: null,
      },
    ],
    relations: [
      { source: 'javascript', predicate: 'used_in', target: 'web development' },
    ],
    topics: ['javascript', 'programming', 'web'],
    summary: 'An introduction to JavaScript and web development.',
  }),
};

beforeEach(() => {
  initDatabase(':memory:');
  // Clean up test directories
  for (const dir of [TEST_WIKI_DIR, TEST_RAW_DIR]) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true });
    }
  }
});

afterEach(() => {
  closeDatabase();
  for (const dir of [TEST_WIKI_DIR, TEST_RAW_DIR]) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true });
    }
  }
});

describe('Quickstart Validation (T027)', () => {
  it('ingestText creates raw file, wiki pages, index, and log', async () => {
    const result = await ingestText(
      'Meeting Notes: Architecture Review',
      'We discussed migrating from monolith to microservices. JavaScript is a key technology for web development.',
      mockLlm,
      { wikiDir: TEST_WIKI_DIR, rawDir: TEST_RAW_DIR },
    );

    // Verify result shape per contract
    expect(result.ok).toBe(true);
    expect(result.rawFile).toMatch(/\.md$/);
    expect(result.pagesCreated.length).toBe(2);
    expect(result.pagesUpdated).toEqual([]);
    expect(result.pagesFailed).toEqual([]);
    expect(result.entitiesCreated).toBe(2);
    expect(result.relationsCreated).toBe(1);

    // Verify raw file exists
    const rawPath = join(TEST_RAW_DIR, result.rawFile);
    expect(existsSync(rawPath)).toBe(true);
    const rawContent = readFileSync(rawPath, 'utf8');
    expect(rawContent).toContain('source: manual');

    // Verify wiki pages exist
    expect(existsSync(join(TEST_WIKI_DIR, 'concepts', 'javascript.md'))).toBe(true);
    expect(existsSync(join(TEST_WIKI_DIR, 'topics', 'web-development.md'))).toBe(true);

    // Verify index exists and lists pages
    const indexPath = join(TEST_WIKI_DIR, 'index.md');
    expect(existsSync(indexPath)).toBe(true);
    const indexContent = readFileSync(indexPath, 'utf8');
    expect(indexContent).toContain('Auto-generated');
    expect(indexContent).toContain('[[javascript|');
    expect(indexContent).toContain('[[web-development|');

    // Verify log exists
    const logPath = join(TEST_WIKI_DIR, 'log.md');
    expect(existsSync(logPath)).toBe(true);
    const logContent = readFileSync(logPath, 'utf8');
    expect(logContent).toContain('Text Ingestion');
    expect(logContent).toContain('Manual');
  });

  it('createPage creates wiki page with correct frontmatter', () => {
    const entity = {
      name: 'javascript',
      type: 'concept',
      description: 'A programming language for the web.',
      attributes: { paradigm: 'multi-paradigm' },
    };

    const { fileName, filePath, kgId } = createPage(entity, 'raw-file-name.md', {
      wikiDir: TEST_WIKI_DIR,
    });

    expect(fileName).toBe('javascript.md');
    expect(existsSync(filePath)).toBe(true);
    expect(kgId).toBeGreaterThan(0);

    // Verify frontmatter
    const page = readPage('javascript.md', { wikiDir: TEST_WIKI_DIR });
    expect(page).not.toBeNull();
    expect(page.data.id).toBe('javascript');
    expect(page.data.type).toBe('concept');
    expect(page.data.sources).toContain('raw-file-name.md');
    expect(page.data.confidence).toBeCloseTo(0.85);
    expect(page.data.kg_id).toBe(kgId);

    // Verify body is pure Markdown (no HTML)
    expect(page.content).toContain('# Javascript');
    expect(page.content).not.toMatch(/<[^>]+>/);
  });

  it('regenerateIndex produces correct output', () => {
    // Create some pages first
    createPage({ name: 'alpha', type: 'entity', description: 'Alpha entity', attributes: null }, 'raw.md', { wikiDir: TEST_WIKI_DIR });
    createPage({ name: 'beta', type: 'concept', description: 'Beta concept', attributes: null }, 'raw.md', { wikiDir: TEST_WIKI_DIR });

    const { pageCount, filePath } = regenerateIndex({ wikiDir: TEST_WIKI_DIR });

    expect(pageCount).toBe(2);
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, 'utf8');
    expect(content).toContain('## Entities');
    expect(content).toContain('## Concepts');
    expect(content).toContain('## Topics');
    expect(content).toContain('## Comparisons');
    expect(content).toContain('[[alpha|');
    expect(content).toContain('[[beta|');
  });

  it('findPage locates existing page by entity name', () => {
    createPage({ name: 'test entity', type: 'entity', description: 'Test', attributes: null }, 'raw.md', { wikiDir: TEST_WIKI_DIR });

    const found = findPage('test entity', { wikiDir: TEST_WIKI_DIR });
    expect(found).not.toBeNull();
    expect(found.fileName).toBe('test-entity.md');
    expect(found.type).toBe('entity');
  });

  it('findPage returns null for non-existent entity', () => {
    const found = findPage('nonexistent', { wikiDir: TEST_WIKI_DIR });
    expect(found).toBeNull();
  });

  it('extract validates LLM output with zod schema', async () => {
    const result = await extract('Some text about JavaScript and web development.', mockLlm);

    expect(result.entities).toHaveLength(2);
    expect(result.relations).toHaveLength(1);
    expect(result.topics).toBeInstanceOf(Array);
    expect(result.summary).toBeTruthy();
  });

  it('error handling: ingestText rejects empty title', async () => {
    await expect(ingestText('', 'content', mockLlm, {
      wikiDir: TEST_WIKI_DIR,
      rawDir: TEST_RAW_DIR,
    })).rejects.toThrow('Title must be a non-empty string');
  });

  it('error handling: ingestText rejects empty text', async () => {
    await expect(ingestText('title', '', mockLlm, {
      wikiDir: TEST_WIKI_DIR,
      rawDir: TEST_RAW_DIR,
    })).rejects.toThrow('Text must be a non-empty string');
  });

  it('partial failure is reported in result, not thrown', async () => {
    // LLM returns an entity with empty name to trigger a page creation failure
    const badLlm = {
      complete: async () => JSON.stringify({
        entities: [
          { name: 'good-entity', type: 'entity', description: 'Valid', attributes: null },
          { name: '', type: 'entity', description: 'Empty name should fail createPage', attributes: null },
        ],
        relations: [],
        topics: [],
        summary: 'Test',
      }),
    };

    const result = await ingestText('Test', 'Some content', badLlm, {
      wikiDir: TEST_WIKI_DIR,
      rawDir: TEST_RAW_DIR,
    });

    expect(result.ok).toBe(true);
    expect(result.pagesCreated.length).toBe(1);
    expect(result.pagesFailed.length).toBe(1);
    expect(result.pagesFailed[0].name).toBe('');
  });
});
