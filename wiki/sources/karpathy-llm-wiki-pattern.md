---
id: karpathy-llm-wiki-pattern
type: source
tags:
  - source
  - knowledge
created: '2026-04-15T17:49:51.757Z'
updated: '2026-04-15T17:49:51.757Z'
sources:
  - 2025-04-01-karpathy-llm-wiki.md
confidence: 0.9
related: []
kg_id: 70
---

# Karpathy LLM Wiki Pattern

## Résumé

Pattern proposé par Andrej Karpathy : au lieu de RAG temps réel, le LLM maintient un **wiki compilé** qu'il met à jour incrémentalement à chaque nouvelle source ingérée. Chaque article touche 10-15 pages wiki.

## Points clés

- Le wiki EST la mémoire long-terme du LLM
- Compilé, pas recherché à la volée (contrairement au RAG)
- Le LLM décide quoi garder, quoi mettre à jour, quoi ignorer
- Vérifiable par un humain (c'est du Markdown)
- 18M de vues sur le post original

## Impact

Pattern fondateur de l'architecture openclaw-kb. Étendu par [[llm-wiki-data-layer|Dascalescu (Dual Compiler)]] et [[beyond-vector-search-3-tiered-graph-rag-system|l'architecture 3-tier Graph-RAG]].

## Relations

- [[andrej-karpathy|Andrej Karpathy]]
- [[llm-wiki-data-layer-postgres|LLM Wiki + Data Layer (Postgres)]]
- [[rohit-ghumare|Rohit Ghumare]]

## Source originale

- Fichier : [[raw/2025-04-01-karpathy-llm-wiki.md|2025-04-01-karpathy-llm-wiki.md]]

## Mentioned in

```dataview
LIST FROM [[]] AND !"templates"
```
