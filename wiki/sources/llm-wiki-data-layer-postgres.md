---
id: llm-wiki-data-layer-postgres
type: source
tags:
  - source
  - knowledge
created: '2026-04-15T17:49:51.761Z'
updated: '2026-04-15T17:49:51.761Z'
sources:
  - 2025-04-01-llm-wiki-data-layer.md
confidence: 0.9
related: []
kg_id: 75
---

# LLM Wiki + Data Layer (Postgres)

## Résumé

Extension du pattern Karpathy par Claudiu Dascalescu : séparer le wiki (texte compilé) du data layer (base de données SQL) pour les données chiffrées.

## Pattern Dual Compiler
- **Compilateur 1** : LLM → wiki Markdown (texte, résumés, synthèses)
- **Compilateur 2** : LLM → SQL (métriques, statistiques, séries temporelles)
- Cross-références entre les deux via des requêtes SQL intégrées dans les pages wiki

## Impact

A influencé l'architecture openclaw-kb : séparation KG (faits) / Data Lake (data_records) / Wiki (pages Markdown).

## Relations

- [[karpathy-llm-wiki-pattern|Karpathy LLM Wiki Pattern]]
- [[karpathy-llm-wiki-pattern|Karpathy LLM Wiki Pattern]]
- [[dual-compiler-wiki-database|Dual Compiler: Wiki + Database]]

## Source originale

- Fichier : [[raw/2025-04-01-llm-wiki-data-layer.md|2025-04-01-llm-wiki-data-layer.md]]

## Mentioned in

```dataview
LIST FROM [[]] AND !"templates"
```
