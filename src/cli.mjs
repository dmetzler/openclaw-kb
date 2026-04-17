#!/usr/bin/env node

/**
 * Unified CLI for OpenClaw Knowledge Base.
 *
 * Single process: loads DB and modules ONCE, then dispatches to the
 * right command. Designed for fast interactive use and batch mode.
 *
 * @module cli
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import {
  initDatabase,
  closeDatabase,
  createEntity,
  getEntity,
  getAllEntities,
  createRelation,
  getAllRelations,
  getRelationsFrom,
  getRelationsTo,
  search as dbSearch,
  traverseGraph,
  getRecordCounts,
} from './db.mjs';
import {
  createPage,
  findPage,
  regenerateIndex,
  regenerateAllPages,
  slugify,
  rawFileName as generateRawFileName,
} from './wiki.mjs';
import { searchKG, search as hybridSearch } from './wiki-search.mjs';

// ---------------------------------------------------------------------------
// Gray-matter options (consistent with wiki.mjs)
// ---------------------------------------------------------------------------

const MATTER_OPTIONS = {
  engines: {
    yaml: {
      parse: (str) => yaml.load(str, { schema: yaml.JSON_SCHEMA }),
      stringify: (obj) => yaml.dump(obj, { lineWidth: -1, schema: yaml.JSON_SCHEMA }),
    },
  },
};

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

/**
 * Parses a shell-like argument string into tokens, respecting double quotes.
 * Used for batch mode line parsing.
 *
 * @param {string} line - Raw input line.
 * @returns {string[]} Parsed tokens.
 */
export function tokenize(line) {
  const tokens = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ' ' && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Extracts global flags (--db, --wiki, --json, --help) from argv.
 * Returns remaining positional args.
 *
 * @param {string[]} argv - Raw arguments (after node + script).
 * @returns {{ flags: { db?: string, wiki?: string, json: boolean, help: boolean }, args: string[] }}
 */
export function parseGlobalFlags(argv) {
  const flags = { json: false, help: false };
  const args = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--db' && i + 1 < argv.length) {
      flags.db = argv[++i];
    } else if (arg === '--wiki' && i + 1 < argv.length) {
      flags.wiki = argv[++i];
    } else if (arg === '--json') {
      flags.json = true;
    } else if (arg === '--help' || arg === '-h') {
      flags.help = true;
    } else {
      args.push(arg);
    }
  }

  return { flags, args };
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function formatOutput(data, json) {
  if (json) return JSON.stringify(data, null, 2);
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (typeof item === 'object') {
        return Object.entries(item)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join(', ');
      }
      return String(item);
    }).join('\n');
  }
  if (typeof data === 'object') {
    return Object.entries(data)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join('\n');
  }
  return String(data);
}

// ---------------------------------------------------------------------------
// Command definitions
// ---------------------------------------------------------------------------

const COMMANDS = {};

/**
 * Registers a command.
 *
 * @param {string} name
 * @param {{ usage: string, description: string, run: function }} def
 */
function register(name, def) {
  COMMANDS[name] = def;
}

// --- add-entity ---
register('add-entity', {
  usage: 'add-entity <name> <type> [description]',
  description: 'Create a knowledge graph entity (returns existing if name matches).',
  run(args, flags) {
    const [name, type, ...descParts] = args;
    if (!name || !type) return { error: 'Usage: add-entity <name> <type> [description]' };

    // Check for duplicate by name
    const all = getAllEntities();
    const existing = all.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return { ...existing, _note: 'already exists' };
    }

    const metadata = {};
    const description = descParts.join(' ');
    if (description) metadata.description = description;

    return createEntity({ name, type, metadata });
  },
});

// --- add-relation ---
register('add-relation', {
  usage: 'add-relation <source_id|name> <target_id|name> <type>',
  description: 'Create a relation between two entities (by ID or name).',
  run(args) {
    const [sourceRef, targetRef, relType] = args;
    if (!sourceRef || !targetRef || !relType) {
      return { error: 'Usage: add-relation <source> <target> <type>' };
    }

    const resolveEntity = (ref) => {
      const id = Number(ref);
      if (!Number.isNaN(id) && id > 0) {
        const ent = getEntity(id);
        if (ent) return ent;
      }
      // Fallback: search by name
      const all = getAllEntities();
      return all.find((e) => e.name.toLowerCase() === ref.toLowerCase()) || null;
    };

    const source = resolveEntity(sourceRef);
    const target = resolveEntity(targetRef);
    if (!source) return { error: `Entity not found: ${sourceRef}` };
    if (!target) return { error: `Entity not found: ${targetRef}` };

    return createRelation({ source_id: source.id, target_id: target.id, type: relType });
  },
});

