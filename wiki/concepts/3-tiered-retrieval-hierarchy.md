---
id: 3-tiered-retrieval-hierarchy
type: concept
tags:
  - concept
created: '2026-04-15T17:38:39.915Z'
updated: '2026-04-15T17:38:39.915Z'
sources:
  - kg-migration
confidence: 0.85
related: []
kg_id: 491
---

# 3 Tiered Retrieval Hierarchy

Priority 1: absolute graph facts (QuadStore SPOC), Priority 2: statistical/historical graph data, Priority 3: vector documents (ChromaDB). Higher priority overrides lower on conflicts.

## Relations

**depends_on**:
- [[prompt-enforced-conflict-resolution|Prompt-Enforced Conflict Resolution]]

**uses**:
- [[graph-rag|Graph-RAG]]

**part_of**:
- [[quadstore-spoc|QuadStore (SPOC)]]
- [[vector-db-fallback-chromadb|Vector DB Fallback (ChromaDB)]]


## Sources

- [[raw/kg-migration|Kg Migration]]

## Mentioned in

```dataview
LIST FROM [[]] AND !"templates"
```
