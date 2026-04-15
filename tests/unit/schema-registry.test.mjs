import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  initDatabase,
  closeDatabase,
  listSchemas,
  getSchema,
  validateRecord,
  registerSchema,
  insertRecord,
  createDataSource,
} from '../../src/db.mjs';
import { generateSchemaWikiPage } from '../../src/schema-registry.mjs';

beforeEach(() => {
  initDatabase(':memory:');
});

afterEach(() => {
  closeDatabase();
});

describe('listSchemas', () => {
  it('returns 6 pre-registered schemas with record_type, label, description', () => {
    const schemas = listSchemas();
    expect(schemas).toHaveLength(6);
    for (const schema of schemas) {
      expect(schema).toMatchObject({
        record_type: expect.any(String),
        label: expect.any(String),
        description: expect.any(String),
      });
    }
  });
});

describe('getSchema', () => {
  it('returns full schema for known type', () => {
    const schema = getSchema('health_metric');
    expect(schema).toBeTruthy();
    expect(schema.json_schema).toMatchObject({
      type: 'object',
      properties: expect.any(Object),
      required: expect.any(Array),
    });
    expect(schema.example).toMatchObject({ metric_type: expect.any(String) });
  });

  it('returns null for unknown type', () => {
    expect(getSchema('unknown_type')).toBeNull();
  });
});

