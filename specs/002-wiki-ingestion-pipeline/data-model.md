# Data Model: Wiki Structure, Templates & Ingestion Pipeline

**Branch**: `002-wiki-ingestion-pipeline` | **Date**: 2026-04-14

## Overview

This feature operates on two storage layers: **file system** (Markdown files in `wiki/` and `raw/`) and **SQLite** (Knowledge Graph entities/relations via `db.mjs` from spec 001). The file system is the primary storage for wiki content; SQLite stores the structured knowledge graph that mirrors wiki page relationships.

---

## File System Entities

### Wiki Page (Markdown file in `wiki/{type}/`)

A Markdown file representing a single entity, concept, topic, or comparison. Each page has YAML frontmatter and a Markdown body with Obsidian wikilinks.

**Location**: `wiki/entities/`, `wiki/concepts/`, `wiki/topics/`, or `wiki/comparisons/`

**Frontmatter fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | YES | Unique identifier (matches slugified file name without `.md`) |
| `type` | string | YES | Page type: `entity`, `concept`, `topic`, or `comparison` |
| `created` | string (ISO 8601) | YES | Creation timestamp |
| `updated` | string (ISO 8601) | YES | Last modification timestamp |
| `sources` | string[] | YES | List of raw file references (file names without path) |
| `confidence` | number (0.0–1.0) | YES | LLM extraction confidence score |
| `related` | string[] | YES | List of wikilink references: `"[[page-name\|Display Name]]"` |
| `kg_id` | number | YES | Matching Knowledge Graph entity ID in SQLite |

**Body format:**
- Pure Markdown (no HTML per FR-005)
- Cross-references use Obsidian wikilinks: `[[page-name|Display Name]]` (FR-004)
- Content structured with Markdown headings

**Example:**
```markdown
---
id: "javascript"
type: "concept"
created: "2026-04-14T10:30:00Z"
updated: "2026-04-14T14:20:00Z"
sources:
  - "2026-04-14-introduction-to-javascript"
  - "2026-04-14-web-development-guide"
confidence: 0.92
related:
  - "[[typescript|TypeScript]]"
  - "[[nodejs|Node.js]]"
  - "[[web-development|Web Development]]"
kg_id: 15
---

# JavaScript

JavaScript is a high-level, interpreted programming language...

## Key Features

- Dynamic typing
- First-class functions
- Prototype-based object orientation

## Related Concepts

See also [[typescript|TypeScript]] for the typed superset, and [[nodejs|Node.js]] for server-side JavaScript.
```

**Validation rules:**
- `id` must be non-empty and match the file name (without `.md`)
- `type` must be one of: `entity`, `concept`, `topic`, `comparison`
- `created` and `updated` must be valid ISO 8601 timestamps
- `sources` must be a non-empty array (at least one source)
- `confidence` must be between 0.0 and 1.0 inclusive
- `related` entries must use `"[[name|display]]"` or `"[[name]]"` format
- `kg_id` must reference a valid entity ID in the SQLite database
- File name must be unique across all wiki subdirectories (FR-006)

