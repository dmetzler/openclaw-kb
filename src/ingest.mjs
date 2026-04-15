import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { fetchUrl } from './fetcher.mjs';
import { extract } from './extractor.mjs';
import { chunkMarkdown } from './chunker.mjs';
import { embedBatch } from './embedder.mjs';
import { createLLMProvider } from './llm-provider.mjs';
import {
  rawFileName as generateRawFileName,
  createPage,
  updatePage,
  findPage,
  regenerateIndex,
  appendLog,
} from './wiki.mjs';
import {
  initDatabase,
  closeDatabase,
  createRelation,
  insertChunk,
  deleteChunksForEntity,
  upsertChunkEmbedding,
} from './db.mjs';

/** gray-matter options with JSON_SCHEMA engine for date safety. */
const MATTER_OPTIONS = {
  engines: {
    yaml: {
      parse: (str) => yaml.load(str, { schema: yaml.JSON_SCHEMA }),
      stringify: (obj) => yaml.dump(obj, { lineWidth: -1, schema: yaml.JSON_SCHEMA }),
    },
  },
};

/**
 * Archives raw source content to the raw/ directory.
 *
 * @param {Object} params
 * @param {string} params.title - Source document title.
 * @param {string} params.content - Markdown content.
 * @param {string} params.source - URL or "manual".
 * @param {string|null} [params.author] - Author name.
 * @param {string[]} [params.tags] - Classification tags.
 * @param {Object} [options]
 * @param {string} [options.rawDir='raw'] - Raw directory path.
 * @returns {{ fileName: string, filePath: string }}
 */
function archiveRawSource({ title, content, source, author, tags = [] }, options = {}) {
  const rawDir = options.rawDir || 'raw';
  mkdirSync(rawDir, { recursive: true });

  const now = new Date();
  const fileName = generateRawFileName(title, now, { rawDir });

  const frontmatter = {
    title,
    source,
    date: now.toISOString(),
    tags,
  };

  if (author) {
    frontmatter.author = author;
  }

  const body = `\n${content}\n`;
  const output = matter.stringify(body, frontmatter, MATTER_OPTIONS);
  const filePath = join(rawDir, fileName);
  writeFileSync(filePath, output, 'utf8');

  return { fileName, filePath };
}

/**
 * Fetches a URL, archives the raw content, extracts entities/concepts via LLM,
 * creates/updates wiki pages and KG entities, regenerates the index, and appends to the log.
 *
 * @param {string} url - URL to fetch and ingest. Must be a valid HTTP/HTTPS URL.
 * @param {import('./extractor.mjs').LLMProvider} [llm] - Provider-agnostic LLM interface. Auto-detected if omitted.
 * @param {Object} [options]
 * @param {string} [options.wikiDir='wiki'] - Root directory for wiki pages.
 * @param {string} [options.rawDir='raw'] - Root directory for raw source files.
 * @param {number} [options.fetchTimeout=15000] - URL fetch timeout in milliseconds.
 * @returns {Promise<{ ok: boolean, rawFile: string, pagesCreated: string[], pagesUpdated: string[], pagesFailed: { name: string, error: string }[], entitiesCreated: number, relationsCreated: number, chunks: { total: number, embedded: number } }>}
 * @throws {Error} If URL is invalid or fetch fails.
 */
