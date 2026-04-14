# Knowledge Base Priority Resolution Rules

Use these rules when reasoning about search results from the three-tier knowledge base. Apply them to resolve conflicts, weight evidence, and guide responses.

---

## Tier Hierarchy

### Tier 1 — Knowledge Graph (Highest Priority)

- **Contains**: Verified entities (people, organisations, concepts, technologies) and their explicit relationships.
- **Strengths**: Structured, curated, fact-based. Relationships are explicit and directional.
- **Limitations**: Coverage may be incomplete. Only entities that have been explicitly added are present.
- **Trust level**: Treat as ground truth. Prefer Tier 1 facts over any conflicting information from lower tiers.

### Tier 2 — Data Lake (Medium Priority)

- **Contains**: Structured data records with timestamps — metrics, measurements, logs, observations.
- **Strengths**: Time-series context, quantitative data, objective measurements.
- **Limitations**: Records are raw data; they describe *what happened*, not *what it means*. May contain outdated entries.
- **Trust level**: Use as supporting evidence. When Tier 2 data conflicts with Tier 1 entities, prefer Tier 1.

### Tier 3 — Semantic Index (Lowest Priority)

- **Contains**: Full-text and vector-similarity matches across all indexed content.
- **Strengths**: Broadest coverage, captures contextual and semantic relevance, surfaces loosely related information.
- **Limitations**: Results are relevance-ranked, not fact-checked. May surface tangentially related content.
- **Trust level**: Use for context and discovery. Never prefer Tier 3 over Tier 1 or Tier 2 when facts conflict.

---

## Conflict Resolution

When information from multiple tiers conflicts:

1. **Tier 1 wins over Tier 2 and Tier 3.** Knowledge graph entities are the authoritative source for facts about entities and their relationships.
2. **Tier 2 wins over Tier 3.** Structured data records with timestamps are more reliable than semantic text matches.
3. **Flag the conflict.** When you detect a conflict across tiers, explicitly note it in your response: "Note: the knowledge graph states X, but a data record from [date] shows Y."
4. **Prefer recency within the same tier.** When multiple results from the same tier conflict, prefer the most recently updated entry.

---

## Result Interpretation

- **Score**: A 0–1 relevance score. Higher = more relevant. Scores are comparable within a tier but not directly across tiers (a Tier 3 score of 0.9 does not outrank a Tier 1 score of 0.6).
- **Deduplication**: Results are deduplicated across tiers. If the same entity appears in multiple tiers, only the highest-priority tier's result is shown.
- **Metadata**: Each result includes tier-specific metadata (entity type, depth, record type, FTS/vector scores) — use these to assess confidence.

---

## Usage Guidelines

- Start with Tier 1 results for factual answers about entities and relationships.
- Use Tier 2 results for data-driven answers involving measurements, trends, or time-series.
- Use Tier 3 results for broad context, related topics, and discovery of loosely connected information.
- When no Tier 1 or Tier 2 results exist, Tier 3 results are acceptable as the primary source — but note the lower confidence level.