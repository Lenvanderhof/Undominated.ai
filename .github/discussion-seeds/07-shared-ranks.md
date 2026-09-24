---
title: Shared ranks — honest about uncertainty, or hiding the order people want?
category: general
---
The board refuses to print integer ranks the benchmark cannot support. Models whose scores LMArena's published confidence intervals cannot separate **share a rank**; per the README, roughly half the ranked board collapses into shared positions once the intervals are drawn. The exact rule and the live split are on [Significance](https://undominated.ai/significance/) and [Methodology](https://undominated.ai/methodology/).

Two fair objections pull in opposite directions:

- **"Just give me the order."** A buyer picking one model wants a sequence. A point estimate is still the best single guess, and a shared rank throws information away.
- **"Shared ranks are still too generous."** The intervals describe sampling noise in one arena, not the gap between arena preference and your workload.

And one statistical subtlety: judging differences by whether two 95% intervals *overlap* is conservative — two estimates can differ significantly while their intervals overlap (Schenker & Gentleman, 2001). A pairwise test would split some ties the overlap rule keeps.

**Questions**

- For a purchasing decision, is a conservative tie rule the right default, or should ties be split by pairwise test?
- How should a shared rank be displayed so it is not read as "equal"?
- Would you rather see the probability that A beats B than any rank at all?

<sub>Schenker, N., & Gentleman, J. F. (2001). On judging the significance of differences by examining the overlap between confidence intervals. *The American Statistician, 55*(3), 182–186. https://doi.org/10.1198/000313001317097960</sub>
