import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import { slugify } from './wiki.mjs';

const YAML_OPTIONS = { lineWidth: -1, schema: yaml.JSON_SCHEMA };

/**
 * Generates an Obsidian-compatible wiki page for a schema.
 *
 * @param {{ record_type: string, label: string, description: string, json_schema: Object, example: Object, created_at: string, updated_at: string }} schema
 * @param {{ wikiDir?: string }} [options]
 * @returns {{ fileName: string, filePath: string }}
 */
export function generateSchemaWikiPage(schema, options = {}) {
  const wikiDir = options.wikiDir || 'wiki';
  const schemasDir = join(wikiDir, 'schemas');
  mkdirSync(schemasDir, { recursive: true });

  const frontmatter = {
    type: 'schema',
    record_type: schema.record_type,
    label: schema.label,
    created_at: schema.created_at,
    updated_at: schema.updated_at,
  };

  const required = new Set(schema.json_schema?.required || []);
  const properties = schema.json_schema?.properties || {};

  let fieldsTable = '| Field | Type | Required |\n| --- | --- | --- |\n';
  for (const [field, def] of Object.entries(properties)) {
    const type = def?.type || 'unknown';
    fieldsTable += `| ${field} | ${type} | ${required.has(field) ? 'yes' : 'no'} |\n`;
  }

  const content = [
    '---',
    yaml.dump(frontmatter, YAML_OPTIONS).trim(),
    '---',
    `\n# ${schema.label}\n`,
    schema.description ? `${schema.description}\n` : '',
    '## Fields\n',
    fieldsTable,
    '\n## Example\n',
    '```json',
    JSON.stringify(schema.example, null, 2),
    '```\n',
  ].join('\n');

  const fileName = `${slugify(schema.record_type)}.md`;
  const filePath = join(schemasDir, fileName);
  writeFileSync(filePath, content, 'utf8');

  return { fileName, filePath };
}

function printUsage() {
  process.stdout.write(
    'Usage: node src/schema-registry.mjs <command> [args]\n\n'
    + 'Commands:\n'
    + '  list\n'
    + '  get <record_type>\n'
    + '  register <schema-json-file>\n'
    + '  validate <record_type> <data-json-file>\n'
  );
}

async function runCli() {
  const { initDatabase, closeDatabase, getSchema, listSchemas, registerSchema, validateRecord } =
    await import('./db.mjs');

  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    printUsage();
    process.exit(1);
  }

  try {
    initDatabase();

    if (command === 'list') {
      const rows = listSchemas();
      if (rows.length === 0) {
        process.stdout.write('No schemas registered.\n');
        process.exit(0);
      }
      const header = 'record_type | label | description';
      process.stdout.write(`${header}\n`);
      for (const row of rows) {
        process.stdout.write(`${row.record_type} | ${row.label} | ${row.description}\n`);
      }
      process.exit(0);
    }

    if (command === 'get') {
      const recordType = args[1];
      if (!recordType) {
        printUsage();
        process.exit(1);
      }
      const schema = getSchema(recordType);
      if (!schema) {
        process.stderr.write(`Schema not found for record type: ${recordType}\n`);
        process.exit(1);
      }
      process.stdout.write(JSON.stringify(schema, null, 2) + '\n');
      process.exit(0);
    }

    if (command === 'register') {
      const filePath = args[1];
      if (!filePath) {
        printUsage();
        process.exit(1);
      }
      if (!existsSync(filePath)) {
        process.stderr.write(`File not found: ${filePath}\n`);
        process.exit(2);
      }
      const raw = readFileSync(filePath, 'utf8');
      const payload = JSON.parse(raw);
      const schema = registerSchema(
        payload.record_type,
        payload.label,
        payload.description ?? '',
        payload.json_schema,
        payload.example,
      );
      process.stdout.write(JSON.stringify(schema, null, 2) + '\n');
      process.exit(0);
    }

    if (command === 'validate') {
      const recordType = args[1];
      const filePath = args[2];
      if (!recordType || !filePath) {
        printUsage();
        process.exit(1);
      }
      if (!existsSync(filePath)) {
        process.stderr.write(`File not found: ${filePath}\n`);
        process.exit(2);
      }
      const raw = readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      const result = validateRecord(recordType, data);
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      process.exit(result.valid ? 0 : 1);
    }

    printUsage();
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

const mainPath = process.argv[1];
if (mainPath && import.meta.url === pathToFileURL(mainPath).href) {
  runCli();
}
