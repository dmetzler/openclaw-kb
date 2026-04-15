import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { chunkMarkdown } from './chunker.mjs';
import { embedBatch, isOllamaAvailable } from './embedder.mjs';
import {
  closeDatabase,
  getChunks,
  getEntity,
  initDatabase,
  insertChunk,
  upsertChunkEmbedding,
} from './db.mjs';

function collectMarkdownFiles(rootDir) {
  if (!existsSync(rootDir)) {
    throw new Error(`Wiki directory not found: ${rootDir}`);
  }

  const results = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function logVerbose(verbose, message) {
  if (verbose) {
    console.log(message);
  }
}

export function parseArgs(argv) {
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--db') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --db');
      }
      options.dbPath = value;
      i += 1;
    } else if (arg === '--wiki') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --wiki');
      }
      options.wikiDir = value;
      i += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

/**
 * Backfills existing wiki pages with chunk records and embeddings.
 *
 * @param {Object} [options]
 * @param {string} [options.dbPath='./jarvis.db']
 * @param {string} [options.wikiDir='./wiki']
 * @param {boolean} [options.dryRun=false]
 * @param {boolean} [options.verbose=false]
 * @returns {Promise<{ processed: number, skipped: number, failed: number, total: number }>}
 */
export async function backfillWikiPages(options = {}) {
  const dbPath = options.dbPath || './jarvis.db';
  const wikiDir = options.wikiDir || './wiki';
  const dryRun = options.dryRun === true;
  const verbose = options.verbose === true;

  initDatabase(dbPath);

  try {
    const available = await isOllamaAvailable();
    if (!available) {
      throw new Error(
        'Ollama is not available. Backfill requires Ollama for embedding generation. Start Ollama and pull nomic-embed-text model.',
      );
    }

    const files = collectMarkdownFiles(wikiDir);
    const total = files.length;
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    let index = 0;

    for (const filePath of files) {
      index += 1;
      logVerbose(verbose, `Processing ${index}/${total}: ${filePath}`);

      try {
        const raw = readFileSync(filePath, 'utf8');
        const parsed = matter(raw);
        const entityId = Number(parsed.data?.kg_id);

        if (!Number.isFinite(entityId) || entityId <= 0) {
          skipped += 1;
          continue;
        }

        const entity = getEntity(entityId);
        if (!entity) {
          skipped += 1;
          continue;
        }

        const existingChunks = getChunks(entityId);
        if (existingChunks.length > 0) {
          skipped += 1;
          continue;
        }

        if (dryRun) {
          processed += 1;
          continue;
        }

        const chunks = chunkMarkdown(parsed.content, { source: filePath });

        if (chunks.length === 0) {
          skipped += 1;
          continue;
        }

        const chunkIds = [];
        const chunkTexts = [];

        chunks.forEach((chunk, chunkIndex) => {
          const chunkId = insertChunk(entityId, chunkIndex, chunk.text, chunk.metadata);
          chunkIds.push(chunkId);
          chunkTexts.push(chunk.text);
        });

        const embeddings = await embedBatch(chunkTexts);

        embeddings.forEach((embedding, embeddingIndex) => {
          if (!embedding) {
            return;
          }
          upsertChunkEmbedding(chunkIds[embeddingIndex], embedding);
        });

        processed += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to process ${filePath}: ${message}`);
      }
    }

    return { processed, skipped, failed, total };
  } finally {
    closeDatabase();
  }
}

const isCli = Boolean(process.argv[1])
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  const args = process.argv.slice(2);

  backfillWikiPages(parseArgs(args))
    .then((result) => {
      console.log(
        `Backfill complete. processed=${result.processed} skipped=${result.skipped} failed=${result.failed} total=${result.total}`,
      );
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Backfill failed: ${message}`);
      process.exitCode = 1;
    });
}
