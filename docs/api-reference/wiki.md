# wiki.mjs — Wiki Page Management

The wiki module manages Markdown pages on disk — creating, reading, updating, and finding wiki pages that represent knowledge graph entities.

**Source:** `src/wiki.mjs` (446 lines)
**Dependencies:** `fs`, `path`, `crypto`

---

## Constants

### `WIKI_TYPES`

```js
export const WIKI_TYPES = ['entities', 'concepts', 'topics', 'comparisons'];
```

The four supported wiki page categories, each mapping to a subdirectory under `wiki/`.

### `TYPE_TO_DIR`

Internal mapping from entity type strings to directory names. Types not matching a known category default to `entities/`.

---

## Exported Functions

### `slugify(name)`

Converts an entity name to a URL-safe filename slug.

```js
import { slugify } from './wiki.mjs';

slugify('Machine Learning');     // → 'machine-learning'
slugify('React.js');             // → 'reactjs'
slugify('C++');                  // → 'c'
slugify('A very long name...');  // → '<72-chars>-<md5-8-chars>'
```

| Parameter | Type | Description |
|---|---|---|
| `name` | string | Entity name to slugify |

**Returns:** `string` — Lowercase, hyphen-separated slug. Truncated to 80 chars max (72 + 8-char MD5 hash for long names).

**Rules:**

1. Lowercase the input
2. Replace whitespace with hyphens
3. Strip non-alphanumeric characters (except hyphens)
4. Collapse consecutive hyphens
5. Trim leading/trailing hyphens
6. If > 80 chars, truncate to 72 + `-` + 8-char MD5 hash

---

### `rawFileName(url)`

Converts a URL to a safe filename for raw source archival.

```js
import { rawFileName } from './wiki.mjs';

rawFileName('https://example.com/article');
// → 'httpsexamplecomarticle' (slugified)
```

| Parameter | Type | Description |
|---|---|---|
| `url` | string | Source URL |

**Returns:** `string` — Slugified URL suitable for use as a filename.

---

### `createPage(entity, sourceMarkdown)`

Creates a new wiki page from an entity and its source content.

```js
import { createPage } from './wiki.mjs';

createPage(
  { id: 1, name: 'React', type: 'technology', created_at: '...', updated_at: '...' },
  '# React\n\nReact is a JavaScript library...'
);
// Creates: wiki/entities/react.md
```

| Parameter | Type | Description |
|---|---|---|
| `entity` | object | Entity object with `id`, `name`, `type`, `created_at`, `updated_at` |
| `sourceMarkdown` | string | Markdown content for the page body |

**Behaviour:**

1. Maps entity type to wiki directory via `TYPE_TO_DIR`
2. Creates the directory if it does not exist
3. Slugifies the entity name for the filename
4. Generates YAML frontmatter with entity metadata
5. Writes `wiki/<type>/<slug>.md`

If a file already exists at the path, it is **overwritten**.

---

### `updatePage(fileName, updates)`

Updates an existing wiki page's frontmatter and/or content.

```js
import { updatePage } from './wiki.mjs';

updatePage('react.md', {
  data: { confidence: 0.95 },
  content: '# React\n\nUpdated content...'
});
```

| Parameter | Type | Description |
|---|---|---|
| `fileName` | string | Wiki page filename (e.g. `react.md`) |
| `updates` | object | `{ data?: object, content?: string }` |

**Behaviour:**

1. Reads the existing page (searches all wiki subdirectories)
2. Merges new frontmatter fields into existing frontmatter
3. Replaces content if `updates.content` is provided
4. Updates the `updated` timestamp automatically
5. Writes the file back

---

### `readPage(fileName, options?)`

Reads a wiki page by filename, searching all wiki subdirectories.

```js
import { readPage } from './wiki.mjs';

const page = readPage('react.md');
// → { data: { id: 1, type: 'entity', ... }, content: '# React\n...', filePath: 'wiki/entities/react.md' }
// → null (if not found)
```

| Parameter | Type | Description |
|---|---|---|
| `fileName` | string | Wiki page filename |
| `options` | object | Reserved for future use |

**Returns:** `{ data: object, content: string, filePath: string }` or `null`.

Frontmatter is parsed using `gray-matter` with the `JSON_SCHEMA` engine.

---

### `findPage(entityName, options?)`

Locates a wiki page by entity name (slugifies the name and searches).

```js
import { findPage } from './wiki.mjs';

const found = findPage('React');
// → { fileName: 'react.md', filePath: 'wiki/entities/react.md', type: 'entities' }
// → null (if not found)
```

| Parameter | Type | Description |
|---|---|---|
| `entityName` | string | Entity name to find |
| `options` | object | Reserved for future use |

**Returns:** `{ fileName: string, filePath: string, type: string }` or `null`.

---

### `appendLog(fileName, entry)`

Appends a timestamped log entry to the bottom of a wiki page.

```js
import { appendLog } from './wiki.mjs';

appendLog('react.md', 'Updated with new source material from React docs');
```

| Parameter | Type | Description |
|---|---|---|
| `fileName` | string | Wiki page filename |
| `entry` | string | Log entry text |

Adds a Markdown section like:

```markdown
---
**2024-01-15T10:30:00Z**: Updated with new source material from React docs
```

---

### `regenerateIndex()`

Rebuilds the `wiki/index.md` file by scanning all wiki pages.

```js
import { regenerateIndex } from './wiki.mjs';

regenerateIndex();
```

Scans all four wiki subdirectories and generates a table of contents grouped by type, with links to each page.

---

## Related Pages

- [Wiki Structure](../developer-guide/wiki-structure.md) — Directory layout and conventions
- [Ingestion Pipeline](../developer-guide/ingestion-pipeline.md) — How wiki pages are created
- [User Guide: Wiki](../user-guide/wiki.md) — End-user wiki documentation
