---
id: beyond-vector-search-3-tiered-graph-rag-system
type: source
tags:
  - source
  - knowledge
created: '2026-04-15T17:49:51.758Z'
updated: '2026-04-15T17:49:51.758Z'
sources:
  - 2025-04-01-article-graph-rag-3tier.md
confidence: 0.9
related: []
kg_id: 110
---

# Beyond Vector Search: 3-Tiered Graph-RAG System

## Résumé

Article de Machine Learning Mastery proposant une architecture RAG déterministe à 3 niveaux :

- **Tier 1** : QuadStore (SPOC) → faits atomiques vérifiés, priorité absolue
- **Tier 2** : QuadStore secondaire → statistiques agrégées
- **Tier 3** : ChromaDB → documents vectoriels, fallback sémantique

## Innovation

Pas de routage algorithmique : les 3 tiers sont dumpés dans le context window avec des **règles de fusion par prompt** qui forcent le LLM à résoudre les conflits de manière déterministe (T1 > T2 > T3).

## Impact

A directement inspiré l'architecture 3-tier de la KB OpenClaw :
- KG (entities/relations) = T1
- Data Lake (data_records) = T2
- FTS5 + vec0 = T3

## Relations

- [[graph-rag|Graph-RAG]]
- [[quadstore-spoc|QuadStore (SPOC)]]
- [[prompt-enforced-conflict-resolution|Prompt-Enforced Conflict Resolution]]
- [[ner-entity-extraction-bridge|NER Entity Extraction Bridge]]
- [[vector-db-fallback-chromadb|Vector DB Fallback (ChromaDB)]]

## Source originale

- Fichier : [[raw/2025-04-01-article-graph-rag-3tier.md|2025-04-01-article-graph-rag-3tier.md]]

## Mentioned in

```dataview
LIST FROM [[]] AND !"templates"
```