export async function ingestUrl(url, llm, options = {}) {
  if (llm && typeof llm !== 'object') {
    // Shift: ingestUrl(url, options) — llm omitted
    options = llm;
    llm = undefined;
  }
  if (!llm || typeof llm.complete !== 'function') {
    llm = await createLLMProvider();
  }
  const wikiDir = options.wikiDir || 'wiki';
  const rawDir = options.rawDir || 'raw';
  const fetchTimeout = options.fetchTimeout || 15000;

  // Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Ensure directories exist
  _ensureWikiDirs(wikiDir);
  mkdirSync(rawDir, { recursive: true });

  // Fetch content — on failure, halt entirely (FR-015)
  const fetchResult = await fetchUrl(url, { timeout: fetchTimeout });
  const content = fetchResult.content ?? '';
  const contentWasEmpty = content.trim().length === 0;

  // Archive raw source (T016)
  const rawSource = archiveRawSource({
    title: fetchResult.title,
    content,
    source: url,
    author: fetchResult.author,
    tags: [],
  }, { rawDir });


  // Extract entities via LLM
  let extraction;
  try {
    extraction = contentWasEmpty
      ? { entities: [], relations: [], topics: [], summary: '' }
      : await extract(content, llm);
  } catch (error) {
    // LLM failure — raw file is archived, log the failure (FR-018)
    appendLog({
      timestamp: new Date().toISOString(),
      sourceType: 'url',
      source: url,
      rawFile: rawSource.fileName,
      pagesCreated: [],
      pagesUpdated: [],
      note: `Extraction failed: ${error.message}`,
    }, { wikiDir });

    return {
      ok: true,
      rawFile: rawSource.fileName,
      pagesCreated: [],
      pagesUpdated: [],
      pagesFailed: [],
      entitiesCreated: 0,
      relationsCreated: 0,
      chunks: { total: 0, embedded: 0 },
    };
  }

  // Process extracted entities — create or update wiki pages
  const pagesCreated = [];
  const pagesUpdated = [];
  const pagesFailed = [];
  let entitiesCreated = 0;
  let relationsCreated = 0;

  // Map entity name → kgId for relation creation
  const entityKgMap = new Map();

  for (const entity of extraction.entities) {
    try {
      const existing = findPage(entity.name, { wikiDir });
      if (existing) {
        const result = updatePage(existing.fileName, entity, rawSource.fileName, { wikiDir });
        pagesUpdated.push(result.fileName);
        entityKgMap.set(entity.name.toLowerCase(), result.kgId);
      } else {
        const result = createPage(entity, rawSource.fileName, { wikiDir });
        pagesCreated.push(result.fileName);
        entitiesCreated++;
        entityKgMap.set(entity.name.toLowerCase(), result.kgId);
      }
    } catch (error) {
      pagesFailed.push({ name: entity.name, error: error.message });
    }
  }

  // Create KG relations
  for (const relation of extraction.relations) {
    const sourceId = entityKgMap.get(relation.source.toLowerCase());
    const targetId = entityKgMap.get(relation.target.toLowerCase());
    if (sourceId && targetId && sourceId !== targetId) {
      try {
        createRelation({
          source_id: sourceId,
          target_id: targetId,
          type: relation.predicate,
        });
        relationsCreated++;
      } catch {
        // Duplicate or invalid relation — skip silently
      }
    }
  }

  let totalChunks = 0;
  let embeddedChunks = 0;
  const chunksToEmbed = [];
  const entityKgIds = [...entityKgMap.values()];
  const chunks = chunkMarkdown(content, { source: url });

  for (const kgId of entityKgIds) {
    deleteChunksForEntity(kgId);

    chunks.forEach((chunk, index) => {
      const chunkId = insertChunk(kgId, index, chunk.text, chunk.metadata);
      totalChunks += 1;
      chunksToEmbed.push({ chunkId, text: chunk.text });
    });
  }

  if (chunksToEmbed.length > 0) {
    let embeddings = [];
    try {
      embeddings = await embedBatch(chunksToEmbed.map((chunk) => chunk.text));
    } catch {
      embeddings = chunksToEmbed.map(() => null);
    }

    embeddings.forEach((embedding, index) => {
      if (!embedding) {
        return;
      }
      upsertChunkEmbedding(chunksToEmbed[index].chunkId, embedding);
      embeddedChunks += 1;
    });
  }

  // Regenerate index
  regenerateIndex({ wikiDir });

  // Append log
  appendLog({
    timestamp: new Date().toISOString(),
    sourceType: 'url',
    source: url,
    rawFile: rawSource.fileName,
    pagesCreated,
    pagesUpdated,
    pagesFailed: pagesFailed.length > 0 ? pagesFailed : undefined,
    note: contentWasEmpty
      ? 'Empty document; no entities extracted'
      : extraction.entities.length === 0
        ? 'No entities extracted'
        : undefined,
  }, { wikiDir });

  return {
    ok: true,
    rawFile: rawSource.fileName,
    pagesCreated,
    pagesUpdated,
    pagesFailed,
    entitiesCreated,
    relationsCreated,
    chunks: { total: totalChunks, embedded: embeddedChunks },
  };
}