**File naming rules (FR-016):**
- Derived from entity/concept name
- Lowercased
- Spaces replaced by hyphens
- Non-alphanumeric characters (except hyphens) removed
- Max 80 characters; truncated with 6-char MD5 hash suffix if exceeded
- OS-safe and Google Drive-compatible (no `:*?"<>|\` characters)

---

### Raw Source (Markdown file in `raw/`)

An immutable archived document representing fetched or manually provided content.

**Location**: `raw/`

**Frontmatter fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | YES | Source document title |
| `source` | string | YES | URL of the original source, or `"manual"` for text input |
| `date` | string (ISO 8601) | YES | Fetch/creation timestamp |
| `author` | string | NO | Author name (omitted if unavailable) |
| `tags` | string[] | YES | Classification tags (can be empty array) |

**Body**: The extracted Markdown content (from URL) or the raw text (from manual input).

**Example:**
```markdown
---
title: "Introduction to JavaScript"
source: "https://example.com/intro-to-javascript"
date: "2026-04-14T10:30:00Z"
author: "Jane Smith"
tags:
  - javascript
  - programming
  - web-development
---

# Introduction to JavaScript

JavaScript is a versatile programming language...
```

**Validation rules:**
- `title` must be non-empty
- `source` must be a valid URL or the literal string `"manual"`
- `date` must be a valid ISO 8601 timestamp
- `tags` must be an array (can be empty)
- **Immutability**: Raw files MUST NOT be modified after creation (FR-002)

**File naming convention:**
- Format: `YYYY-MM-DD-slugified-title.md`
- Same-day duplicates get numeric suffix: `-2`, `-3`, etc.
- Example: `2026-04-14-introduction-to-javascript.md`

---

### Wiki Index (`wiki/index.md`)

An auto-generated catalog of all wiki pages, grouped by type.

**Format:**
```markdown
# Wiki Index

*Auto-generated. Do not edit manually.*

## Entities

- [[entity-name|Display Name]]
- [[another-entity|Another Entity]]

## Concepts

- [[concept-name|Display Name]]

## Topics

- [[topic-name|Display Name]]

## Comparisons

- [[comparison-name|Display Name]]
```

**Regeneration rules:**
- Regenerated whenever pages are added, updated, or removed (FR-007)
- Scans all four wiki subdirectories
- Groups pages by subdirectory/type
- Each entry is a wikilink: `[[file-name|Title from frontmatter]]`
- Sorted alphabetically within each group

---

### Operation Log (`wiki/log.md`)

An append-only chronological record of all ingestion operations.

**Format:**
```markdown
# Operation Log

## 2026-04-14T10:30:00Z — URL Ingestion

**Source**: https://example.com/intro-to-javascript
**Raw file**: 2026-04-14-introduction-to-javascript.md
**Pages created**: [[javascript]], [[web-development]]
**Pages updated**: [[nodejs]]

---

## 2026-04-14T11:00:00Z — Text Ingestion

**Source**: Manual — "Meeting Notes: Architecture Review"
**Raw file**: 2026-04-14-meeting-notes-architecture-review.md
**Pages created**: [[microservices-concept]]
**Pages updated**: (none)
**Note**: No entities extracted for 2 items (low confidence)

---
```

**Rules:**
- Append-only — entries are never modified or removed (FR-008)
- Each entry includes: timestamp, source (URL or text title), raw file name, pages created, pages updated
- Partial failures noted with which items failed (FR-019)
- Empty extractions noted (FR-018)
- Most recent entries at the bottom (chronological order)

---

## SQLite Entities (via `db.mjs`)

This feature uses the existing Knowledge Graph tables from spec 001. No new SQLite tables are introduced.

### entities (existing — spec 001)

Wiki pages create corresponding entities in the KG.

| Column | Type | Mapping to Wiki Page |
|--------|------|---------------------|
| `id` | INTEGER | Maps to `kg_id` in wiki page frontmatter |
| `name` | TEXT | Same as wiki page title / entity name |
| `type` | TEXT | Same as wiki page `type` field |
| `metadata` | TEXT (JSON) | Extended attributes from LLM extraction |
| `created_at` | TEXT | Set when wiki page is first created |
| `updated_at` | TEXT | Updated when wiki page is updated |

### relations (existing — spec 001)

LLM-extracted relationships between entities become KG relations.

| Column | Type | Mapping to Extraction Result |
|--------|------|------------------------------|
| `source_id` | INTEGER | Entity ID of the subject |
| `target_id` | INTEGER | Entity ID of the object |
| `type` | TEXT | Relationship predicate from extraction |
| `metadata` | TEXT (JSON) | Additional context from extraction |

---

## LLM Extraction Result (In-Memory Data Structure)

The structured output from the LLM extraction step. Not persisted directly — decomposed into wiki pages, KG entities, and KG relations.

### ExtractionResult

| Field | Type | Description |
|-------|------|-------------|
| `entities` | ExtractedEntity[] | Entities and concepts identified in the text |
| `relations` | ExtractedRelation[] | Relationships between entities |
| `topics` | string[] | Key topics/keywords |
| `summary` | string | One-sentence summary of the source |

### ExtractedEntity

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Canonical entity name (lowercase) |
| `type` | enum | `entity`, `concept`, `topic`, or `comparison` |
| `description` | string | One-paragraph description |
| `attributes` | Record<string, string\|number\|boolean\|null> \| null | Structured attributes |

### ExtractedRelation

| Field | Type | Description |
|-------|------|-------------|
| `source` | string | Subject entity name |
| `predicate` | string | Relationship type (e.g., "is_part_of", "related_to") |
| `target` | string | Object entity name |

---

## Entity Relationship Diagram

```
┌─────────────────────┐
│   Raw Source File    │ ── immutable, created once per ingestion
│   (raw/*.md)         │
└────────┬────────────┘
         │ extracted from
         ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Wiki Page File    │◄───►│   KG Entity (SQLite) │
│   (wiki/{type}/*.md)│     │   entities table      │
│                     │     │   (id = kg_id)         │
│   frontmatter.kg_id ├────►│                       │
└────────┬────────────┘     └────────┬──────────────┘
         │ wikilinks                  │ relations
         ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Other Wiki Pages   │     │  KG Relations        │
│  ([[page-name]])    │     │  (SQLite)            │
└─────────────────────┘     └─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│   wiki/index.md     │     │   wiki/log.md        │
│   (auto-generated)  │     │   (append-only)      │
└─────────────────────┘     └─────────────────────┘
```

## State Transitions

### Wiki Page Lifecycle
- **Created** → New file in `wiki/{type}/`, corresponding KG entity created, index regenerated, log entry appended
- **Updated** → Frontmatter `updated` timestamp set, `sources` list extended, content merged, KG entity updated, index regenerated, log entry appended
- **Name collision** → Disambiguated with type suffix (e.g., `python-concept.md`), all wikilinks use disambiguated name

### Raw Source Lifecycle
- **Created** → Immutable file in `raw/` with provenance frontmatter. Never modified after creation.
- **Duplicate URL** → New raw file created (raw files are immutable per FR-014), extracted info merged into existing wiki pages

### Ingestion Pipeline Flow
1. **Input received** (URL or text)
2. **Fetch/validate** → raw content obtained (or error reported per FR-015)
3. **Archive** → raw source file created in `raw/`
4. **Extract** → LLM called, structured output validated
5. **Create/update pages** → for each extracted entity, create or update wiki page + KG entity
6. **Create/update relations** → for each extracted relation, create KG relation
7. **Regenerate index** → `wiki/index.md` rebuilt
8. **Append log** → entry added to `wiki/log.md`
9. **Report result** → structured result returned (pages created, updated, failed)
