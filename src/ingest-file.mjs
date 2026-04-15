import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import matter from 'gray-matter';
// @ts-ignore -- js-yaml types not installed in this project.
import yaml from 'js-yaml';
import { convertDocument, detectFormat } from './converter.mjs';
import { chunkMarkdown } from './chunker.mjs';
import { embedBatch } from './embedder.mjs';
import {
  insertChunk,
  deleteChunksForEntity,
  upsertChunkEmbedding,
  getEntity,
  createRelation,
} from './db.mjs';
import { extract } from './extractor.mjs';
import {
  rawFileName,
  createPage,
  updatePage,
  findPage,
  regenerateIndex,
  appendLog,
} from './wiki.mjs';

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
 * @param {string} params.source - File path.
 * @param {Object} [options]
 * @param {string} [options.rawDir='raw'] - Raw directory path.
 * @returns {{ fileName: string, filePath: string }}
 */
function archiveRawSource({ title, content, source }, options = {}) {
  const rawDir = options.rawDir || 'raw';
  mkdirSync(rawDir, { recursive: true });

  const now = new Date();
  const fileName = rawFileName(title, now, { rawDir });

  const frontmatter = {
    title,
    source,
    date: now.toISOString(),
  };

  const body = `\n${content}\n`;
  const output = matter.stringify(body, frontmatter, MATTER_OPTIONS);
  const filePath = join(rawDir, fileName);
  writeFileSync(filePath, output, 'utf8');

  return { fileName, filePath };
}

/**
 * Ensures all wiki subdirectories exist.
 * @param {string} wikiDir
 */
function _ensureWikiDirs(wikiDir) {
  for (const subDir of ['entities', 'concepts', 'topics', 'comparisons']) {
    mkdirSync(join(wikiDir, subDir), { recursive: true });
  }
}

function _extractTitle(markdown, filePath) {
  if (typeof markdown === 'string') {
    const headingMatch = markdown.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }
  }

  return basename(filePath, extname(filePath));
}

function _logVerbose(verbose, message) {
  if (verbose) {
    console.log(message);
  }
}

/**
 * Ingests a document file by converting to Markdown, extracting entities,
 * creating wiki/KG records, chunking, and embedding.
 *
 * @param {string} filePath - Absolute or relative path to the file.
 * @param {import('./extractor.mjs').LLMProvider} llm - Provider-agnostic LLM interface.
 * @param {Object} [options]
 * @param {boolean} [options.skipEmbedding=false] - Skip embeddings when true.
 * @param {boolean} [options.verbose=false] - Log progress when true.
 * @param {string} [options.wikiDir='wiki'] - Root directory for wiki pages.
 * @param {string} [options.rawDir='raw'] - Root directory for raw source files.
 * @returns {Promise<{ title: string, source: string, format: string, entities: Array<{ id: number, name: string, type: string }>, relations: Array<{ id: number, source: number, target: number, type: string }>, chunks: { total: number, embedded: number }, pages: string[] }>}
 */
