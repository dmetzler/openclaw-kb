---
id: prompt-enforced-conflict-resolution
type: concept
tags:
  - concept
created: '2026-04-15T17:38:39.916Z'
updated: '2026-04-15T17:38:39.916Z'
sources:
  - kg-migration
confidence: 0.85
related: []
kg_id: 492
---

# Prompt Enforced Conflict Resolution

Instead of algorithmic routing (like RRF), dump all retrieval results into context with labeled priority blocks and let the LM deterministically resolve conflicts via explicit rules in the system prompt.

## Relations

**depends_on**:
- [[3-tiered-retrieval-hierarchy|3-Tiered Retrieval Hierarchy]]


## Sources

- [[raw/kg-migration|Kg Migration]]

## Mentioned in

```dataview
LIST FROM [[]] AND !"templates"
```
