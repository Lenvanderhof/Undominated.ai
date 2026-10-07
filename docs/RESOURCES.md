# Original resource library

Choose a resource for a concrete task, read its contract, and check its installation coverage below. These are Undominated-authored instructions and tools. The website's [71 skills](https://undominated.ai/skills/), [72 agents](https://undominated.ai/agents/) and [89 MCP servers](https://undominated.ai/mcp-servers/) are a broader reviewed directory, including third-party projects; counts were checked on 2026-10-07.

## Version and availability map

| Distribution | Original skills | Portable profiles | MCP | Status |
|---|---:|---:|---:|---|
| `undominated-check@0.2.0` | 6 | 4 | 1 bundled server | Published; archive equality, installation and synthetic checks verified |
| `undominated-check@0.3.0` | 11 | 6 | 1 bundled server | Published; later review identified checker correctness defects. Use the corrected `0.3.1` release. |
| `undominated-check@0.3.1` | 11 | 6 | 1 bundled server | Published; archive equality, 18 installations, 11 synthetic checks and 43 boundary and control cases verified |
| `undominated-mcp@0.1.0` | — | — | 1 standalone server | Published; five tools, stdio and live-response checks verified |
| GitHub source | 30 | 11 | 1 server | Eleven skills and six profiles are the npm-mapped set. Nineteen skills and five profiles are source-only: local synthetic examples passed on 2026-10-07, and no Skills CLI install or npm bundle has been verified for them. |
| Website original entries | 6 | 4 | 1 server | Included in the 2026-10-07 website directory release |

The npm rows count the installation map, not every directory. Nineteen further skills and five further profiles are source-only and are listed below. A separate legacy [`undominated`](../skills/undominated/SKILL.md) skill quotes published model evidence; it has no Python validator and is outside both groups. Skills CLI discovery of this repository can see the legacy skill and the source-only directories. That discovery was not executed.

A website review is not proof that a third-party resource is bundled here. `resources list` is the authority for a specific installed CLI version. [Installation guide](GETTING-STARTED.md) · [release verification and limits](EVIDENCE.md).

## Skills

The first six are available in `undominated-check@0.2.0`. Each contains `SKILL.md`, an MIT licence, `scripts/check.py` and synthetic examples. Read the full input contract before running the check on your evidence.

| Skill | Use it when | Its limit |
|---|---|---|
| [Evidence audit](../skills/undominated-evidence-audit/SKILL.md) | A numeric claim needs source identity, denominator and arithmetic checks | Supplied local evidence is not an independently verified live source |
| [Migration preflight](../skills/undominated-migration-preflight/SKILL.md) | A proposed model swap must retain recorded requirements and evaluation coverage | Checks only the requirements and evaluations you provide |
| [Provider quote comparison](../skills/undominated-provider-quote-compare/SKILL.md) | You have explicit workload inputs and complete provider tier ladders | Unlisted cache, reasoning, taxes and fees are not invented |
| [Benchmark audit](../skills/undominated-benchmark-audit/SKILL.md) | Two benchmark columns need matched-cohort and missing-score checks | Descriptive correlation is not causal evidence or a population-wide result |
| [Resource audit](../skills/undominated-resource-audit/SKILL.md) | A skill, agent or MCP server needs provenance and permission review | Completeness checks do not certify security |
| [Release proof](../skills/undominated-release-proof/SKILL.md) | A release needs artifact hashes and meaningful response receipts | Offline receipts are not independently observed runtime behaviour |

