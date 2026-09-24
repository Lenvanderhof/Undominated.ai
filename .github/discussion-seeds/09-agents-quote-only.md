---
title: Agents choosing their own model — should an MCP tool ever do more than quote?
category: ideas
fallback: general
---
From `undominated-check` 0.2.0, `--mcp` exposes two tools to any MCP client: `check_model` and `list_frontier`. Both are **read-only and quote-only**: they return the published verdict with its lens, workload, date and URL, and a failed lookup is an error that says *cannot confirm* — never a fallback figure.

The obvious next tool is `recommend_model`. It is deliberately missing. The project's line is that it is **not a router**: it does not pick a model, hold keys, or sit on the request path.

The failure mode that line guards against: an agent that switches its own model on a public-benchmark verdict, computed under a workload that is not yours, with no human reading the trade it made.

**Where should the line be?** Candidates, from most to least conservative:

1. **Quote only** (today).
2. **Workload-aware quote** — `check_model` takes an input:output ratio and a cache rate.
3. **Constrained lookup** — "cheapest model at or above this quality floor with ≥ 128k context and image input", still returning evidence rather than a decision.
4. **Diff since date** — what changed on the frontier since the verdict you pinned.
5. **Recommend** — pick one.

Which of these would you actually wire into an agent, and which would you refuse to trust? If you would use (5), what would it need to show you before you let it act?
