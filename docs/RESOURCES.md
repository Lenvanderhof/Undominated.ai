# Original resource library

Choose a resource for a concrete task, read its contract, and check its installation coverage below. These are Undominated-authored instructions and tools. The website's [71 skills](https://undominated.ai/skills/), [72 agents](https://undominated.ai/agents/) and [89 MCP servers](https://undominated.ai/mcp-servers/) are a broader reviewed directory, including third-party projects; counts were checked on 2026-10-07.

## Version and availability map

| Distribution | Original skills | Portable profiles | MCP | Status |
|---|---:|---:|---:|---|
| `undominated-check@0.2.0` | 6 | 4 | 1 bundled server | Published; archive equality, installation and synthetic checks verified |
| `undominated-check@0.3.0` | 11 | 6 | 1 bundled server | Published; later review identified checker correctness defects. Use the six-skill `0.2.0` release while the correction is prepared. |
| `undominated-check@0.3.1` | 11 | 6 | 1 bundled server | Corrected source and local archive verified; npm publication pending |
| `undominated-mcp@0.1.0` | — | — | 1 standalone server | Published; five tools, stdio and live-response checks verified |
| GitHub source | 11 | 6 | 1 server | Source may contain corrections newer than immutable npm releases; inspect the commit you install |
| Website original entries | 6 | 4 | 1 server | Included in the 2026-10-07 website directory release |

The eleven original skills and six profiles are unique directories, not counts of package versions. A separate legacy [`undominated`](../skills/undominated/SKILL.md) skill quotes published model evidence; it has no Python validator and is outside those eleven. Standard Skills CLI discovery includes it.

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

Five later skills expand the source library. Their initial `0.3.0` package is published, but the correctness review in [Evidence](EVIDENCE.md#checker-corrections) bounds their use until the corrective release is verified.

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
| [Comparison editor](../agents/undominated-comparison-editor/AGENT.md) | Make comparison copy match ties, seller identity and preserved capabilities | Added in `0.3.0`; inspect later source corrections |
| [Pricing source reviewer](../agents/undominated-pricing-source-reviewer/AGENT.md) | Check feed units, source currency, exclusions and quote boundaries | Added in `0.3.0` |

## Read-only MCP server

[`undominated-mcp`](../packages/undominated-mcp/README.md) exposes `get_model`, `get_verdict`, `get_frontier`, `search_resources` and `get_resource`. Model and resource data come from the website. The server allowlists returned fields and treats resource text as untrusted evidence. It does not install or execute a resource.

Install the standalone npm server through your client, or export its source and configuration using the Undominated CLI. These are two delivery routes for one server, not two catalogue resources. [MCP setup](GETTING-STARTED.md#mcp-server).

## Suggest an addition

Bring a pinned source, the applicable licence, a distinct use case, required permissions, meaningful checks and explicit untested scope. Popularity alone is not verification. [Contribution requirements](../CONTRIBUTING.md#improve-a-public-resource).
