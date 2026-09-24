---
title: Show us where the verdict lives in your stack — badge, CLI, Action or MCP
category: show-and-tell
fallback: general
---
If you have wired a dominance verdict into something real, post it here: a link, a screenshot, and — most useful of all — **what it caught**.

**README badge** (states one model's verdict and the date it was computed):

```markdown
[![anthropic/claude-fable-5.1](https://undominated.ai/badge/anthropic__claude-fable-5.1.svg)](https://undominated.ai/models/anthropic__claude-fable-5.1/)
```

**CLI** (read-only, no key, warn-never-fail):

```sh
npx --yes undominated-check google/gemini-3.7-flash
```

**GitHub Action** (comments on a PR when a declared model is strictly dominated; never fails the job):

```yaml
- uses: Lenvanderhof/Undominated.ai/actions/dominated-warn@v1
  continue-on-error: true
```

**MCP server** (from `undominated-check` 0.2.0 — `check_model` and `list_frontier`, both read-only):

```sh
claude mcp add undominated -- npx -y undominated-check --mcp
```

Good posts answer: what did you pin, what did the verdict say, and did you switch?
