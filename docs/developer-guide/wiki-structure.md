# Wiki Structure

OpenClaw KB maintains a Markdown wiki on disk alongside the SQLite database. Wiki pages provide human-readable, version-controllable representations of knowledge graph entities. This page documents the directory layout, naming conventions, page format, and the functions that manage wiki pages.

## Directory Layout

```
wiki/
  entities/          # People, organisations, tools, products
    react.md
    openai.md
  concepts/          # Abstract ideas, methodologies, principles
    functional-programming.md
    dependency-injection.md
  topics/            # Broad subject areas, domains
    web-development.md
    machine-learning.md
  comparisons/       # Side-by-side analyses
    react-vs-vue.md
    postgresql-vs-mysql.md
```

### Wiki Types

The system recognises exactly four wiki types, defined in `wiki.mjs`:

```js
const WIKI_TYPES = ['entities', 'concepts', 'topics', 'comparisons'];
```

Each type maps to a subdirectory under `wiki/`:

| Entity Type | Wiki Directory | Typical Content |
|---|---|---|
| `entity` | `wiki/entities/` | Concrete things — tools, people, companies |
| `concept` | `wiki/concepts/` | Abstract ideas — patterns, principles, paradigms |
| `topic` | `wiki/topics/` | Broad domains — fields of study, industry verticals |
| `comparison` | `wiki/comparisons/` | Head-to-head analyses of two or more entities |

The mapping from entity type to directory is handled by the `TYPE_TO_DIR` constant. Types that do not match a known category default to `entities/`.

## Slugification

File names are derived from entity names using a deterministic slugification algorithm:

```js
function slugify(name) {
  let slug = name
    .toLowerCase()           // "React.js" → "react.js"
    .replace(/\s+/g, '-')   // "Web Dev" → "web-dev"
    .replace(/[^a-z0-9-]/g, '') // strip non-alphanumeric
    .replace(/-+/g, '-')    // collapse consecutive hyphens
    .replace(/^-|-$/g, ''); // trim leading/trailing hyphens

  if (slug.length > 80) {
    const hash = md5(name).substring(0, 8);
    slug = slug.substring(0, 72) + '-' + hash;
  }

  return slug;
}
```

**Key rules:**

1. **Lowercase** — All slugs are lowercase
2. **Spaces to hyphens** — `"Machine Learning"` → `machine-learning`
3. **Strip special characters** — Only `a-z`, `0-9`, and `-` survive
4. **Collapse hyphens** — `"C++"` → `c` (not `c--`)
5. **Length limit** — Slugs longer than 80 characters are truncated to 72 characters plus an 8-character MD5 hash suffix, ensuring uniqueness for long names

### Examples

| Entity Name | Slug | File Path |
|---|---|---|
| `React` | `react` | `wiki/entities/react.md` |
| `Machine Learning` | `machine-learning` | `wiki/topics/machine-learning.md` |
| `React vs Vue` | `react-vs-vue` | `wiki/comparisons/react-vs-vue.md` |
| `C++` | `c` | `wiki/entities/c.md` |
| A very long entity name (> 80 chars) | `<truncated>-<md5>` | `wiki/entities/<slug>.md` |

## Page Format

Each wiki page is a standard Markdown file with YAML frontmatter:

```markdown
---
id: 42
type: entity
created: 2024-01-15T10:30:00.000Z
updated: 2024-01-15T10:30:00.000Z
sources:
  - https://example.com/article
confidence: 0.85
related:
  - machine-learning
  - python
kg_id: 42
---

# React

React is a JavaScript library for building user interfaces...
```

### Frontmatter Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | Yes | Database entity ID |
| `type` | string | Yes | Entity type (`entity`, `concept`, `topic`, `comparison`) |
| `created` | ISO 8601 | Yes | Creation timestamp |
| `updated` | ISO 8601 | Yes | Last update timestamp |
| `sources` | string[] | No | URLs of source material |
| `confidence` | float | No | Extraction confidence score (0.0 – 1.0) |
| `related` | string[] | No | Slugs of related wiki pages |
| `kg_id` | integer | No | Knowledge graph entity ID (same as `id`) |

!!! note "Frontmatter parsing"
    Frontmatter is parsed using `gray-matter` with the `JSON_SCHEMA` engine. This prevents YAML-specific type coercion (e.g. `yes` being parsed as `true`) and ensures consistent behaviour.

## Page Operations

### Creating a Page

`createPage(entity, sourceMarkdown)` writes a new wiki page:

1. Determines the target directory from the entity type via `TYPE_TO_DIR`
2. Ensures the directory exists (creates it if needed)
3. Slugifies the entity name to produce the filename
4. Generates frontmatter from entity metadata
5. Writes the file to `wiki/<type>/<slug>.md`

If a file already exists at the target path, it is **overwritten**.

### Reading a Page

`readPage(fileName, options?)` searches all wiki subdirectories for a matching file:

1. Scans all four wiki type directories (`entities/`, `concepts/`, `topics/`, `comparisons/`)
2. Returns the first match as `{ data, content, filePath }` where `data` is parsed frontmatter
3. Returns `null` if no match is found

### Finding a Page

`findPage(entityName, options?)` locates a wiki page by entity name:

1. Slugifies the entity name
2. Scans all four wiki subdirectories for `<slug>.md`
3. Returns `{ fileName, filePath, type }` or `null`

### Updating a Page

`updatePage(fileName, updates)` modifies an existing page's frontmatter and/or content:

1. Reads the existing page
2. Merges new frontmatter fields into existing frontmatter
3. Replaces content if new content is provided
4. Updates the `updated` timestamp
5. Writes the file back

### Appending to the Log

`appendLog(fileName, entry)` adds a timestamped log entry to the bottom of a wiki page. Useful for tracking changes or observations about an entity over time.

### Regenerating the Index

`regenerateIndex()` rebuilds the `wiki/index.md` file by scanning all wiki pages and generating a table of contents grouped by type.

## Raw Source Archive

In addition to wiki pages, the ingestion pipeline archives the original source material:

```
raw/
  <slugified-url>.md
```

The `rawFileName(url)` function converts a source URL to a safe filename using the same slugification rules. These files are write-once and never modified — they serve as a permanent record of what was ingested.

## File System Conventions

| Convention | Rule |
|---|---|
| File extension | Always `.md` |
| Encoding | UTF-8 |
| Line endings | Platform-native (LF on Unix, CRLF on Windows) |
| Directory creation | Automatic — `_ensureWikiDirs()` creates missing directories |
| Naming conflicts | Later writes overwrite earlier files |
| Case sensitivity | Slugs are always lowercase; filesystem case sensitivity depends on OS |

!!! warning "Case-insensitive file systems"
    On macOS (HFS+) and Windows (NTFS), `react.md` and `React.md` are the same file. The slugification algorithm prevents this from being an issue by always lowercasing, but be aware when working with case-sensitive Linux filesystems.

## Related Pages

- [Architecture Overview](architecture.md) — System design and data model
- [Ingestion Pipeline](ingestion-pipeline.md) — How wiki pages are created during ingestion
- [User Guide: Wiki](../user-guide/wiki.md) — End-user wiki documentation
- [API: wiki.mjs](../api-reference/wiki.md) — Function signatures and parameters
