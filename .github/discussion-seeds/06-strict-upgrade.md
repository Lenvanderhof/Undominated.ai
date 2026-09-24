---
title: When is "better and cheaper" not an upgrade? Help draw the line
category: ideas
fallback: general
---
A model is **dominated** here only when something else scores higher, costs less, *and gives up nothing it can do*. When the cheaper, better-scoring model loses a capability, the verdict is `dominated, with a trade` and the loss is named.

The distinction exists because of a measurement. The CLI's README, as first published on 2026-09-01, reports that on this catalogue **61% of raw "better and cheaper" verdicts** named a replacement that could not do the incumbent's job — half the context window, or no image input. A naive Pareto filter would have recommended all of them. (That share has not been re-measured since; a current figure is a fair thing to ask for.)

Capabilities the check compares today: **context window, maximum output, input modalities, tool use, extended reasoning.**

Candidates that can also break a swap:

- latency and throughput
- rate limits and quotas
- data retention, training use, and region
- structured-output / JSON-mode reliability
- batch API and prompt caching availability
- fine-tuning availability

The rule for anything added is the rule for everything else: **it has to come from a primary source with a date**, or it is not a fact.

**Questions**

1. Which of these has actually blocked a model switch for you?
2. Which can be sourced from a vendor page precisely enough to compare, and which are too vague to publish without inventing a number?
3. Should any of them turn a `dominated` verdict into a trade, or only annotate it?
