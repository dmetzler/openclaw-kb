import { z } from 'zod';

/**
 * @typedef {Object} LLMProvider
 * @property {(systemPrompt: string, userPrompt: string) => Promise<string>} complete
 *   Takes a system prompt and user prompt, returns the LLM's text response.
 */

/**
 * Schema for an extracted entity.
 */
export const ExtractedEntitySchema = z.object({
  name: z.string().describe('Canonical entity name, lowercase'),
  type: z.enum(['entity', 'concept', 'topic', 'comparison']).describe('Wiki page type'),
  description: z.string().describe('One-paragraph description'),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .nullable()
    .describe('Structured attributes (role, url, etc.)'),
});

/**
 * Schema for an extracted relation.
 */
export const ExtractedRelationSchema = z.object({
  source: z.string().describe('Subject entity name'),
  predicate: z.string().describe('Relationship type'),
  target: z.string().describe('Object entity name'),
});

/**
 * Schema for the full extraction result.
 */
export const ExtractionResultSchema = z.object({
  entities: z.array(ExtractedEntitySchema),
  relations: z.array(ExtractedRelationSchema),
  topics: z.array(z.string()).describe('Key topics as keywords'),
  summary: z.string().describe('One-sentence summary of the source content'),
});

/** System prompt for LLM extraction. */
const SYSTEM_PROMPT = `You are a knowledge extraction engine. Given a text document, extract structured data.

Return a JSON object with this exact schema:
{
  "entities": [
    {
      "name": "entity name (lowercase)",
      "type": "entity" | "concept" | "topic" | "comparison",
      "description": "One paragraph description",
      "attributes": { "key": "value" } or null
    }
  ],
  "relations": [
    {
      "source": "entity name",
      "predicate": "relationship type (e.g. is_part_of, related_to, uses)",
      "target": "entity name"
    }
  ],
  "topics": ["keyword1", "keyword2"],
  "summary": "One sentence summary of the document"
}

Rules:
- Entity names MUST be lowercase.
- Type MUST be one of: entity, concept, topic, comparison.
- Extract meaningful entities, concepts, and their relationships.
- Return ONLY the JSON object, no other text.`;

/**
 * Sends raw text to the LLM for entity/concept/fact extraction,
 * parses and validates the response.
 *
 * @param {string} text - Raw text content to extract from.
 * @param {LLMProvider} llm - LLM provider instance.
 * @param {Object} [options]
 * @param {number} [options.maxRetries=2] - Max retry attempts on parse/validation failure.
 * @returns {Promise<z.infer<typeof ExtractionResultSchema>>}
 * @throws {Error} If text is empty, LLM provider invalid, or extraction fails after retries.
 */
export async function extract(text, llm, options = {}) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text must be a non-empty string');
  }

  if (!llm || typeof llm.complete !== 'function') {
    throw new Error('LLM provider must have a complete method');
  }

  const maxRetries = options.maxRetries ?? 2;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let userPrompt = `Extract entities, concepts, relationships, topics, and a summary from the following text:\n\n${text}`;

    if (attempt > 0 && lastError) {
      userPrompt += `\n\n[Previous attempt failed: ${lastError}. Please fix and return valid JSON.]`;
    }

    let response;
    try {
      response = await llm.complete(SYSTEM_PROMPT, userPrompt);
    } catch (error) {
      lastError = `LLM call failed: ${error.message}`;
      continue;
    }

    // Parse JSON from response (handle markdown fences and preamble)
    let parsed;
    try {
      parsed = _parseJsonFromResponse(response);
    } catch (error) {
      lastError = `JSON parse failed: ${error.message}`;
      continue;
    }

    // Validate with zod
    const result = ExtractionResultSchema.safeParse(parsed);
    if (!result.success) {
      lastError = `Schema validation failed: ${result.error.message}`;
      continue;
    }

    // Deduplicate entities by normalized name
    const seen = new Map();
    const deduped = [];
    for (const entity of result.data.entities) {
      const key = entity.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, true);
        deduped.push({ ...entity, name: key });
      }
    }

    return { ...result.data, entities: deduped };
  }

  throw new Error(`Extraction failed after ${maxRetries + 1} attempts: ${lastError}`);
}

/**
 * Parses a JSON object from an LLM response, handling markdown fences and preamble.
 * @param {string} response
 * @returns {Object}
 */
function _parseJsonFromResponse(response) {
  let text = response.trim();

  // Handle markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // Try to find JSON object in the response
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    text = text.slice(jsonStart, jsonEnd + 1);
  }

  return JSON.parse(text);
}