// --- create-page ---
register('create-page', {
  usage: 'create-page <entity_id> | create-page --all',
  description: 'Generate wiki page(s) from KG entity/entities.',
  run(args, flags) {
    const wikiDir = flags.wiki || process.env.KB_WIKI_DIR || 'wiki';

    if (args[0] === '--all') {
      const entities = getAllEntities();
      const results = [];
      for (const entity of entities) {
        const existing = findPage(entity.name, { wikiDir });
        if (existing) {
          results.push({ id: entity.id, name: entity.name, status: 'exists', path: existing.filePath });
          continue;
        }
        try {
          const result = createPage(
            { name: entity.name, type: entity.type, description: entity.metadata?.description, attributes: entity.metadata },
            `cli-generated`,
            { wikiDir },
          );
          results.push({ id: entity.id, name: entity.name, status: 'created', path: result.filePath });
        } catch (err) {
          results.push({ id: entity.id, name: entity.name, status: 'error', error: err.message });
        }
      }
      regenerateIndex({ wikiDir });
      return results;
    }

    const id = Number(args[0]);
    if (!id || Number.isNaN(id)) return { error: 'Usage: create-page <entity_id> | create-page --all' };

    const entity = getEntity(id);
    if (!entity) return { error: `Entity not found: ${id}` };

    const existing = findPage(entity.name, { wikiDir });
    if (existing) return { id: entity.id, name: entity.name, status: 'exists', path: existing.filePath };

    const result = createPage(
      { name: entity.name, type: entity.type, description: entity.metadata?.description, attributes: entity.metadata },
      `cli-generated`,
      { wikiDir },
    );
    regenerateIndex({ wikiDir });
    return { id: entity.id, name: entity.name, status: 'created', path: result.filePath };
  },
});

// --- search ---
register('search', {
  usage: 'search <query>',
  description: 'Hybrid 3-tier search (KG → Data → Semantic).',
  async run(args) {
    const query = args.join(' ');
    if (!query) return { error: 'Usage: search <query>' };

    const results = await hybridSearch(query, { includeScores: true });
    return results;
  },
});

// --- search-kg ---
register('search-kg', {
  usage: 'search-kg <query>',
  description: 'Search knowledge graph entities with traversal.',
  run(args) {
    const query = args.join(' ');
    if (!query) return { error: 'Usage: search-kg <query>' };

    return searchKG(query);
  },
});

// --- ingest-raw ---
register('ingest-raw', {
  usage: 'ingest-raw <title> <source> <content>',
  description: 'Create a raw source file with frontmatter.',
  run(args, flags) {
    const [title, source, ...contentParts] = args;
    if (!title || !source) return { error: 'Usage: ingest-raw <title> <source> <content>' };

    const content = contentParts.join(' ');
    const rawDir = 'raw';
    mkdirSync(rawDir, { recursive: true });

    const now = new Date();
    const fileName = generateRawFileName(title, now, { rawDir });

    const frontmatter = {
      title,
      source,
      date: now.toISOString(),
      tags: [],
    };

    const body = `\n${content}\n`;
    const output = matter.stringify(body, frontmatter, MATTER_OPTIONS);
    const filePath = join(rawDir, fileName);
    writeFileSync(filePath, output, 'utf8');

    return { fileName, filePath };
  },
});

// --- list-entities ---
register('list-entities', {
  usage: 'list-entities',
  description: 'List all knowledge graph entities.',
  run() {
    return getAllEntities();
  },
});

// --- find-entity ---
register('find-entity', {
  usage: 'find-entity <name>',
  description: 'Find entities matching a name (case-insensitive substring).',
  run(args) {
    const query = args.join(' ').toLowerCase();
    if (!query) return { error: 'Usage: find-entity <name>' };

    const all = getAllEntities();
    return all.filter((e) => e.name.toLowerCase().includes(query));
  },
});

// --- regen-index ---
register('regen-index', {
  usage: 'regen-index',
  description: 'Regenerate wiki index and all page cross-references.',
  run(_args, flags) {
    const wikiDir = flags.wiki || process.env.KB_WIKI_DIR || 'wiki';
    const pages = regenerateAllPages({ wikiDir });
    const index = regenerateIndex({ wikiDir });
    return { pages: pages.regenerated, errors: pages.errors, indexPages: index.pageCount };
  },
});

