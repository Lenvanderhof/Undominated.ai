---
title: Most of the catalogue has no independent quality score. What should an index do with what it cannot rank?
category: general
---
As generated on **2026-09-23**: **301 of 437** listings (69%) have no independent quality score.

The current rule is strict: an unrated model is listed by price, excluded from quality order, and never assigned a score — not zero, not an estimate, not "probably similar to its sibling". A verdict of `unrated` has its own exit code in the CLI precisely so a CI gate cannot confuse *nobody measured it* with *it lost*.

That rule protects the ranking. It also means the index says nothing useful about most of what is for sale. The options, each with its cost:

| Option | What it buys | What it costs |
|---|---|---|
| Status quo | Every ranked number is traceable | Silent on two thirds of the market |
| Family inference ("same weights, different provider") | Covers resellers of rated models | Quantisation, context caps and serving stacks differ — is it the same model? |
| A second quality source | Real measurements | See the [second-lens thread](https://github.com/Lenvanderhof/Undominated.ai/discussions?discussions_q=%22second+one%22) — licence and independence |
| Community evals | Coverage | Who pays, how to stop gaming, how to publish uncertainty |

**Questions**

- Where is the line between a useful estimate and a number nobody can trace?
- Is "same weights served elsewhere" ever safe to treat as rated? What evidence would you require — a model card, a hash, a provider statement?
- If you rely on an unrated model in production, how did you convince yourself it was good enough?
