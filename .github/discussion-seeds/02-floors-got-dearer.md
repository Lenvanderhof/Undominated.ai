---
title: Capability got dearer at two of four quality floors in a month. What is driving it?
category: general
---
"Inference keeps getting cheaper" is the consensus. The one series here built to test it says: *not everywhere*.

The README tracks the cheapest model that clears a fixed LMArena bar, on the balanced workload, across dated snapshots. The floors are append-only — a threshold is never moved. As generated on **2026-09-23** from 14 snapshots (2026-08-24 → 2026-09-23):

| Floor | 2026-08-24 | 2026-09-23 | Move |
|:---|---:|---:|---:|
| ≥ 1200 | $0.0525 | $0.036 | −31% |
| ≥ 1350 | $0.0525 | $0.0844 | **+61%** |
| ≥ 1400 | $0.0611 | $0.1031 | **+69%** |
| ≥ 1450 | $0.4961 | $0.2375 | −52% |

<sub>Effective $/M. Frozen at 2026-09-23; the [live table](https://github.com/Lenvanderhof/Undominated.ai#is-capability-actually-getting-cheaper) regenerates, and every point traces to a hashed snapshot listed in [`citation.json`](https://undominated.ai/data/citation.json).</sub>

The two middle floors got dearer over a month in which the lowest and highest got cheaper. Competing explanations, each of which predicts something different:

1. **Repricing.** A cheap SKU's list price rose (launch promo ended, provider changed). → The same model stays cheapest, at a higher price.
2. **Re-rating.** The cheapest clearer's Elo drifted under the bar as the arena re-estimated, and the next-cheapest took over. → The cheapest model changes; neither price moved.
3. **Delisting.** The cheap route disappeared from every provider. → The model vanishes from the catalogue.
4. **Entry at the top, not the middle.** New releases landed at ≥ 1450 and at the budget end; nothing new and cheap landed in between.

**Questions**

- Which of these does the snapshot history actually show for ≥ 1350 and ≥ 1400? (The dumps are public — a diff is a better answer than a theory.)
- Do your own bills show the middle tier getting dearer?
- Is a month long enough to call a direction, or should the table refuse to show a move until N snapshots exist?
