# Datasets

This repository is the public face of [undominated.ai](https://undominated.ai/). **It does not contain the live catalogue.** A clone of this repo is not a price feed.

Citable dumps live as **GitHub Releases** and on **Hugging Face**. The live board is rebuilt in place; a citation needs bytes that still exist next year.

## Current dump — `catalogue-2026-09-23`

| | |
|---|---|
| GitHub Release | [`catalogue-2026-09-23`](https://github.com/Lenvanderhof/Undominated.ai/releases/tag/catalogue-2026-09-23) |
| Hugging Face | [`LPH98/undominated-ai-model-pricing`](https://huggingface.co/datasets/LPH98/undominated-ai-model-pricing) |
| Live snapshots (hashed) | `https://undominated.ai/data/snapshots/<date>.json` — the current one is named in `citation.json` |
| Citation file | [`CITATION.cff`](../CITATION.cff) |
| What is citable | https://undominated.ai/data/citation.json |

Files in the release:

| File | What it is |
|---|---|
| `models.json` | Nested records, one listing per object. Allowlisted fields only. |
| `models.csv` | Headline columns, flat. |
| `datapackage.json` | Schema, sources, SHA-256 per file, combined `contentHash`. |
| `LICENSE.md` | Terms and required LMArena attribution. |
| `README.md` | Counts computed from the rows actually written. |

## What is in a dump

- Vendor list prices (OpenRouter / first-party pages), with every context-tier rung kept.
- LMArena Elo from the official **CC BY 4.0** Hugging Face dataset, with effort level and confidence interval.
- Provenance: source URL and fetch date on every row.

## What is not

- **Artificial Analysis fields.** Free-tier terms are internal-use-only. The export uses an allowlist, so a new AA field upstream is excluded by default.
- **Model descriptions.** Prose is somebody's copyright in a way a list price is not.
- **`FakeProvider` and `Stealth`.** Not real sellers.

`null` on a quality field means *not stated here*. It is not a score of zero. Some rows are unmeasured; some were measured and the score is withheld because we may not redistribute it. Those two absences are not interchangeable.

## How to cite

Use [`CITATION.cff`](../CITATION.cff). Cite the **dated dump** (release tag + `contentHash`), not a screenshot of the live board and not `catalogue.json` — that file is rebuilt on every deploy and has no date in its path.

## How the dump is built

In the private build tree: `node scripts/build-export.mjs`. The fence is `FIELD_ALLOWLIST` in that file. A denylist of fields we remembered to exclude is how a new AA key would ship.

## Corrections

A wrong figure in a snapshot belongs in the public log, not a silent rewrite of the release: https://undominated.ai/corrections/ · [open an issue](https://github.com/Lenvanderhof/Undominated.ai/issues/new?template=wrong-price.yml).
