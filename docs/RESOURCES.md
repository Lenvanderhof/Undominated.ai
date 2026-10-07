# Original resource library

Choose a resource for a concrete task, read its contract, and check its installation coverage below. These are Undominated-authored instructions and tools. The website's [131 skills](https://undominated.ai/skills/), [101 agents](https://undominated.ai/agents/) and [128 MCP servers](https://undominated.ai/mcp-servers/) are a broader reviewed directory, including third-party projects; counts were checked on 2026-10-07.

## Version and availability map

| Distribution | Original skills | Portable profiles | MCP | Status |
|---|---:|---:|---:|---|
| `undominated-check@0.2.0` | 6 | 4 | 1 bundled server | Published; archive equality, installation and synthetic checks verified |
| `undominated-check@0.3.0` | 11 | 6 | 1 bundled server | Published; later review identified checker correctness defects. Use the corrected `0.3.1` release. |
| `undominated-check@0.3.1` | 11 | 6 | 1 bundled server | Published; archive equality, 18 installations, 11 synthetic checks and 43 boundary and control cases verified |
| `undominated-check@0.4.0` | 11 | 6 | 1 bundled server | Published; exact archive and anonymous installation verified, with native adapters and cross-platform installer checks. [Evidence](EVIDENCE.md#installer-integration--040) |
| `undominated-mcp@0.1.0` | — | — | 1 standalone server | Published; five tools, stdio and live-response checks verified |
| GitHub source | 48 | 11 | 1 server | Eleven skills and six profiles are the npm-mapped set; 37 skills and five profiles are source-only. Pinned acquisition and file equality were freshly verified for the 26 website-listed skills, not every source directory. |
| Website original entries | 26 | 6 | 1 server | Eleven skills, six profiles and the MCP server are in npm 0.4.0; 15 further skills use pinned GitHub installation and complete website downloads |

The npm rows count the version's installation map, not every source directory. A separate legacy [`undominated`](../skills/undominated/SKILL.md) skill quotes published model evidence; it has no Python validator and is outside the 48-validator count.

Fresh Skills CLI 1.7.1 acquisition at corrected source [`a67bd9b`](https://github.com/Lenvanderhof/Undominated.ai/tree/a67bd9b86fca7455ed208403d9ea6f9fe847cd99) copied all **26 website-listed skills**, matched all **159 installed files**, and passed all 26 synthetic examples. The installed copies also passed the six-skill 85-case review, four-skill 213-case review and five-skill 125-case suite. These are distinct bounded suites, not a claim of 423 unique cases or vendor-truth verification. The reviewed source was merged in [PR #8](https://github.com/Lenvanderhof/Undominated.ai/pull/8) with an identical source tree.

Earlier pinned acquisition covered 30 validator skills and the legacy skill at `bf1c18e`; the correction and installation history is retained in [Evidence](EVIDENCE.md). Installation and deterministic fixture behaviour do not establish native host activation or general effectiveness.

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

A profile is a role, workflow and output contract. The default export is portable; `0.4.0` adds explicit [Claude/GitHub native adapters](INSTALLER.md#native-agent-adapters) for the six bundled profiles. These inherit the host's tools, model and permission policy. A source profile alone does not register a native subagent. Load it as instructions or adapt it to your client's agent format. Supply the evidence, workspace and permissions the task requires.

| Profile | Responsibility | CLI availability |
|---|---|---|
| [Evidence reviewer](../agents/undominated-evidence-reviewer/AGENT.md) | Check claims against source records and denominators | `0.2.0` and later |
| [Migration planner](../agents/undominated-migration-planner/AGENT.md) | Map requirements, evaluations and trade-offs for a proposed swap | `0.2.0` and later |
| [Resource curator](../agents/undominated-resource-curator/AGENT.md) | Inspect source, licences, permissions and review limits | `0.2.0` and later |
| [Release verifier](../agents/undominated-release-verifier/AGENT.md) | Separate a passing build from publication and observed use | `0.2.0` and later |
| [Comparison editor](../agents/undominated-comparison-editor/AGENT.md) | Make comparison copy match ties, seller identity and preserved capabilities | Use `0.3.1` for the corrected direction contract |
| [Pricing source reviewer](../agents/undominated-pricing-source-reviewer/AGENT.md) | Check feed units, source currency, exclusions and quote boundaries | Added in `0.3.0` |

## Additional resources outside npm

These 37 skills can be installed from GitHub source with a pinned Skills CLI command; the five profiles are portable instructions for manual loading or adaptation. They are outside the immutable npm bundle through `0.4.0`. All 48 source validator synthetic examples passed on the reviewed source. Fifteen of these source-only skills also belong to the 26-skill website set covered by the fresh `a67bd9b` installation proof above. Other source skills retain the dated, bounded evidence recorded in [Evidence](EVIDENCE.md); meter-scope, hint-versus-handler and spelled-meter remain outside the pinned installation and independent semantic reviews described there. The five extra profiles were not registered as native subagents.

| Resource | Contract | Limit |
|---|---|---|
| [Advertised-route audit](../skills/undominated-advertised-route/SKILL.md) | Refuse a crawl-list URL whose English-only path gained a locale prefix, or whose `?format=md` sibling was never written. | A supplied file list is not a fetch, and a present file is not a claim that its contents are correct. |
| [Cache-tier billing audit](../skills/undominated-cache-tier-billing/SKILL.md) | Split supplied cache reads, writes and uncached input using an explicit replacement or surcharge write-billing basis; below-minimum cached prefixes bill at base input. | One supplied rate set. It does not walk a context-tier ladder or apply batch, off-peak, or subscription rules. |
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
| [Rendered-surface and payload agreement](../skills/undominated-surface-agreement/SKILL.md) | Compare rendered and JSON snapshots field by field; distinguish stated nulls from missing keys. | It does not fetch either surface. |
| [Shared-lastmod audit](../skills/undominated-shared-lastmod/SKILL.md) | Refuse a crawl list where every page is dated on the build day. | One page dated on the build day can be a real change. A shared older day can be the day a record began. |
| [Throughput benchmark audit](../skills/undominated-throughput-benchmark-audit/SKILL.md) | Check that a supplied throughput claim names its concurrency and batch conditions. | It does not run a benchmark. |
| [Unrated sentinel](../skills/undominated-unrated-sentinel/SKILL.md) | Keep a missing score out of a ranked list. | Unrated is not scored zero. |
| [Meter-scope audit](../skills/undominated-meter-scope/SKILL.md) | Refuse a unit claim that borrows an invoice unit from a note that does not name that meter. | It does not fetch a page, convert units, or read amounts. |
| [Hint versus handler](../skills/undominated-hint-vs-handler/SKILL.md) | Refuse a read-only hint when the handler notes you supply include a write, or when those notes are empty. | It does not open a handler or start a server. A pass is not proof the server is read-only. |
| [Spelled-meter audit](../skills/undominated-spelled-meter/SKILL.md) | Refuse a currency or quantity claim whose excerpt does not spell the word. | A dollar sign is not USD, "per 1M" is not million, and the character 元 is not CNY. It does not read amounts. |
| [Single-base audit](../skills/undominated-single-base/SKILL.md) | Refuse a single-base claim when the excerpt names both sides of a cache split or a peak split. | The word peak inside off-peak is not a second side. It does not read amounts. Batch and region are outside this check. |
| [Source-pin audit](../skills/undominated-source-pin/SKILL.md) | Refuse a source identity that is only a branch, a tag, or a short SHA. | A 40-hex revision is the pin. It does not fetch a repository or prove the tree was read. |
| [Slug-is-not-body audit](../skills/undominated-slug-is-not-body/SKILL.md) | Refuse a currency or quantity claim whose words appear only in a URL or a title. | A locator is ignored. A dollar sign is not USD, and "per 1M" is not million. |
| [Multiplier-aside audit](../skills/undominated-multiplier-aside/SKILL.md) | Refuse a base-rate claim when the excerpt names a multiplier. | Negation is not parsed. The number in "2x" is not read as a price. |
| [Indicative-rate audit](../skills/undominated-indicative-rate/SKILL.md) | Refuse a global-rate claim when the excerpt says the figure varies, is a floor, or is a list price beside a credit. | Negation is not parsed. It does not read amounts or pick a country. |
| [Final-host audit](../skills/undominated-final-host/SKILL.md) | Refuse a quote when the final host you recorded is not the host you requested. | `www` is not stripped. It sends no request and does not read a body. |
| [Final-path audit](../skills/undominated-final-path/SKILL.md) | Refuse a page claim when the final path is not the path you requested. | One trailing slash is collapsed. A host is a different checker. It sends no request. |
| [Status-not-page audit](../skills/undominated-status-not-page/SKILL.md) | Check whether a recorded integer status meets the conservative 200-only eligibility rule. | Every result keeps `bodyVerified: false`; status never establishes a body or a quote. It sends no request. |
| [Schema-not-quote audit](../skills/undominated-schema-not-quote/SKILL.md) | Refuse a model-rate claim when the excerpt describes a field or a schema. | Negation is not parsed. It does not read amounts or copy the excerpt. |
| [Header-not-row audit](../skills/undominated-header-not-row/SKILL.md) | Refuse a unit claim borrowed from a display header the row does not state. | The header is ignored. It does not convert units or read amounts. |
| [Crawl auditor](../agents/undominated-crawl-auditor/AGENT.md) | Review a sitemap or `llms.txt` before publication, including locale prefixes and markdown siblings. | Portable instructions. It does not register a native subagent or fetch the live site to replace a missing file. |
| [Eval harness auditor](../agents/undominated-eval-harness-auditor/AGENT.md) | Review an evaluation harness for leaks, judge-prompt skew, and scoring rules you supply. | Portable instructions. It does not register a native subagent. |
| [Population reviewer](../agents/undominated-population-reviewer/AGENT.md) | Review a count, rank, or correlation against the population the sentence names. | Portable instructions. It does not register a native subagent. |
| [Quote identity reviewer](../agents/undominated-quote-identity-reviewer/AGENT.md) | Review a proposed join and refuse any match that is not exact. | Portable instructions. It does not register a native subagent. |
| [Stack cost optimizer](../agents/undominated-stack-cost-optimizer/AGENT.md) | Review a proposed stack change against supplied prices and the requirements that must survive. | Portable instructions. It does not register a native subagent or invent a saving. |

## Five consistency checks added after independent review

These five skills use version `1.0.1` and remain **source-only, outside the immutable 18-resource npm bundle through `0.4.0`**. Their local CLI suite contains 125 boundary and control cases; a separate reviewer exercised 78 cases. All passed. Their pinned Skills CLI acquisition is included in the 26-skill proof above; website inclusion does not expand the npm bundle. [Correction details](EVIDENCE.md#five-consistency-checks-correction-record--2026-10-07).

| Skill | Contract | Limit |
|---|---|---|
| [Serving-mode attribution](../skills/undominated-serving-attribution/SKILL.md) | Compare the explicit claimed score with its named model or serving mode; require mode identity when used | Supplied field consistency does not establish benchmark provenance |
| [Filter invariance](../skills/undominated-filter-invariance/SKILL.md) | Retained IDs preserve their relative order, including an empty result | Does not check scores, numeric ranks or dominance labels |
| [Payback basis](../skills/undominated-payback-basis/SKILL.md) | Compare exact savings-based payback; retain non-terminating results as a rational pair | The caller must establish currency and period alignment |
| [Withdrawal residue](../skills/undominated-withdrawal-residue/SKILL.md) | Require an observed null withdrawn value and null named dependents; zero remains residue | Does not discover missing dependencies or verify a real withdrawal |
| [Alias resolution](../skills/undominated-alias-resolution/SKILL.md) | Require one distinct concrete target with no unresolved, self or conflicting candidates | Candidate completeness and target existence remain caller-supplied evidence |

## Read-only MCP server

[`undominated-mcp`](../packages/undominated-mcp/README.md) exposes `get_model`, `get_verdict`, `get_frontier`, `search_resources` and `get_resource`. Model and resource data come from the website. The server allowlists returned fields and treats resource text as untrusted evidence. It does not install or execute a resource.

Install the standalone npm server through your client, or export its source and configuration using the Undominated CLI. These are two delivery routes for one server, not two catalogue resources. [MCP setup](GETTING-STARTED.md#mcp-server).

## Suggest an addition

Bring a pinned source, the applicable licence, a distinct use case, required permissions, meaningful checks and explicit untested scope. Popularity alone is not verification. [Contribution requirements](../CONTRIBUTING.md#improve-a-public-resource).
