# Explore the platform

[Undominated.ai](https://undominated.ai/) is the hosted model-comparison platform. This repository distributes public software and instructions; cloning it does not run the production application or copy its live catalogue.

## Follow a decision

| Question | Tool | Read the result with |
|---|---|---|
| Which models meet my requirements? | [Finder](https://undominated.ai/finder/) · [Compare](https://undominated.ai/compare/) | Recorded capabilities and the selected benchmark; missing measurements stay missing |
| What could this workload cost? | [Calculator](https://undominated.ai/calculator/) · [Bill audit](https://undominated.ai/audit/) | Input/output mix, context tiers and explicitly supported pricing conditions |
| Is a subscription suitable? | [Plans](https://undominated.ai/plans/) | Currency, cadence, vendor-worded limits and verified amounts; a prose quote is not a USD total |
| Does shopping around change the price? | [Providers](https://undominated.ai/providers/) · [Spreads](https://undominated.ai/spreads/) | Distinct sellers, precision and delivery terms; a row is not necessarily a competing company |
| Where can a headline rate change? | [Context cliffs](https://undominated.ai/cliffs/) · [Reasoning price](https://undominated.ai/reasoning-price/) | Every applicable threshold and the unit being charged |
| What does the benchmark support? | [Benchmark guide](https://undominated.ai/benchmarks/) · [Significance](https://undominated.ai/significance/) | Task scope, effort, sample coverage and uncertainty |
| Which resources can I integrate? | [Skills](https://undominated.ai/skills/) · [Agents](https://undominated.ai/agents/) · [MCP servers](https://undominated.ai/mcp-servers/) · [Tools](https://undominated.ai/tools/) | The source review, licence, permissions and installation instructions |

## Provider observations and coverage research

The 2026-10-07 expansion adds **652 dated source quotes**: NanoGPT 612, Chutes 14 and Scaleway 26. These are quote rows, not distinct model weights. Scaleway's standard and batch delivery rows remain separate, in EUR. No currency conversion or benchmark-identity matching is implied.

These observations are kept outside the accepted model-price leaderboard. A provider's model identifier does not establish equivalent weights, context, modalities, precision or service terms. The accepted model/pricing inputs were preserved while adding the research dataset.

- [Provider observations on the page](https://undominated.ai/providers/)
- [Complete quote dataset](https://undominated.ai/data/provider-expansion/catalogue.json)
- [Coverage research](https://undominated.ai/data/provider-expansion/coverage.json)
- [Source boundaries and extraction method](https://undominated.ai/data/provider-expansion/methodology.md)

The coverage dataset uses the accepted catalogue dated 2026-10-06: 348 of 358 standard models have retained offers, with 1,302 endpoint rows across 75 canonical seller owners. Of those endpoint rows, 789 have no recognised precision label. These denominators describe this retained dataset, not the entire inference market. Use the download's date and definitions when citing a count.

The public downloads expose results and methodology. They do not contain the private application's complete extraction/replay toolchain. A downloadable JSON file is not, by itself, a standalone executable research package.

## Published data interfaces

| Endpoint | Contents |
|---|---|
| [`/data/catalogue.json`](https://undominated.ai/data/catalogue.json) | Current published catalogue; allowlisted model facts and provenance |
| [`/data/frontier.json`](https://undominated.ai/data/frontier.json) | Published frontier document; inspect its actual schema before parsing |
| [`/data/resources/skills.json`](https://undominated.ai/data/resources/skills.json) | Reviewed skill index |
| [`/data/resources/agents.json`](https://undominated.ai/data/resources/agents.json) | Reviewed agent-definition index |
| [`/data/resources/mcp-servers.json`](https://undominated.ai/data/resources/mcp-servers.json) | Reviewed MCP-server index |
| [`/data/resources/skills/undominated-evidence-audit.json`](https://undominated.ai/data/resources/skills/undominated-evidence-audit.json) | Example full resource review: selection notes, licence, permissions and untested scope |
| [`/data/citation.json`](https://undominated.ai/data/citation.json) | Citation metadata and dated, hashed citable surfaces |
| [`/llms.txt`](https://undominated.ai/llms.txt) | Agent-facing navigation to the public platform |

Quote the source URL and date alongside a value. Do not treat software licensing as permission to redistribute every field returned by the website. [Evidence boundaries](EVIDENCE.md) · [datasets and citations](../datasets/README.md).

## Dated catalogue snapshot

The following values are generated from the published JSON by `scripts/refresh-readme.mjs`, rather than entered as editorial estimates. As of **<!--fig:asOf-->2026-10-06<!--/fig-->**, the catalogue contains **<!--fig:models-->447<!--/fig--> listings** across **<!--fig:providers-->55<!--/fig--> provider labels**. These are catalogue counts, not the resource-directory counts or canonical seller-owner counts above.

The capability-floor series asks how the cheapest published model clearing a fixed benchmark threshold changed over recorded days. It does not measure the quality of untested models or guarantee suitability for a workload.

<!--floors-->

| Capability floor (LMArena) | 2026-08-24 | 2026-10-06 | Move | Cheapest today |
|:---|---:|---:|---:|:---|
| **≥ 1200** | $0.0525 | $0.036 | -31% | `openai/gpt-oss-20b` |
| **≥ 1350** | $0.0525 | $0.065 | +24% | `openai/gpt-oss-120b` |
| **≥ 1400** | $0.0611 | $0.1125 | +84% | `deepseek/deepseek-v4-flash` |
| **≥ 1450** | $0.4961 | $0.175 | -65% | `xiaomi/mimo-v2.6-flash` |

<sub>Effective $/M on the balanced workload, from 18 dated snapshots. Generated by `scripts/build-floor-table.mjs`. The floors are append-only — a threshold is never edited in place, because a moved goalpost turns a series into marketing.</sub>

<!--/floors-->

The floor table is generated by `scripts/build-floor-table.mjs`. Historical screenshots in `docs/shots/` are dated in their manifest; they are not current price evidence. The older `docs/brand/banner.png` embeds historical numbers and is not used as this repository's current hero.

[Methodology](https://undominated.ai/methodology/) · [Independence](https://undominated.ai/independence/) · [Corrections](https://undominated.ai/corrections/) · [Return to the overview](../README.md)