Five later skills expand the source library. Use **`0.3.1`** for these skills: its corrective source, published archive and installed adverse cases are verified. [Evidence](EVIDENCE.md#checker-corrections) records the defects in their earlier `0.3.0` package.

| Skill | Check |
|---|---|
| [Seller spread](../skills/undominated-seller-spread/SKILL.md) | Distinct seller owners rather than one owner's service tiers; no claim of endpoint equivalence |
| [Dominance wording](../skills/undominated-dominance-wording/SKILL.md) | Score/cost ties, direction of comparison and recorded capability requirements |
| [Plan quote](../skills/undominated-plan-quote/SKILL.md) | Explicit verified USD amounts versus unverified source prose |
| [Licence boundary](../skills/undominated-licence-boundary/SKILL.md) | Consistency of recorded permission evidence; no automatic legal interpretation |
| [Context tier](../skills/undominated-context-tier/SKILL.md) | Every whole-request tier boundary and its base-relative multiple |

## Portable agent profiles

A profile is a role, workflow and output contract. It does not register a native subagent, select a model or grant tools. Load it as instructions or adapt it to your client's agent format. Supply the evidence, workspace and permissions the task requires.

| Profile | Responsibility | CLI availability |
|---|---|---|
| [Evidence reviewer](../agents/undominated-evidence-reviewer/AGENT.md) | Check claims against source records and denominators | `0.2.0` and later |
| [Migration planner](../agents/undominated-migration-planner/AGENT.md) | Map requirements, evaluations and trade-offs for a proposed swap | `0.2.0` and later |
| [Resource curator](../agents/undominated-resource-curator/AGENT.md) | Inspect source, licences, permissions and review limits | `0.2.0` and later |
| [Release verifier](../agents/undominated-release-verifier/AGENT.md) | Separate a passing build from publication and observed use | `0.2.0` and later |
| [Comparison editor](../agents/undominated-comparison-editor/AGENT.md) | Make comparison copy match ties, seller identity and preserved capabilities | Use `0.3.1` for the corrected direction contract |
| [Pricing source reviewer](../agents/undominated-pricing-source-reviewer/AGENT.md) | Check feed units, source currency, exclusions and quote boundaries | Added in `0.3.0` |

## Source-only additions

These directories are in this repository so a later pinned install can name them. They are not in `undominated-check@0.2.0`, `@0.3.0`, or `@0.3.1`. On 2026-10-07 each skill's `examples/synthetic.json` was run with its own `scripts/check.py` and exited 0. Those inputs are synthetic. A passing check is not a vendor quote and is not an install receipt. The Skills CLI was not run. The five profiles were not registered as native subagents.

| Resource | Contract | Limit |
|---|---|---|
| [Advertised-route audit](../skills/undominated-advertised-route/SKILL.md) | Refuse a crawl-list URL whose English-only path gained a locale prefix, or whose `?format=md` sibling was never written. | A supplied file list is not a fetch, and a present file is not a claim that its contents are correct. |
| [Currency isolation audit](../skills/undominated-currency-isolate/SKILL.md) | Refuse to add, average, or rank amounts whose currencies differ. | It does not convert currencies or fetch an exchange rate. |
| [Decimal determinism audit](../skills/undominated-decimal-determinism/SKILL.md) | Require a published rate, a computed bill, and a displayed figure to agree as decimals. | It does not fetch vendor prices. |
| [Eval contamination and judge audit](../skills/undominated-eval-contamination-audit/SKILL.md) | Check supplied evaluation text for overlap and judge-prompt skew. | It does not crawl an external corpus. |
| [Upstream freshness budget](../skills/undominated-freshness-budget/SKILL.md) | Compare each supplied fetch time and content hash with that source's declared staleness budget. | It does not fetch or refresh the source. |
| [Identity dedup audit](../skills/undominated-identity-dedup/SKILL.md) | Collapse duplicate identities inside one supplied population before a count. | It does not resolve upstream aliases. |
| [Population denominator](../skills/undominated-population-denominator/SKILL.md) | Require the stated population, the computed population, and the claimed count to be the same set. | It does not compute a correlation, a price, or a rank. |
| [Precision prompt cost estimator](../skills/undominated-prompt-cost-estimator/SKILL.md) | Add supplied token counts and a supplied price ladder, including cache and reasoning rows when they are present. | It does not invent a missing discount. |
| [Quantisation label](../skills/undominated-quantisation-label/SKILL.md) | Keep an unknown quantisation labelled unknown. | It does not inspect weights or treat float16 and fp16 as the same label. |
| [Quote-join audit](../skills/undominated-quote-join/SKILL.md) | Join a vendor quote to a catalogue model only when the provider and the model id match exactly. | A case fold is not an identity, and a join is not a price or quality claim. |
| [Review-gate ratchet](../skills/undominated-ratchet-gate/SKILL.md) | Check that a review gate moved stricter and not looser. | It does not edit the gate or run it. |
| [Rate-unit audit](../skills/undominated-rate-unit/SKILL.md) | Refuse a token-price conversion until the currency and the unit are both explicit. | It does not guess that M means million. A scaled figure is not a new vendor quote. |
| [Read-only claim audit](../skills/undominated-readonly-claim/SKILL.md) | Reject a read-only label when a listed tool name contains a mutation token. | A passing name list is not proof the handlers are read-only. |
| [Context-rung selection](../skills/undominated-rung-select/SKILL.md) | Select the context-tier rung that contains a request's input length. | It does not model marginal block pricing or fetch vendor rates. |
| [Cache-tier billing audit](../skills/undominated-cache-tier-billing/SKILL.md) | Bill a qualifying cached prefix at the cache-read rate. A prefix below the stated minimum bills at the base input rate. | One supplied rate set. It does not walk a context-tier ladder or apply batch, off-peak, or subscription rules. |
| [Rendered-surface and payload agreement](../skills/undominated-surface-agreement/SKILL.md) | Compare a rendered snapshot and a JSON snapshot field by field. A stated null and a missing key are different findings. | It does not fetch either surface. |
| [Shared-lastmod audit](../skills/undominated-shared-lastmod/SKILL.md) | Refuse a crawl list where every page is dated on the build day. | One page dated on the build day can be a real change. A shared older day can be the day a record began. |
| [Throughput benchmark audit](../skills/undominated-throughput-benchmark-audit/SKILL.md) | Check that a supplied throughput claim names its concurrency and batch conditions. | It does not run a benchmark. |
| [Unrated sentinel](../skills/undominated-unrated-sentinel/SKILL.md) | Keep a missing score out of a ranked list. | Unrated is not scored zero. |
| [Crawl auditor](../agents/undominated-crawl-auditor/AGENT.md) | Review a sitemap or `llms.txt` before publication, including locale prefixes and markdown siblings. | Portable instructions. It does not register a native subagent or fetch the live site to replace a missing file. |
| [Eval harness auditor](../agents/undominated-eval-harness-auditor/AGENT.md) | Review an evaluation harness for leaks, judge-prompt skew, and scoring rules you supply. | Portable instructions. It does not register a native subagent. |
| [Population reviewer](../agents/undominated-population-reviewer/AGENT.md) | Review a count, rank, or correlation against the population the sentence names. | Portable instructions. It does not register a native subagent. |
| [Quote identity reviewer](../agents/undominated-quote-identity-reviewer/AGENT.md) | Review a proposed join and refuse any match that is not exact. | Portable instructions. It does not register a native subagent. |
| [Stack cost optimizer](../agents/undominated-stack-cost-optimizer/AGENT.md) | Review a proposed stack change against supplied prices and the requirements that must survive. | Portable instructions. It does not register a native subagent or invent a saving. |

## Read-only MCP server

[`undominated-mcp`](../packages/undominated-mcp/README.md) exposes `get_model`, `get_verdict`, `get_frontier`, `search_resources` and `get_resource`. Model and resource data come from the website. The server allowlists returned fields and treats resource text as untrusted evidence. It does not install or execute a resource.

Install the standalone npm server through your client, or export its source and configuration using the Undominated CLI. These are two delivery routes for one server, not two catalogue resources. [MCP setup](GETTING-STARTED.md#mcp-server).

## Suggest an addition

Bring a pinned source, the applicable licence, a distinct use case, required permissions, meaningful checks and explicit untested scope. Popularity alone is not verification. [Contribution requirements](../CONTRIBUTING.md#improve-a-public-resource).
