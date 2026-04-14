import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import {
  createEntity,
  updateEntity,
} from './db.mjs';

/** Wiki subdirectory types. */
const WIKI_TYPES = ['entities', 'concepts', 'topics', 'comparisons'];

/** Map entity type → subdirectory name. */
const TYPE_TO_DIR = {
  entity: 'entities',
  concept: 'concepts',
  topic: 'topics',
  comparison: 'comparisons',
};

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
 * Converts an entity/concept name to a file-system-safe slug.
 *
 * Lowercase, spaces to hyphens, strip non-alphanumeric (except hyphens),
 * collapse consecutive hyphens, trim leading/trailing hyphens.
 * If >80 chars, truncate to 73 + '-' + 6-char MD5 hash.
 *
 * @param {string} name - Entity or concept name.
 * @returns {string} Slugified name.
 */
export function slugify(name) {
  let slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (slug.length > 80) {
    const hash = createHash('md5').update(name).digest('hex').slice(0, 6);
    slug = slug.slice(0, 73) + '-' + hash;
  }

  return slug;
}

/**
 * Generates a raw source file name in YYYY-MM-DD-slugified-title.md format.
 * Appends numeric suffix for same-day duplicates.
 *
 * @param {string} title - Source document title.
 * @param {Date} [date=new Date()] - Date for the file name.
 * @param {Object} [options]
 * @param {string} [options.rawDir='raw'] - Raw directory path.
 * @returns {string} File name (not full path).
 */
export function rawFileName(title, date = new Date(), options = {}) {
  const rawDir = options.rawDir || 'raw';
  const dateStr = date.toISOString().slice(0, 10);
  const slug = slugify(title);
  let name = `${dateStr}-${slug}.md`;

  let counter = 2;
  while (existsSync(join(rawDir, name))) {
    name = `${dateStr}-${slug}-${counter}.md`;
    counter++;
  }

  return name;
}

/**
 * Creates a new wiki page Markdown file with YAML frontmatter and body content.
 * Also creates a corresponding KG entity in SQLite via db.mjs.
 *
 * @param {import('./extractor.mjs').ExtractedEntity} entity - Entity data from LLM extraction.
 * @param {string} rawFile - Name of the raw source file (without path).
 * @param {Object} [options]
 * @param {string} [options.wikiDir='wiki'] - Root directory for wiki pages.
 * @returns {{ fileName: string, filePath: string, kgId: number }}
 * @throws {Error} If entity.name is empty or entity.type is invalid.
 */
export function createPage(entity, rawFile, options = {}) {
  const wikiDir = options.wikiDir || 'wiki';

  if (!entity.name || typeof entity.name !== 'string' || entity.name.trim().length === 0) {
    throw new Error('Entity name must be a non-empty string');
  }

  const validTypes = ['entity', 'concept', 'topic', 'comparison'];
  if (!validTypes.includes(entity.type)) {
    throw new Error(`Invalid entity type: ${entity.type}`);
  }

  const subDir = TYPE_TO_DIR[entity.type];
  const dirPath = join(wikiDir, subDir);
  mkdirSync(dirPath, { recursive: true });

  let slug = slugify(entity.name);
  let fileName = `${slug}.md`;

  // Check all wiki subdirectories for collision (FR-006)
  const collision = _findFileAcrossWiki(fileName, wikiDir);
  if (collision) {
    // Disambiguate with type suffix
    fileName = `${slug}-${entity.type}.md`;
  }

  const now = new Date().toISOString();

  // Create KG entity via db.mjs
  const kgEntity = createEntity({
    name: entity.name,
    type: entity.type,
    metadata: entity.attributes || {},
  });

  // Build related wikilinks from entity attributes if available
  const related = [];

  const frontmatter = {
    id: fileName.replace(/\.md$/, ''),
    type: entity.type,
    created: now,
    updated: now,
    sources: [rawFile],
    confidence: 0.85,
    related,
    kg_id: kgEntity.id,
  };

  // Build body — pure Markdown, no HTML (FR-005)
  let body = `\n# ${_titleCase(entity.name)}\n\n`;
  if (entity.description) {
    body += `${_stripHtml(entity.description)}\n`;
  }

  const filePath = join(dirPath, fileName);
  const output = matter.stringify(body, frontmatter, MATTER_OPTIONS);
  writeFileSync(filePath, output, 'utf8');

  return { fileName, filePath, kgId: kgEntity.id };
}