/**
 * Archives raw text, extracts entities/concepts via LLM, creates/updates wiki pages
 * and KG entities, regenerates the index, and appends to the log.
 *
 * @param {string} title - Title for the raw source file. Non-empty.
 * @param {string} text - Raw text content to ingest. Non-empty.
 * @param {import('./extractor.mjs').LLMProvider} [llm] - Provider-agnostic LLM interface. Auto-detected if omitted.
 * @param {Object} [options]
 * @param {string} [options.wikiDir='wiki'] - Root directory for wiki pages.
 * @param {string} [options.rawDir='raw'] - Root directory for raw source files.
 * @returns {Promise<{ ok: boolean, rawFile: string, pagesCreated: string[], pagesUpdated: string[], pagesFailed: { name: string, error: string }[], entitiesCreated: number, relationsCreated: number, chunks: { total: number, embedded: number } }>}
 * @throws {Error} If title or text is empty.
 */
export async function ingestText(title, text, llm, options = {}) {
  if (llm && typeof llm !== 'object') {
    options = llm;
    llm = undefined;
  }
  if (!llm || typeof llm.complete !== 'function') {
    llm = await createLLMProvider();
  }
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('Title must be a non-empty string');
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text must be a non-empty string');
  }

  const wikiDir = options.wikiDir || 'wiki';
  const rawDir = options.rawDir || 'raw';

  // Ensure directories exist
  _ensureWikiDirs(wikiDir);
  mkdirSync(rawDir, { recursive: true });

  // Archive raw source with source: "manual"
  const rawSource = archiveRawSource({
    title,
    content: text,
    source: 'manual',
    tags: [],
  }, { rawDir });

  // Extract entities via LLM
  let extraction;
  try {
    extraction = await extract(text, llm);
  } catch (error) {
    // LLM failure — raw file is archived, log the failure (FR-018)
    appendLog({
      timestamp: new Date().toISOString(),
      sourceType: 'text',
      source: title,
      rawFile: rawSource.fileName,
      pagesCreated: [],
      pagesUpdated: [],
      note: `Extraction failed: ${error.message}`,
    }, { wikiDir });

    return {
      ok: true,
      rawFile: rawSource.fileName,
      pagesCreated: [],
      pagesUpdated: [],
      pagesFailed: [],
      entitiesCreated: 0,
      relationsCreated: 0,
    };
  }

  // Process extracted entities
  const pagesCreated = [];
  const pagesUpdated = [];
  const pagesFailed = [];
  let entitiesCreated = 0;
  let relationsCreated = 0;
  const entityKgMap = new Map();

  for (const entity of extraction.entities) {
    try {
      const existing = findPage(entity.name, { wikiDir });
      if (existing) {
        const result = updatePage(existing.fileName, entity, rawSource.fileName, { wikiDir });
        pagesUpdated.push(result.fileName);
        entityKgMap.set(entity.name.toLowerCase(), result.kgId);
      } else {
        const result = createPage(entity, rawSource.fileName, { wikiDir });
        pagesCreated.push(result.fileName);
        entitiesCreated++;
        entityKgMap.set(entity.name.toLowerCase(), result.kgId);
      }
    } catch (error) {
      pagesFailed.push({ name: entity.name, error: error.message });
    }
  }

  // Create KG relations
  for (const relation of extraction.relations) {
    const sourceId = entityKgMap.get(relation.source.toLowerCase());
    const targetId = entityKgMap.get(relation.target.toLowerCase());
    if (sourceId && targetId && sourceId !== targetId) {
      try {
        createRelation({
          source_id: sourceId,
          target_id: targetId,
          type: relation.predicate,
        });
        relationsCreated++;
      } catch {
        // Duplicate or invalid relation — skip silently
      }
    }
  }

  let totalChunks = 0;
  let embeddedChunks = 0;
  const chunksToEmbed = [];
  const entityKgIds = [...entityKgMap.values()];
  const chunks = chunkMarkdown(text, { source: 'manual' });

  for (const kgId of entityKgIds) {
    deleteChunksForEntity(kgId);

    chunks.forEach((chunk, index) => {
      const chunkId = insertChunk(kgId, index, chunk.text, chunk.metadata);
      totalChunks += 1;
      chunksToEmbed.push({ chunkId, text: chunk.text });
    });
  }

  if (chunksToEmbed.length > 0) {
    let embeddings = [];
    try {
      embeddings = await embedBatch(chunksToEmbed.map((chunk) => chunk.text));
    } catch {
      embeddings = chunksToEmbed.map(() => null);
    }

    embeddings.forEach((embedding, index) => {
      if (!embedding) {
        return;
      }
      upsertChunkEmbedding(chunksToEmbed[index].chunkId, embedding);
      embeddedChunks += 1;
    });
  }

  // Regenerate index
  regenerateIndex({ wikiDir });

  // Append log
  appendLog({
    timestamp: new Date().toISOString(),
    sourceType: 'text',
    source: title,
    rawFile: rawSource.fileName,
    pagesCreated,
    pagesUpdated,
    pagesFailed: pagesFailed.length > 0 ? pagesFailed : undefined,
    note: extraction.entities.length === 0 ? 'No entities extracted' : undefined,
  }, { wikiDir });

  return {
    ok: true,
    rawFile: rawSource.fileName,
    pagesCreated,
    pagesUpdated,
    pagesFailed,
    entitiesCreated,
    relationsCreated,
    chunks: { total: totalChunks, embedded: embeddedChunks },
  };
}

