# extractor.mjs — Entity Extraction

The extractor module uses an LLM to identify entities and relations from unstructured text, validating the output against Zod schemas.

**Source:** `src/extractor.mjs` (164 lines)
**Dependencies:** `zod`

---

## Exported Functions

### `extract(text, llmProvider)`

Sends text to an LLM for entity and relation extraction, then validates the response.

```js
import { extract } from './extractor.mjs';

const result = await extract(articleMarkdown, {
  complete: async (system, user) => llmResponse
});
// → { entities: [...], relations: [...] }
```

| Parameter | Type | Description |
|---|---|---|
| `text` | string | Source text to extract entities from |
| `llmProvider` | LLMProvider | Object with `complete(systemPrompt, userPrompt)` method |

**Pipeline:**

1. Constructs a system prompt instructing the LLM to return structured JSON
2. Calls `llmProvider.complete(systemPrompt, text)`
3. Parses the LLM response as JSON
4. Validates against `ExtractionResultSchema` (Zod)
5. Deduplicates entities by normalised name (lowercase + trim)

**Returns:**

```js
{
  entities: [
    { name: 'React', type: 'technology', attributes: { description: '...' } }
  ],
  relations: [
    { source: 'React', target: 'JavaScript', type: 'built_with' }
  ]
}
```

**Throws:**

- `SyntaxError` if LLM response is not valid JSON
- `ZodError` if the parsed JSON does not match the expected schema

---

## Exported Schemas

### `ExtractedEntitySchema`

Zod schema for a single extracted entity.

```js
import { ExtractedEntitySchema } from './extractor.mjs';

ExtractedEntitySchema.parse({
  name: 'React',
  type: 'technology',
  attributes: { category: 'frontend' }
});
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | Yes | Non-empty |
| `type` | string | Yes | Non-empty |
| `attributes` | object | No | Arbitrary key-value pairs |

### `ExtractedRelationSchema`

Zod schema for a single extracted relation.

```js
import { ExtractedRelationSchema } from './extractor.mjs';

ExtractedRelationSchema.parse({
  source: 'React',
  target: 'JavaScript',
  type: 'built_with'
});
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `source` | string | Yes | Non-empty (entity name) |
| `target` | string | Yes | Non-empty (entity name) |
| `type` | string | Yes | Non-empty |

### `ExtractionResultSchema`

Zod schema for the complete extraction result.

```js
import { ExtractionResultSchema } from './extractor.mjs';

ExtractionResultSchema.parse({
  entities: [{ name: 'React', type: 'technology' }],
  relations: [{ source: 'React', target: 'JavaScript', type: 'built_with' }]
});
```

| Field | Type | Description |
|---|---|---|
| `entities` | `ExtractedEntitySchema[]` | Array of extracted entities |
| `relations` | `ExtractedRelationSchema[]` | Array of extracted relations |

---

## Deduplication

After Zod validation, entities are deduplicated by normalised name:

```js
// "React" and "react" → only the first occurrence is kept
const seen = new Set();
entities = entities.filter(e => {
  const key = e.name.toLowerCase().trim();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
```

---

## LLMProvider Interface

```js
/**
 * @typedef {Object} LLMProvider
 * @property {(systemPrompt: string, userPrompt: string) => Promise<string>} complete
 */
```

The provider must return a JSON string from `complete()`. The extractor parses this string into the expected schema.

---

## Related Pages

- [Ingestion Pipeline](../developer-guide/ingestion-pipeline.md) — How extraction fits into the pipeline
- [API: ingest.mjs](ingest.md) — Orchestrates extraction with fetch and persistence
