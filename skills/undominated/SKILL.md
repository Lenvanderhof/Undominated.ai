---
name: undominated
description: Quote published Undominated.ai dominance / frontier JSON. Use when checking whether a model is dominated, listing the frontier, or citing an Undominated verdict. Never invent prices or scores.
---

# Undominated quote-only check

Undominated.ai ranks models by independent capability first, then price. This skill
**quotes** published JSON. It does not recommend a vendor, run inference, or hold keys.

## Do

1. Prefer the published CLI:

```sh
npx undominated-check@0.1.0 <provider/model>
npx undominated-check@0.1.0 --frontier
npx undominated-check@0.1.0 google/gemini-3.7-flash --json
```

In-repo (same behaviour):

```sh
node packages/undominated-check/bin/undominated-check.mjs <provider/model>
node packages/undominated-check/bin/undominated-check.mjs --frontier --local static/data
```

2. Or fetch and print only:

- `https://undominated.ai/data/frontier.json`
- `https://undominated.ai/data/dominance/<slug>.json` where `/` and `:` in the model id become `__`

3. Always include in the answer: **status**, **asOf**, **lens**, and the **provenance URL**.
4. If the model is unrated, unpriced, or the fetch fails: say **cannot confirm**. Exit without guessing.

## Do not

- Invent a price, Elo, rank, or “roughly dominated”
- Blend Artificial Analysis into a public ranking headline
- Treat unrated as zero or as dominated
- Act as a model router or affiliate
- Paraphrase numbers without the URL and as-of date

## Warn-only CI (consumer repos)

```yaml
- uses: Lenvanderhof/Undominated.ai/actions/dominated-warn@v1
  continue-on-error: true
```

Warn, never fail. See `actions/dominated-warn/README.md`.

## Cite a hub figure

Hub pages expose a “Cite this claim” control (plain + BibTeX). Prefer copying that
over rewriting the census by hand.
