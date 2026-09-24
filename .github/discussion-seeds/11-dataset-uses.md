---
title: What would you build on the dated dumps — and which missing field blocks you?
category: dataset
fallback: general
---
Every dump is a dated GitHub Release ([`catalogue-*`](https://github.com/Lenvanderhof/Undominated.ai/releases)) mirrored on [Hugging Face](https://huggingface.co/datasets/LPH98/undominated-ai-model-pricing), with a `datapackage.json` carrying a SHA-256 per file and a combined `contentHash`, so a citation points at bytes that still exist next year.

**In a dump:** vendor list prices with every context-tier rung, time-of-day price windows, LMArena Elo (CC BY 4.0) with effort level and confidence interval, and a source URL plus fetch date on every row.

**Deliberately not in a dump:** Artificial Analysis fields (no redistribution licence; the export is an allowlist, so a new AA field upstream is excluded by default), model descriptions (prose is someone's copyright in a way a list price is not), and non-real sellers.

**Questions**

- What are you using, or planning to use, the dumps for — research on price dynamics, procurement, internal dashboards, teaching?
- Which missing field blocks you? Cache read/write rates, batch discounts, latency, regional prices, deprecation dates?
- Would Parquet (or a DuckDB-ready file) next to the CSV and JSON change anything for you?
- Is a dated snapshot per release the right cadence, or would you rather have one append-only history file?

If you publish something built on a dump, link it here — and cite the release tag and `contentHash`, not a screenshot.