describe('validateRecord', () => {
  it('returns valid true for valid data', () => {
    const result = validateRecord('health_metric', {
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
      recorded_at: '2026-04-14T10:00:00Z',
    });
    expect(result).toEqual({ valid: true, errors: null });
  });

  it('returns errors for invalid data', () => {
    const result = validateRecord('health_metric', {
      metric_type: 'weight',
      value: 'oops',
      recorded_at: '2026-04-14T10:00:00Z',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toBeTruthy();
    expect(result.errors.join(' ')).toMatch(/value|unit/);
  });

  it('throws for unregistered type', () => {
    expect(() => validateRecord('unknown_type', { foo: 'bar' })).toThrow();
  });
});

describe('pre-registered schemas', () => {
  it('all seeded schemas have valid JSON Schema and examples', () => {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const schemas = listSchemas();
    expect(schemas).toHaveLength(6);
    for (const row of schemas) {
      const schema = getSchema(row.record_type);
      const validate = ajv.compile(schema.json_schema);
      expect(validate(schema.example)).toBe(true);
    }
  });
});

describe('registerSchema', () => {
  it('registers new type and returns stored schema', () => {
    const schema = registerSchema(
      'weather',
      'Weather',
      'Weather readings',
      {
        type: 'object',
        properties: {
          temperature_c: { type: 'number' },
          recorded_at: { type: 'string' },
        },
        required: ['temperature_c', 'recorded_at'],
        additionalProperties: false,
      },
      { temperature_c: 21.3, recorded_at: '2026-04-14T09:00:00Z' },
    );
    expect(schema.record_type).toBe('weather');
    expect(listSchemas().some(row => row.record_type === 'weather')).toBe(true);
  });

  it('updates existing schema', () => {
    registerSchema(
      'finance',
      'Finance Records',
      'Updated description',
      {
        type: 'object',
        properties: {
          category: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          recorded_at: { type: 'string' },
        },
        required: ['category', 'amount', 'currency', 'recorded_at'],
        additionalProperties: false,
      },
      { category: 'food', amount: 12, currency: 'USD', recorded_at: '2026-04-14T12:00:00Z' },
    );
    const schema = getSchema('finance');
    expect(schema.label).toBe('Finance Records');
  });

  it('throws on invalid record type', () => {
    expect(() => registerSchema('bad type', 'Bad', '', {}, {})).toThrow();
  });

  it('throws on invalid json schema', () => {
    expect(() => registerSchema('invalid', 'Invalid', '', { type: 123 }, {})).toThrow();
  });
});

describe('insertRecord with validation', () => {
  it('inserts valid data', () => {
    const source = createDataSource({ name: 'source-a', type: 'manual' });
    const record = insertRecord('health_metric', {
      source_id: source.id,
      recorded_at: '2026-04-14T10:00:00Z',
      metric_type: 'weight',
      value: 80,
      unit: 'kg',
    });
    expect(record.record_type).toBe('health_metric');
  });

  it('throws on invalid data', () => {
    const source = createDataSource({ name: 'source-b', type: 'manual' });
    expect(() =>
      insertRecord('health_metric', {
        source_id: source.id,
        recorded_at: '2026-04-14T10:00:00Z',
        metric_type: 'weight',
        value: 'oops',
        unit: 'kg',
      })
    ).toThrow(/Validation failed/);
  });

  it('warns but inserts for unregistered type', () => {
    const source = createDataSource({ name: 'source-c', type: 'manual' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const record = insertRecord('unknown_type', {
      source_id: source.id,
      recorded_at: '2026-04-14T10:00:00Z',
      foo: 'bar',
    });
    expect(record.record_type).toBe('unknown_type');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('generateSchemaWikiPage', () => {
  it('creates wiki file with frontmatter, fields table, and example', () => {
    const schema = getSchema('sleep');
    const tmpDir = mkdtempSync(join(tmpdir(), 'schema-wiki-'));
    const { filePath } = generateSchemaWikiPage(schema, { wikiDir: tmpDir });
    const content = readFileSync(filePath, 'utf8');
    expect(content).toMatch(/type: schema/);
    expect(content).toMatch(/record_type: sleep/);
    expect(content).toMatch(/\| Field \| Type \| Required \|/);
    expect(content).toMatch(/```json/);
    rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('schema-registry CLI', () => {
  const cliPath = join(process.cwd(), 'src', 'schema-registry.mjs');

  function runCli(args, cwd) {
    return spawnSync(process.execPath, [cliPath, ...args], {
      cwd,
      encoding: 'utf8',
    });
  }

  it('shows usage when no args', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'schema-cli-'));
    const result = runCli([], cwd);
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/Usage/);
    rmSync(cwd, { recursive: true, force: true });
  });

  it('lists schemas', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'schema-cli-'));
    const result = runCli(['list'], cwd);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/record_type \| label \| description/);
    rmSync(cwd, { recursive: true, force: true });
  });

  it('gets schema by record_type', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'schema-cli-'));
    const result = runCli(['get', 'health_metric'], cwd);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/"record_type": "health_metric"/);
    rmSync(cwd, { recursive: true, force: true });
  });

  it('registers schema from file and validates data', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'schema-cli-'));
    const schemaFile = join(cwd, 'schema.json');
    const dataFile = join(cwd, 'data.json');
    writeFileSync(
      schemaFile,
      JSON.stringify({
        record_type: 'weather',
        label: 'Weather',
        description: 'Weather data',
        json_schema: {
          type: 'object',
          properties: {
            temperature_c: { type: 'number' },
            recorded_at: { type: 'string' },
          },
          required: ['temperature_c', 'recorded_at'],
          additionalProperties: false,
        },
        example: { temperature_c: 20.5, recorded_at: '2026-04-14T09:00:00Z' },
      })
    );
    writeFileSync(
      dataFile,
      JSON.stringify({ temperature_c: 20.5, recorded_at: '2026-04-14T09:00:00Z' })
    );

    const registerResult = runCli(['register', schemaFile], cwd);
    expect(registerResult.status).toBe(0);
    expect(registerResult.stdout).toMatch(/"record_type": "weather"/);

    const validateResult = runCli(['validate', 'weather', dataFile], cwd);
    expect(validateResult.status).toBe(0);
    expect(validateResult.stdout).toMatch(/"valid": true/);
    rmSync(cwd, { recursive: true, force: true });
  });
});