export async function ingestFile(filePath, llm, options = {}) {
  const wikiDir = options.wikiDir || 'wiki';
  const rawDir = options.rawDir || 'raw';
  const skipEmbedding = options.skipEmbedding === true;
  const verbose = options.verbose === true;

  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const format = detectFormat(filePath);

  _ensureWikiDirs(wikiDir);
  mkdirSync(rawDir, { recursive: true });

  _logVerbose(verbose, `Converting ${filePath}...`);
  const conversion = await convertDocument(filePath, options);
  const markdown = conversion.markdown;

  const title = _extractTitle(markdown, filePath);

  _logVerbose(verbose, 'Archiving raw source...');
  const rawSource = archiveRawSource({
    title,
    content: markdown,
    source: filePath,
  }, { rawDir });

  _logVerbose(verbose, 'Extracting entities...');
  let extraction;
  try {
    extraction = await extract(markdown, llm);
  } catch (error) {
    appendLog({
      timestamp: new Date().toISOString(),
      sourceType: 'text',
      source: filePath,
      rawFile: rawSource.fileName,
      pagesCreated: [],
      pagesUpdated: [],
      note: `Extraction failed: ${error.message}`,
    }, { wikiDir });

    return {
      title,
      source: filePath,
      format,
      entities: [],
      relations: [],
      chunks: { total: 0, embedded: 0 },
      pages: [],
    };
  }

  const pagesCreated = [];
  const pagesUpdated = [];
  const pagesFailed = [];
  const entityKgMap = new Map();
  const entities = [];
  const relations = [];
  let entitiesCreated = 0;
  let relationsCreated = 0;

  for (const entity of extraction.entities) {
    try {
      const existing = findPage(entity.name, { wikiDir });
      if (existing) {
        const result = updatePage(existing.fileName, entity, rawSource.fileName, { wikiDir });
        pagesUpdated.push(result.fileName);
        entityKgMap.set(entity.name.toLowerCase(), result.kgId);
        const kgEntity = getEntity(result.kgId);
        if (kgEntity) {
          entities.push({ id: kgEntity.id, name: kgEntity.name, type: kgEntity.type });
        }
      } else {
        const result = createPage(entity, rawSource.fileName, { wikiDir });
        pagesCreated.push(result.fileName);
        entitiesCreated++;
        entityKgMap.set(entity.name.toLowerCase(), result.kgId);
        const kgEntity = getEntity(result.kgId);
        if (kgEntity) {
          entities.push({ id: kgEntity.id, name: kgEntity.name, type: kgEntity.type });
        }
      }
    } catch (error) {
      pagesFailed.push({ name: entity.name, error: error.message });
    }
  }

  for (const relation of extraction.relations) {
    const sourceId = entityKgMap.get(relation.source.toLowerCase());
    const targetId = entityKgMap.get(relation.target.toLowerCase());
    if (sourceId && targetId && sourceId !== targetId) {
      try {
        const created = createRelation({
          source_id: sourceId,
          target_id: targetId,
          type: relation.predicate,
        });
        relationsCreated++;
        relations.push({
          id: created.id,
          source: created.source_id,
          target: created.target_id,
          type: created.type,
        });
      } catch {
        // Duplicate or invalid relation — skip silently
      }
    }
  }

  regenerateIndex({ wikiDir });

  const pages = [...pagesCreated, ...pagesUpdated];

  _logVerbose(verbose, 'Chunking content...');
  let totalChunks = 0;
  let embeddedChunks = 0;
  const chunksToEmbed = [];

  for (const kgEntity of entities) {
    deleteChunksForEntity(kgEntity.id);

    const chunks = conversion.chunks
      ? conversion.chunks.map((chunk) => ({
        text: chunk.contextualized || chunk.text,
        metadata: {
          headings: chunk.headings,
          source: filePath,
        },
      }))
      : chunkMarkdown(markdown, { source: filePath });

    chunks.forEach((chunk, index) => {
      const chunkId = insertChunk(kgEntity.id, index, chunk.text, chunk.metadata);
      totalChunks += 1;
      chunksToEmbed.push({ chunkId, text: chunk.text });
    });
  }

  if (!skipEmbedding && chunksToEmbed.length > 0) {
    _logVerbose(verbose, `Embedding ${chunksToEmbed.length} chunks...`);
    let embeddings = [];
    try {
      embeddings = await embedBatch(chunksToEmbed.map((chunk) => chunk.text));
    } catch (error) {
      _logVerbose(verbose, `Embedding failed: ${error.message}`);
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

  appendLog({
    timestamp: new Date().toISOString(),
    sourceType: 'text',
    source: filePath,
    rawFile: rawSource.fileName,
    pagesCreated,
    pagesUpdated,
    pagesFailed: pagesFailed.length > 0 ? pagesFailed : undefined,
    note: extraction.entities.length === 0 ? 'No entities extracted' : undefined,
  }, { wikiDir });

  _logVerbose(verbose, 'Ingestion complete.');

  return {
    title,
    source: filePath,
    format,
    entities,
    relations,
    chunks: { total: totalChunks, embedded: embeddedChunks },
    pages,
  };
}
