---
title: The default workload is 3 input tokens per output token. What is yours?
category: general
---
"Effective price" is a price for a *mix*. The published verdicts use the **balanced** workload: three input tokens per output token, no cache. It is a defensible middle, and it is wrong for almost everyone in a specific direction:

- **RAG and long-context Q&A** are input-heavy and often cache-heavy — cheap-input models gain.
- **Agentic coding** re-sends large contexts turn after turn — input-heavy, and cache pricing starts to dominate.
- **Generation and drafting** are output-heavy — models with low output rates gain, and the ordering can flip.

The [check page](https://undominated.ai/check/) lets you pick a workload, and [audit](https://undominated.ai/audit/) computes the mix from a provider usage export in your browser (nothing is uploaded).

**Please post one line:**

```
use case · input:output ratio · cache hit rate (if known) · period measured
```

e.g. `support-bot RAG · 11:1 · 0.6 · 2026-08-01 → 2026-08-31`

With enough of those, two questions become answerable with data instead of opinion:

1. Is 3:1 the right single default, or is it nobody's actual ratio?
2. Should the board ship named presets (chat, RAG, agentic coding, batch generation) — and how many verdicts flip between them?
