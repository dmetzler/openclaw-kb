# csv.mjs — CSV Utilities

The CSV module provides RFC 4180-compliant CSV parsing and serialisation. It handles field escaping, quoting, and CRLF line endings.

**Source:** `src/csv.mjs` (134 lines)
**Dependencies:** None (pure JavaScript)

---

## Exported Functions

### `csvEscapeField(field)`

Escapes a single CSV field value according to RFC 4180.

```js
import { csvEscapeField } from './csv.mjs';

csvEscapeField('hello');           // → 'hello'
csvEscapeField('hello, world');    // → '"hello, world"'
csvEscapeField('say "hi"');        // → '"say ""hi"""'
csvEscapeField('line\nbreak');     // → '"line\nbreak"'
```

| Parameter | Type | Description |
|---|---|---|
| `field` | any | Value to escape (converted to string) |

**Returns:** `string` — The escaped field value, quoted if it contains commas, double quotes, or newlines.

**Quoting rules:**

- Fields containing `,`, `"`, `\n`, or `\r` are wrapped in double quotes
- Double quotes within a field are escaped by doubling them (`"` → `""`)
- All other fields are returned unquoted
- `null` and `undefined` are converted to empty strings

---

### `csvStringify(rows, options?)`

Serialises an array of rows into a CSV string.

```js
import { csvStringify } from './csv.mjs';

const csv = csvStringify([
  ['Name', 'Age', 'City'],
  ['Alice', 30, 'New York'],
  ['Bob', 25, 'San Francisco']
]);
// → 'Name,Age,City\r\nAlice,30,New York\r\nBob,25,San Francisco\r\n'
```

| Parameter | Type | Description |
|---|---|---|
| `rows` | `any[][]` | Array of row arrays |
| `options` | object | Reserved for future use |

**Returns:** `string` — RFC 4180-compliant CSV with CRLF line endings.

**Behaviour:**

1. Each row is an array of field values
2. Each field is passed through `csvEscapeField()`
3. Fields are joined with `,`
4. Rows are joined with `\r\n` (CRLF)
5. A trailing CRLF is appended after the last row

---

### `csvParse(text)`

Parses a CSV string into an array of row arrays.

```js
import { csvParse } from './csv.mjs';

const rows = csvParse('Name,Age\r\nAlice,30\r\nBob,25\r\n');
// → [['Name', 'Age'], ['Alice', '30'], ['Bob', '25']]
```

| Parameter | Type | Description |
|---|---|---|
| `text` | string | CSV text to parse |

**Returns:** `any[][]` — Array of row arrays. All values are strings.

**Parsing rules:**

- Handles both `\r\n` (CRLF) and `\n` (LF) line endings
- Unquotes double-quoted fields
- Unescapes doubled double quotes (`""` → `"`)
- Handles newlines within quoted fields
- Trailing empty rows are ignored

---

## RFC 4180 Compliance

The module follows [RFC 4180](https://tools.ietf.org/html/rfc4180) with these key rules:

| Rule | Implementation |
|---|---|
| Line endings | CRLF (`\r\n`) on output; accepts both CRLF and LF on input |
| Field separator | Comma (`,`) |
| Quoting | Fields containing `,`, `"`, `\r`, or `\n` are quoted |
| Quote escaping | `"` → `""` (doubled) |
| Trailing newline | Present after last record |

---

## Related Pages

- [API: kb-export.mjs](kb-export.md) — Uses CSV for certain export formats
- [API Reference Overview](index.md) — All module documentation