/**
 * Ensures all wiki subdirectories exist.
 * @param {string} wikiDir
 */
function _ensureWikiDirs(wikiDir) {
  for (const subDir of ['entities', 'concepts', 'topics', 'comparisons', 'sources']) {
    mkdirSync(join(wikiDir, subDir), { recursive: true });
  }
}

// ---- CLI entry point ----

/**
 * Parses CLI arguments for the ingest command.
 * @param {string[]} argv
 * @returns {{ url?: string, file?: string, db?: string, verbose?: boolean }}
 */
export function parseArgs(argv) {
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--url') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('Missing value for --url');
      }
      options.url = value;
      i += 1;
    } else if (arg === '--file') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('Missing value for --file');
      }
      options.file = value;
      i += 1;
    } else if (arg === '--db') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('Missing value for --db');
      }
      options.db = value;
      i += 1;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg.startsWith('http://') || arg.startsWith('https://')) {
      // Bare URL without --url flag
      options.url = arg;
    } else if (existsSync(arg)) {
      // Bare file path without --file flag
      options.file = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    process.stderr.write(
      'Usage: node src/ingest.mjs [--url] <url> [--file <path>] [--db <path>] [--verbose]\n\n'
      + 'Examples:\n'
      + '  node src/ingest.mjs https://example.com/article\n'
      + '  node src/ingest.mjs --url https://example.com/article\n'
      + '  node src/ingest.mjs --file path/to/document.pdf\n'
      + '  node src/ingest.mjs --file doc.pdf --db custom.db --verbose\n',
    );
    process.exit(1);
  }

  let parsed;
  try {
    parsed = parseArgs(args);
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exit(1);
  }

  if (!parsed.url && !parsed.file) {
    process.stderr.write('Error: Provide a URL or --file <path>\n');
    process.exit(1);
  }

  const dbPath = parsed.db || 'jarvis.db';
  const verbose = parsed.verbose === true;

  const log = (msg) => { if (verbose) console.log(msg); };

  (async () => {
    try {
      initDatabase(dbPath);
      log(`Database: ${dbPath}`);

      const llm = await createLLMProvider();
      log('LLM provider ready');

      if (parsed.url) {
        log(`Ingesting URL: ${parsed.url}`);
        const result = await ingestUrl(parsed.url, llm);
        console.log(
          `Ingested URL: ${parsed.url}\n`
          + `  raw file:  ${result.rawFile}\n`
          + `  pages:     ${result.pagesCreated.length} created, ${result.pagesUpdated.length} updated\n`
          + `  entities:  ${result.entitiesCreated}\n`
          + `  relations: ${result.relationsCreated}\n`
          + `  chunks:    ${result.chunks.total} (${result.chunks.embedded} embedded)`,
        );
      }

      if (parsed.file) {
        const { ingestFile } = await import('./ingest-file.mjs');
        log(`Ingesting file: ${parsed.file}`);
        const result = await ingestFile(parsed.file, llm, { verbose });
        console.log(
          `Ingested file: ${parsed.file}\n`
          + `  format:    ${result.format}\n`
          + `  title:     ${result.title}\n`
          + `  entities:  ${result.entities.length}\n`
          + `  relations: ${result.relations.length}\n`
          + `  chunks:    ${result.chunks.total} (${result.chunks.embedded} embedded)\n`
          + `  pages:     ${result.pages.length}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Ingestion failed: ${message}`);
      process.exitCode = 1;
    } finally {
      closeDatabase();
    }
  })();
}
