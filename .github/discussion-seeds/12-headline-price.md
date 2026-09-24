---
title: What else does a headline $/M hide? Context cliffs, time windows, cache, batch
category: ideas
fallback: general
---
The headline input/output rate is where most comparisons stop. It is not the price you pay once real traffic hits real pricing rules.

What the board handles today, as stated in the README and dump notes:

- **Context cliffs.** As generated on **2026-09-23**, **69 models** change rate past a context threshold. The board reprices the row when your prompt crosses it ([Cliffs](https://undominated.ai/cliffs/)).
- **Time-of-day windows.** Dumps carry the price windows some providers publish.
- **Price spread.** The dearest input rate in the catalogue is about **8,824×** the cheapest (2026-09-23) — which is why a single blended "value" number hides so much.

Mechanics that can still move a bill away from the headline rate:

- prompt-cache reads and writes, and cache lifetime;
- batch / asynchronous discounts;
- reasoning tokens billed as output;
- minimum billing increments and per-request fees;
- different rates for the same model at different providers ([Spreads](https://undominated.ai/spreads/)).

**Questions**

1. Which of these has made your real cost diverge most from the listed rate?
2. Which can be modelled from a primary source precisely enough to publish — and which would require guessing a usage pattern?
3. Should "effective price" stay one workload-weighted number, or become a small vector (input, output, cached input) the reader weights?
