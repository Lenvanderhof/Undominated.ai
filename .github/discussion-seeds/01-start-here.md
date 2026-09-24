---
title: Start here — what this repository is, and where each kind of post goes
category: announcements
fallback: general
---
**[undominated.ai](https://undominated.ai/) ranks AI models by independently measured quality first and effective price second, and names every model that is both worse and dearer than something else on the same board.** No blended "value score", no affiliate cut, no gateway. Unrated is not zero.

This repository is its public face: the [README](https://github.com/Lenvanderhof/Undominated.ai#readme), the correction tracker, [dated catalogue dumps](https://github.com/Lenvanderhof/Undominated.ai/releases), and three things you can install — the [`undominated-check`](https://www.npmjs.com/package/undominated-check) CLI (also an MCP server from 0.2.0), the warn-only [`dominated-warn`](https://github.com/Lenvanderhof/Undominated.ai/tree/main/actions/dominated-warn) GitHub Action, and a quote-only [agent skill](https://github.com/Lenvanderhof/Undominated.ai/blob/main/skills/undominated/SKILL.md).

### Where to post

| You have | Post it as |
|---|---|
| A live price, score or rank that disagrees with a primary source | an **[issue](https://github.com/Lenvanderhof/Undominated.ai/issues/new?template=wrong-price.yml)** — source URL and date required |
| A question about how a verdict is computed, or how to read `null` | **Q&A** |
| A proposal: a new lens, a workload preset, a field, a tool | **Ideas** |
| The badge, CLI, Action or MCP server in your own project | **Show and tell** |
| Reading, citing or joining a dump | **Dataset** |
| Anything that would let someone alter a ranking | a [private advisory](https://github.com/Lenvanderhof/Undominated.ai/security/advisories/new), never a thread |

### House rules

- A figure comes with its source and the date you checked it. The board moves; a number without a date is an observation, not evidence.
- Unrated is not zero. Missing is not free. Unknown is not a win.
- No scraped catalogues and no Artificial Analysis extracts — we cannot redistribute them and will not host them.

The open threads below are the questions the index has not settled. Disagreement with a source attached is the most useful thing you can post.
