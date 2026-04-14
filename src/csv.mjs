/**
 * RFC 4180 CSV serialization and parsing helpers.
 *
 * @module csv
 */

/**
 * Escapes a single value for CSV output per RFC 4180.
 *
 * - null/undefined → empty string
 * - numbers → unquoted decimal string
 * - strings → quoted if containing commas, double quotes, or newlines
 * - objects/arrays → JSON.stringify then CSV-escape
 *
 * @param {*} value - Value to escape.
 * @returns {string} CSV-safe field value.
 */
export function csvEscapeField(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    value = JSON.stringify(value);
  }

  const str = String(value);

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * Produces a complete RFC 4180 CSV string with header row and CRLF line endings.
 *
 * @param {string[]} headers - Column names for header row.
 * @param {Array<Array<string|number|null>>} rows - Data rows (same order as headers).
 * @returns {string} Complete CSV string with CRLF line endings.
 */
export function csvStringify(headers, rows) {
  const lines = [];
  lines.push(headers.join(','));

  for (const row of rows) {
    lines.push(row.map(csvEscapeField).join(','));
  }

  return lines.join('\r\n') + '\r\n';
}

/**
 * Parses an RFC 4180 CSV string into headers and rows.
 * Handles quoted fields, embedded newlines, and escaped double quotes.
 *
 * @param {string} text - Raw CSV text.
 * @returns {{ headers: string[], rows: string[][] }} Parsed result.
 */
export function csvParse(text) {
  const records = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        current.push(field);
        field = '';
        i++;
      } else if (ch === '\r') {
        if (i + 1 < text.length && text[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
        current.push(field);
        field = '';
        records.push(current);
        current = [];
      } else if (ch === '\n') {
        current.push(field);
        field = '';
        records.push(current);
        current = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Handle final field/record if text doesn't end with newline
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    records.push(current);
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0];
  const rows = records.slice(1);

  return { headers, rows };
}
