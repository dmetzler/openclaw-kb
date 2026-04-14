import { describe, it, expect } from 'vitest';
import { csvEscapeField, csvStringify, csvParse } from '../../src/csv.mjs';

describe('csvEscapeField', () => {
  it('returns empty string for null', () => {
    expect(csvEscapeField(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(csvEscapeField(undefined)).toBe('');
  });

  it('returns unquoted number for integers', () => {
    expect(csvEscapeField(42)).toBe('42');
  });

  it('returns unquoted number for floats', () => {
    expect(csvEscapeField(3.14)).toBe('3.14');
  });

  it('returns unquoted number for zero', () => {
    expect(csvEscapeField(0)).toBe('0');
  });

  it('returns plain string when no special chars', () => {
    expect(csvEscapeField('hello')).toBe('hello');
  });

  it('quotes string containing comma', () => {
    expect(csvEscapeField('a,b')).toBe('"a,b"');
  });

  it('quotes string containing double quote and escapes it', () => {
    expect(csvEscapeField('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes string containing newline', () => {
    expect(csvEscapeField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('quotes string containing carriage return', () => {
    expect(csvEscapeField('line1\rline2')).toBe('"line1\rline2"');
  });

  it('serializes objects as JSON then CSV-escapes', () => {
    const obj = { key: 'value' };
    // JSON.stringify produces {"key":"value"} which contains quotes → CSV doubles them
    expect(csvEscapeField(obj)).toBe('"{""key"":""value""}"');
  });

  it('serializes arrays as JSON then CSV-escapes', () => {
    const arr = ['a', 'b'];
    // JSON.stringify produces ["a","b"] which contains quotes and commas → CSV doubles quotes
    expect(csvEscapeField(arr)).toBe('"[""a"",""b""]"');
  });

  it('serializes nested objects with quotes correctly', () => {
    const obj = { resting: true };
    const result = csvEscapeField(obj);
    // JSON.stringify produces {"resting":true} which contains no special CSV chars
    // Actually it does contain quotes since JSON has " chars
    expect(result).toBe('"{""resting"":true}"');
  });
});

describe('csvStringify', () => {
  it('produces header-only CSV when no rows', () => {
    const result = csvStringify(['id', 'name'], []);
    expect(result).toBe('id,name\r\n');
  });

  it('produces correct CSV with header and one row', () => {
    const result = csvStringify(['id', 'name'], [[1, 'Alice']]);
    expect(result).toBe('id,name\r\n1,Alice\r\n');
  });

  it('produces correct CSV with multiple rows', () => {
    const result = csvStringify(
      ['id', 'name', 'type'],
      [
        [1, 'Alice', 'person'],
        [2, 'Bob', 'person'],
      ],
    );
    expect(result).toBe('id,name,type\r\n1,Alice,person\r\n2,Bob,person\r\n');
  });

  it('escapes fields with special characters', () => {
    const result = csvStringify(['id', 'note'], [[1, 'has, comma']]);
    expect(result).toBe('id,note\r\n1,"has, comma"\r\n');
  });

  it('handles null values as empty fields', () => {
    const result = csvStringify(['id', 'value'], [[1, null]]);
    expect(result).toBe('id,value\r\n1,\r\n');
  });

  it('serializes JSON objects in fields', () => {
    const result = csvStringify(['id', 'metadata'], [[1, { key: 'val' }]]);
    // The JSON object gets stringified then CSV-escaped
    expect(result).toBe('id,metadata\r\n1,"{""key"":""val""}"\r\n');
  });
});

describe('csvParse', () => {
  it('parses simple CSV with header and rows', () => {
    const text = 'id,name\r\n1,Alice\r\n2,Bob\r\n';
    const { headers, rows } = csvParse(text);
    expect(headers).toEqual(['id', 'name']);
    expect(rows).toEqual([['1', 'Alice'], ['2', 'Bob']]);
  });

  it('handles empty input', () => {
    const { headers, rows } = csvParse('');
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
  });

  it('parses quoted fields', () => {
    const text = 'id,note\r\n1,"has, comma"\r\n';
    const { headers, rows } = csvParse(text);
    expect(rows[0]).toEqual(['1', 'has, comma']);
  });

  it('parses escaped double quotes within quoted fields', () => {
    const text = 'id,note\r\n1,"say ""hi"""\r\n';
    const { headers, rows } = csvParse(text);
    expect(rows[0]).toEqual(['1', 'say "hi"']);
  });

  it('parses embedded newlines within quoted fields', () => {
    const text = 'id,note\r\n1,"line1\nline2"\r\n';
    const { headers, rows } = csvParse(text);
    expect(rows[0]).toEqual(['1', 'line1\nline2']);
  });

  it('parses CSV with JSON objects in fields', () => {
    const text = 'id,metadata\r\n1,"{""key"":""val""}"\r\n';
    const { headers, rows } = csvParse(text);
    expect(rows[0][1]).toBe('{"key":"val"}');
    expect(JSON.parse(rows[0][1])).toEqual({ key: 'val' });
  });

  it('handles LF-only line endings', () => {
    const text = 'id,name\n1,Alice\n2,Bob\n';
    const { headers, rows } = csvParse(text);
    expect(headers).toEqual(['id', 'name']);
    expect(rows).toEqual([['1', 'Alice'], ['2', 'Bob']]);
  });

  it('handles file without trailing newline', () => {
    const text = 'id,name\r\n1,Alice';
    const { headers, rows } = csvParse(text);
    expect(headers).toEqual(['id', 'name']);
    expect(rows).toEqual([['1', 'Alice']]);
  });

  it('round-trips through csvStringify and csvParse', () => {
    const headers = ['id', 'name', 'metadata'];
    const originalRows = [[1, 'Alice', { role: 'admin' }]];
    const csv = csvStringify(headers, originalRows);
    const { headers: parsedHeaders, rows: parsedRows } = csvParse(csv);
    expect(parsedHeaders).toEqual(headers);
    // Values come back as strings
    expect(parsedRows[0][0]).toBe('1');
    expect(parsedRows[0][1]).toBe('Alice');
    // JSON field round-trips
    expect(JSON.parse(parsedRows[0][2])).toEqual({ role: 'admin' });
  });
});