// --- sync ---
register('sync', {
  usage: 'sync <remote:path>',
  description: 'Sync wiki to remote via rclone.',
  async run(args, flags) {
    const remote = args[0];
    if (!remote) return { error: 'Usage: sync <remote:path>' };

    const wikiDir = flags.wiki || process.env.KB_WIKI_DIR || 'wiki';
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    try {
      const { stdout, stderr } = await execFileAsync('rclone', ['copy', wikiDir, remote, '--verbose']);
      return { ok: true, remote, stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (err) {
      return { error: `rclone failed: ${err.message}` };
    }
  },
});

// --- stats ---
register('stats', {
  usage: 'stats',
  description: 'Show database record counts.',
  run() {
    return getRecordCounts();
  },
});

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatches a single command with arguments.
 *
 * @param {string} commandName
 * @param {string[]} commandArgs
 * @param {{ db?: string, wiki?: string, json: boolean, help: boolean }} flags
 * @returns {Promise<any>}
 */
export async function dispatch(commandName, commandArgs, flags) {
  const cmd = COMMANDS[commandName];
  if (!cmd) {
    return { error: `Unknown command: ${commandName}. Run with --help for usage.` };
  }
  if (flags.help) {
    return { command: commandName, usage: cmd.usage, description: cmd.description };
  }
  return cmd.run(commandArgs, flags);
}

// ---------------------------------------------------------------------------
// Batch mode
// ---------------------------------------------------------------------------

/**
 * Reads commands from stdin (one per line) and executes them sequentially.
 *
 * @param {{ db?: string, wiki?: string, json: boolean }} flags
 * @returns {Promise<{ results: any[], errors: number }>}
 */
export async function runBatch(flags) {
  const rl = createInterface({ input: process.stdin, terminal: false });
  const lines = [];
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith('#')) {
      lines.push(trimmed);
    }
  }

  const results = [];
  let errors = 0;

  for (const line of lines) {
    const tokens = tokenize(line);
    if (tokens.length === 0) continue;

    const [cmd, ...cmdArgs] = tokens;
    const result = await dispatch(cmd, cmdArgs, flags);

    if (result?.error) errors++;
    results.push({ command: line, result });
  }

  return { results, errors };
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  const lines = [
    'Usage: kb <command> [options] [args...]',
    '',
    'Commands:',
  ];

  for (const [name, def] of Object.entries(COMMANDS)) {
    lines.push(`  ${def.usage.padEnd(48)} ${def.description}`);
  }

  lines.push('');
  lines.push('Batch mode:');
  lines.push('  kb batch                                       Read commands from stdin (one per line)');
  lines.push('');
  lines.push('Global options:');
  lines.push('  --db <path>       Database path (default: ./jarvis.db or KB_DB_PATH env)');
  lines.push('  --wiki <path>     Wiki directory (default: ./wiki or KB_WIKI_DIR env)');
  lines.push('  --json            Output JSON');
  lines.push('  --help, -h        Show help');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main() {
  const { flags, args } = parseGlobalFlags(process.argv.slice(2));

  if (args.length === 0 || (flags.help && args.length === 0)) {
    process.stdout.write(printHelp() + '\n');
    return;
  }

  const [commandName, ...commandArgs] = args;

  // Resolve DB path
  const dbPath = flags.db || process.env.KB_DB_PATH || 'jarvis.db';
  initDatabase(dbPath);

  try {
    if (commandName === 'batch') {
      const result = await runBatch(flags);
      process.stdout.write(formatOutput(result, flags.json) + '\n');
      if (result.errors > 0) process.exitCode = 1;
      return;
    }

    if (flags.help) {
      const result = await dispatch(commandName, commandArgs, flags);
      process.stdout.write(formatOutput(result, true) + '\n');
      return;
    }

    const result = await dispatch(commandName, commandArgs, flags);

    if (result?.error) {
      process.stderr.write(result.error + '\n');
      process.exitCode = 1;
      return;
    }

    process.stdout.write(formatOutput(result, flags.json) + '\n');
  } finally {
    closeDatabase();
  }
}

// Only run main when executed directly
const isMainModule = process.argv[1]
  && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule) {
  main().catch((err) => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exitCode = 1;
    closeDatabase();
  });
}