/**
 * Merges new information into an existing wiki page. Updates frontmatter
 * (updated, sources, confidence, related) and appends new content to the body.
 *
 * @param {string} fileName - Existing page file name (without path).
 * @param {import('./extractor.mjs').ExtractedEntity} newEntity - New entity data to merge.
 * @param {string} rawFile - Name of the new raw source file.
 * @param {Object} [options]
 * @param {string} [options.wikiDir='wiki'] - Root directory for wiki pages.
 * @returns {{ fileName: string, filePath: string, kgId: number }}
 * @throws {Error} If page not found.
 */
export function updatePage(fileName, newEntity, rawFile, options = {}) {
  const wikiDir = options.wikiDir || 'wiki';

  const found = _findFileAcrossWiki(fileName, wikiDir);
  if (!found) {
    throw new Error(`Page not found: ${fileName}`);
  }

  const raw = readFileSync(found.filePath, 'utf8');
  const file = matter(raw, MATTER_OPTIONS);

  // Update frontmatter
  file.data.updated = new Date().toISOString();

  // Extend sources (union)
  if (!file.data.sources.includes(rawFile)) {
    file.data.sources.push(rawFile);
  }

  // Update confidence (weighted average)
  const oldConfidence = file.data.confidence || 0.85;
  const sourceCount = file.data.sources.length;
  file.data.confidence = Math.round(
    ((oldConfidence * (sourceCount - 1) + 0.85) / sourceCount) * 100
  ) / 100;

  // Append new content (append-with-dedup per R5)
  let existingContent = file.content;
  if (newEntity.description) {
    const cleanDesc = _stripHtml(newEntity.description);
    const newSection = `\n## Update from ${rawFile}\n\n${cleanDesc}\n`;
    // Simple dedup: don't append if the description already exists in the body
    if (!existingContent.includes(cleanDesc)) {
      existingContent += newSection;
    }
  }

  // Update KG entity
  if (file.data.kg_id) {
    try {
      updateEntity(file.data.kg_id, {
        name: newEntity.name,
        type: newEntity.type,
        metadata: newEntity.attributes || {},
      });
    } catch {
      // Entity may not exist if DB was reset — continue gracefully
    }
  }

  const output = matter.stringify(existingContent, file.data, MATTER_OPTIONS);
  writeFileSync(found.filePath, output, 'utf8');

  return { fileName, filePath: found.filePath, kgId: file.data.kg_id };
}

/**
 * Reads and parses a wiki page, returning its frontmatter and body separately.
 *
 * @param {string} fileName - Page file name (without path, with .md).
 * @param {Object} [options]
 * @param {string} [options.wikiDir='wiki'] - Root directory for wiki pages.
 * @returns {{ data: Object, content: string, filePath: string } | null}
 */
export function readPage(fileName, options = {}) {
  const wikiDir = options.wikiDir || 'wiki';

  const found = _findFileAcrossWiki(fileName, wikiDir);
  if (!found) {
    return null;
  }

  const raw = readFileSync(found.filePath, 'utf8');
  const file = matter(raw, MATTER_OPTIONS);

  return { data: file.data, content: file.content, filePath: found.filePath };
}

/**
 * Searches all wiki subdirectories for a page matching the given entity name.
 *
 * @param {string} entityName - Entity name to search for.
 * @param {Object} [options]
 * @param {string} [options.wikiDir='wiki'] - Root directory for wiki pages.
 * @returns {{ fileName: string, filePath: string, type: string } | null}
 */
export function findPage(entityName, options = {}) {
  const wikiDir = options.wikiDir || 'wiki';
  const slug = slugify(entityName);
  const fileName = `${slug}.md`;

  const found = _findFileAcrossWiki(fileName, wikiDir);
  if (found) {
    return found;
  }

  // Also check disambiguated names (with type suffix)
  for (const type of ['entity', 'concept', 'topic', 'comparison']) {
    const disambiguated = `${slug}-${type}.md`;
    const result = _findFileAcrossWiki(disambiguated, wikiDir);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Appends a new operation log entry to wiki/log.md.
 *
 * @param {Object} entry - Operation details.
 * @param {string} entry.timestamp - ISO 8601 timestamp.
 * @param {string} entry.sourceType - "url" or "text".
 * @param {string} entry.source - URL or text title.
 * @param {string} entry.rawFile - Raw file name.
 * @param {string[]} entry.pagesCreated - File names of created pages.
 * @param {string[]} entry.pagesUpdated - File names of updated pages.
 * @param {{ name: string, error: string }[]} [entry.pagesFailed] - Failed pages.
 * @param {string} [entry.note] - Additional note.
 * @param {Object} [options]
 * @param {string} [options.wikiDir='wiki'] - Root directory for wiki pages.
 * @returns {void}
 */
export function appendLog(entry, options = {}) {
  const wikiDir = options.wikiDir || 'wiki';
  mkdirSync(wikiDir, { recursive: true });
  const logPath = join(wikiDir, 'log.md');

  let existing = '';
  if (existsSync(logPath)) {
    existing = readFileSync(logPath, 'utf8');
  } else {
    existing = '# Operation Log\n';
  }

  const sourceLabel = entry.sourceType === 'url' ? 'URL Ingestion' : 'Text Ingestion';
  const sourceValue = entry.sourceType === 'url'
    ? entry.source
    : `Manual — "${entry.source}"`;

  let logEntry = `\n## ${entry.timestamp} — ${sourceLabel}\n\n`;
  logEntry += `**Source**: ${sourceValue}\n`;
  logEntry += `**Raw file**: ${entry.rawFile}\n`;
  logEntry += `**Pages created**: ${entry.pagesCreated.length > 0 ? entry.pagesCreated.map(p => `[[${p.replace(/\.md$/, '')}]]`).join(', ') : '(none)'}\n`;
  logEntry += `**Pages updated**: ${entry.pagesUpdated.length > 0 ? entry.pagesUpdated.map(p => `[[${p.replace(/\.md$/, '')}]]`).join(', ') : '(none)'}\n`;

  if (entry.pagesFailed && entry.pagesFailed.length > 0) {
    logEntry += `**Pages failed**: ${entry.pagesFailed.map(p => `${p.name} (${p.error})`).join(', ')}\n`;
  }

  if (entry.note) {
    logEntry += `**Note**: ${entry.note}\n`;
  }

  logEntry += '\n---\n';

  writeFileSync(logPath, existing + logEntry, 'utf8');
}

/**
 * Scans all wiki subdirectories and regenerates wiki/index.md.
 *
 * @param {Object} [options]
 * @param {string} [options.wikiDir='wiki'] - Root directory for wiki pages.
 * @returns {{ pageCount: number, filePath: string }}
 */
export function regenerateIndex(options = {}) {
  const wikiDir = options.wikiDir || 'wiki';
  mkdirSync(wikiDir, { recursive: true });

  const groups = {
    Entities: [],
    Concepts: [],
    Topics: [],
    Comparisons: [],
  };

  const dirToGroup = {
    entities: 'Entities',
    concepts: 'Concepts',
    topics: 'Topics',
    comparisons: 'Comparisons',
  };

  let pageCount = 0;

  for (const subDir of WIKI_TYPES) {
    const dirPath = join(wikiDir, subDir);
    if (!existsSync(dirPath)) {
      continue;
    }

    const files = readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = join(dirPath, file);
      let title = file.replace(/\.md$/, '');

      try {
        const raw = readFileSync(filePath, 'utf8');
        const parsed = matter(raw, MATTER_OPTIONS);
        // Try to get display name from the first heading
        const headingMatch = parsed.content.match(/^#\s+(.+)$/m);
        if (headingMatch) {
          title = headingMatch[1].trim();
        }
      } catch {
        // Malformed frontmatter — use file name as fallback
      }

      const slug = file.replace(/\.md$/, '');
      groups[dirToGroup[subDir]].push({ slug, title });
      pageCount++;
    }
  }

  let indexContent = '# Wiki Index\n\n*Auto-generated. Do not edit manually.*\n';

  for (const [group, entries] of Object.entries(groups)) {
    indexContent += `\n## ${group}\n\n`;
    const sorted = entries.sort((a, b) => a.title.localeCompare(b.title));
    for (const entry of sorted) {
      indexContent += `- [[${entry.slug}|${entry.title}]]\n`;
    }
  }

  const filePath = join(wikiDir, 'index.md');
  writeFileSync(filePath, indexContent, 'utf8');

  return { pageCount, filePath };
}

// --- Internal helpers ---

/**
 * Searches all wiki subdirectories for a file by name.
 * @param {string} fileName
 * @param {string} wikiDir
 * @returns {{ fileName: string, filePath: string, type: string } | null}
 */
function _findFileAcrossWiki(fileName, wikiDir) {
  const dirToType = {
    entities: 'entity',
    concepts: 'concept',
    topics: 'topic',
    comparisons: 'comparison',
  };

  for (const subDir of WIKI_TYPES) {
    const filePath = join(wikiDir, subDir, fileName);
    if (existsSync(filePath)) {
      return { fileName, filePath, type: dirToType[subDir] };
    }
  }
  return null;
}

/**
 * Converts a slug or name to title case.
 * @param {string} str
 * @returns {string}
 */
function _titleCase(str) {
  return str
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Strips HTML tags from a string, leaving only text content.
 * Ensures body content is pure Markdown per FR-005.
 * @param {string} str
 * @returns {string}
 */
function _stripHtml(str) {
  return str.replace(/<[^>]*>/g, '');
}
