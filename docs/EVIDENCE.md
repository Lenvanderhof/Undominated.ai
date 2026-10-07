# Evidence, licences and release state

A source file, a passing example, a public package and an observed installation prove different things. This page keeps those boundaries explicit. Observations below were checked on 2026-10-07.

## What has been verified

| Artifact | Verification scope |
|---|---|
| Original six-skill source release, [`f730988`](https://github.com/Lenvanderhof/Undominated.ai/tree/f730988d8c55fb7bd134da8c03ffbcf33a8b6738) | Standard Skills CLI discovery and named installation; installed bytes matched source; six synthetic checks passed |
| [`undominated-check@0.2.0`](https://registry.npmjs.org/undominated-check/0.2.0) | Downloaded archive matched the tested candidate; clean consumers listed resources and installed a skill, a profile and the bundled MCP server |
| [`undominated-check@0.3.0`](https://registry.npmjs.org/undominated-check/0.3.0) | Archive identity and expanded source/installation checks verified; later adverse cases found correctness defects in added checkers, described below |
| [`undominated-check@0.3.1`](https://registry.npmjs.org/undominated-check/0.3.1) | Anonymous registry archive matched the candidate; clean npx, 18 installed resources, 69 file hashes, 11 synthetic checks, 43 boundary and control cases with structured results, exported MCP tools and live plain-text frontier verified |
| [`undominated-check@0.4.0`](https://registry.npmjs.org/undominated-check/0.4.0) | Exact registry archive matched; fresh anonymous npx and all 18 installs, 69 hashes, eleven skill checks, 43 checker boundary/control cases, both native adapters and five MCP tools passed |
| [`undominated-mcp@0.1.0`](https://registry.npmjs.org/undominated-mcp/0.1.0) | Archive matched the tested candidate; clean-cache installation, stdio initialization, five tool definitions and a live frontier response verified |
| Corrected GitHub skills at [`bf1c18e`](https://github.com/Lenvanderhof/Undominated.ai/tree/bf1c18ed2468d1015c727909806937b4aeb60412) | Skills CLI 1.7.1 discovered and copied 31 directories (30 validators plus the legacy skill); all 139 installed files matched source; all 30 installed synthetic examples passed |
| Website skill source at [`a67bd9b`](https://github.com/Lenvanderhof/Undominated.ai/tree/a67bd9b86fca7455ed208403d9ea6f9fe847cd99) | Fresh Skills CLI 1.7.1 acquisition of 26 skills; all 159 files matched, 26 synthetic examples passed, and installed six/four/five suites passed 85/213/125 cases respectively |
| Website resource directories | Published indexes contain 131 skills, 101 agents and 128 MCP servers; these include third-party entries and are separate from CLI bundles |

For a registry release, these SHA-256 values identify the downloaded `.tgz` bytes, not an uncompressed directory:

| Package | Archive SHA-256 |
|---|---|
| `undominated-check@0.2.0` | `974509ea1fdbf08c32c391596169dd61991df9e978d2c7e53f9f5c15e6af3f06` |
| `undominated-check@0.3.0` | `05f17f7578b02309b60b12d97b6a42fe82345731ed5b8ee85e5330657022741e` |
| `undominated-check@0.3.1` | `a4550da5d0e5749b62217a96659f0d8ab91b1ab0a656e1cecd7115a983fe940b` |
| `undominated-check@0.4.0` | `260ab6679d4068f0e9ea01c6890b09eedad13b5097eb38dc2389c8b784e9a49b` |
| `undominated-mcp@0.1.0` | `d4783712da445075026883811b238de7485fe7a101e6a95a3853a1f6974a0c46` |

```sh
npm view undominated-check@0.4.0 version dist.tarball dist.integrity
npm view undominated-mcp@0.1.0 version dist.tarball dist.integrity
```

The older bundled `status: local-tested-unreleased` field is retained build-time metadata, not an npm registry query. It does not override the verified registry publication above. `0.3.1` uses `fixture-tested` to describe validation scope without implying publication. Published versions are immutable; source changes require a new package version. A version on npm does not establish marketplace listing, broad host compatibility or production performance.

## Website agent-work releases — 2026-10-07

The website directory grew from 232 to **360 resources**: [131 skills](https://undominated.ai/skills/), [101 agents](https://undominated.ai/agents/) and [128 MCP servers](https://undominated.ai/mcp-servers/). The reviewed additions total 128 entries while retaining every existing resource ID. The website's original collection is 26 skills, six profiles and one MCP server; the npm bundle remains 18 resources.

The first review batch added 51 upstream resources and seven already published originals. All 112 cited primary URLs were retrieved, and all 15 newly downloadable third-party agent definitions and licences matched their pinned source bytes. Further review added 21 upstream skills, 11 downloadable agent profiles, 20 MCP entries and six corrected original skills. The 11 further profile/licence pairs matched upstream bytes; canonical repository paths and service endpoints were checked for duplicate listings. Permission and setup reviews corrected understated write access, missing service prerequisites and an invalid launcher command. Seven external candidates with material source-quality defects were excluded. The final additions comprise the four corrected source checks, five consistency checks and three further external resources; each retains its own source and validation scope.

All **179 files** for the website's **32 skill/profile source directories and MCP artifact** match the pinned public source [`a67bd9b`](https://github.com/Lenvanderhof/Undominated.ai/tree/a67bd9b86fca7455ed208403d9ea6f9fe847cd99). Fresh Skills CLI acquisition copied its 26 website-listed skills into an isolated project: all 159 installed files matched, and all 26 synthetic examples passed. The installed six-skill, four-skill and five-skill suites passed 85, 213 and 125 cases respectively. These suites have different scopes and may overlap; their totals are not a count of unique test inputs.

Source review and installation checks do not establish external service runtime, authentication success or general effectiveness. Each resource retains its prerequisites and untested scope. Drafts with failed boundary cases and pricing-source acquisitions that lack deterministic rate extraction remain outside these releases.

The public [skills index](https://undominated.ai/data/resources/skills.json), [agents index](https://undominated.ai/data/resources/agents.json) and [MCP index](https://undominated.ai/data/resources/mcp-servers.json) expose the reviewed website entries separately from the npm installation map.

## Installer integration — 0.4.0

The installer work preserved in [PR #5](https://github.com/Lenvanderhof/Undominated.ai/pull/5) was integrated onto the corrected public source. The draft's unquoted MCP command split paths containing spaces and could interpret shell metacharacters. A harmless local command-capture reproduction demonstrated both failures. The corrected helpers preserve executable/argument identity in labelled shell commands and structured JSON, reject client interpolation syntax, validate targets by resource kind and keep the previous default profile destination.

Explicit Claude/GitHub profile targets now create native adapters while retaining the original licensed files. All six adapters were discovered by actual Claude Code and Copilot clients; all eleven skills were discovered by Claude Code, Codex and Copilot. These checks used isolated configuration and no model turns. See [exact versions and verification limits](INSTALLER.md#compatibility-evidence).

The initial release candidate passed 71 CLI tests, 32 MCP tests, 22 public Action tests, 74 source boundary/control cases and 32 source synthetic examples. A separate independent installer suite passes 71 targeted cases, including hostile paths, malformed flags, hash mismatches, symlinks, overwrite refusal, adapter collisions, existing configuration preservation and exported MCP initialization. The 69 bundled source files match the verified `0.3.1` release. The [cross-platform workflow](https://github.com/Lenvanderhof/Undominated.ai/actions/runs/37680109407) passed actual Linux, macOS and Windows installation, including PowerShell argument parsing. The npm upload was independently confirmed from a fresh anonymous consumer: the registry archive SHA-256 is `260ab6679d4068f0e9ea01c6890b09eedad13b5097eb38dc2389c8b784e9a49b`, identical to the reviewed candidate. All 18 resources installed, 69 source hashes matched, eleven installed synthetic examples and 43 checker boundary/control cases passed, both native adapters were generated, and the exported MCP server exposed five tools. The new alias, equals-form flags, dry-run and live plain-text frontier were also exercised from the registry installation. A subsequent concurrent spelled-meter source-only contribution was preserved: the combined source passes 79 boundary/control cases and 33 synthetic examples. That contribution remains outside the npm bundle and the pinned independent source installation proof.

## Checker corrections

Adverse review after `0.3.0` publication identified cases where supplied inputs could be accepted too favourably: a redistribution denial was labelled as internal-use permission; reverse dominance did not establish capability preservation in the reverse direction; an omitted final tier cap could stand in for an explicit unbounded cap; Decimal-context rounding could hide a mismatch in high-precision plan totals; and rounded repeating ratios could be mistaken for exact equality in spread or tier claims.

Corrective source for `0.3.1` now rejects those cases. It separates internal-use evidence, checks capability preservation in the proposed replacement direction, requires an explicit final tier cap and uses exact arithmetic for totals and equality. Independent adverse cases and the expanded source tests passed. The published `0.3.1` archive and an anonymous clean installation also passed those checks. The `0.4.0` installer retains those corrected eleven skills, six profiles and the bundled MCP server unchanged. The website now includes all eleven corrected npm skill resources and six profiles, plus 15 separately verified GitHub skills. Its commands distinguish the immutable npm bundle from source-only additions. Do not use a `0.3.0` pass from an affected checker as approval to publish, republish data or change providers.

The licence checker is a consistency check over a permission record you supply. It does not interpret a licence, verify your reading of it or grant rights. Seller-spread checks group the owners you supply and do not establish equivalent endpoint service. Context-tier checks require the complete supplied whole-request ladder; they do not discover omitted provider terms.

## Repository checks

The public resource workflow runs the standalone CLI, MCP and public GitHub Action suites. At the `0.3.1` review, all **54 CLI tests**, **32 MCP tests** and **22 Action tests** passed, including installer boundaries, adverse checker cases, MCP price provenance and warn-only Action behaviour. The later `0.4.0` installer and merged source checks are recorded separately above and below.

The legacy Action suite initially failed because one assertion read `.github/workflows/launch-verdicts.yml`, a private workflow absent from this public repository. That private-repository assertion was removed from the public suite; all 22 public Action assertions were preserved. No production workflow or Action runtime was copied or changed.

The separately published [source-only batch](https://github.com/Lenvanderhof/Undominated.ai/commit/8087a25ac453a717a3a8aabce9b2987f6b2b1b2d) adds 17 skill directories and four portable profiles. Their MIT licence files are present, and all 17 supplied synthetic examples independently returned structured passes. The source workflow runs every validator skill example, including later additions. A separate Skills CLI 1.7.1 check at that exact source revision discovered and copied all 29 repository skills (28 validators plus the legacy quote-only skill), matched 125 installed files and passed all 28 installed synthetic examples. That verifies acquisition and fixture behaviour at `8087a25`. Subsequent source-only corrections and their boundary tests are recorded below; the original install receipt does not by itself verify those newer bytes. It is outside the 18-resource npm bundle and the website's original-resource release.

A later source-only commit, [`c47ac12`](https://github.com/Lenvanderhof/Undominated.ai/commit/c47ac12cb8f173aefbdee752f8e8c40b190df8ee), adds advertised-route and shared-lastmod checks plus a crawl-auditor profile. That brought the source library to 30 validator skills and 11 portable profiles, plus the legacy quote-only skill and the MCP server. These additions remain outside the npm installation map. The earlier Skills CLI receipt does not cover the two new skill directories. A subsequent clean Skills CLI 1.7.1 installation at corrected source [`bf1c18e`](https://github.com/Lenvanderhof/Undominated.ai/tree/bf1c18ed2468d1015c727909806937b4aeb60412) covered all 31 skill directories, matched all 139 installed files to that revision, and passed all 30 installed synthetic examples. This newer receipt supersedes the earlier acquisition-only coverage gap while retaining the correction history.

Subsequent source-only additions, [`meter-scope`](https://github.com/Lenvanderhof/Undominated.ai/commit/60f14150d8c3301d7a62e760bd1d60b503d0b9be) and [`hint-versus-handler`](https://github.com/Lenvanderhof/Undominated.ai/commit/51d4df079ebfa21a5e2dfa1c30c818522b1a6010), bring the source inventory to 32 validator skills and 11 profiles, plus the legacy skill and MCP server. They supply synthetic and refusal examples, and remain outside the pinned `bf1c18e` installation proof and the independent semantic review described here.

[`spelled-meter`](https://github.com/Lenvanderhof/Undominated.ai/commit/417c348c019451dff5f4b199bc47824bb24d0512) brought that validator inventory to 33. The following commit adds single-base, source-pin, slug-is-not-body, multiplier-aside, indicative-rate, and final-host, which brings it to 39 validator skills. The 11 profiles, the legacy skill, and the MCP server are unchanged. These checkers supply synthetic passes and refusal or invalid examples. They remain outside the older pinned `bf1c18e` installation proof and the npm map through `0.4.0`. The six later skills received the separate bounded review and `2e01e84` installation proof recorded below; spelled-meter remains outside those proofs. The published `0.3.1` figure of 43 boundary and control cases is the npm bundle's figure. The public source suite is a different, larger set.

The following commit adds final-path, status-not-page, schema-not-quote, and header-not-row, which brings that validator inventory from 39 to 43. The 11 profiles, the legacy skill, and the MCP server are unchanged. These checkers supply synthetic passes and refusal or invalid examples. They were outside the older pinned `bf1c18e` installation proof and remain outside the npm map through `0.4.0`. Their later independent correction and `a67bd9b` installation checks are recorded below. Forty-three validator skills are not the published `0.3.1` figure of 43 boundary and control cases. That 43 remains the npm bundle's case count. The public source suite is a different, larger set.

## Source-only correction record — 2026-10-07

The 17 newly published skills at `8087a25` all passed their synthetic examples. A separate review then found **20 unexpected outcomes among 37 targeted cases**; that count is outcomes, not distinct bugs. The affected contracts were corrected in source while the published npm `0.3.1` bundle remained unchanged.

| Source-only contract | Correction |
|---|---|
| Decimal determinism, rate-unit conversion and currency isolation | Preserve supplied decimal digits during arithmetic; withhold a repeating average when no rounding rule is supplied |
| Cache-tier billing | Derive sufficient arithmetic precision; require explicit replacement or surcharge write billing, exclude replacement writes from base input, and reject overlapping replacement token shares; bill a below-minimum cached prefix at base input |
| Prompt cost estimator | Require the stated identity/currency and applicable pricing evidence; preserve exact cost arithmetic and tier boundaries |
| Context-rung selection | Require an explicit final `null` cap rather than interpreting a missing field as unbounded |
| Identity dedup | Count the selected model/seller population, equate numeric decimal spellings, and separate different model/seller price groups |
| Throughput audit | Require explicit run identities and check model, hardware, precision and workload comparability |
| Evaluation contamination audit | Refuse a clean verdict when required sample/judge evidence is absent; preserve declared normalization and missing-evidence boundaries |
| Advertised-route audit | Require an origin with a hostname, a valid optional port and no embedded credentials |

The nine earlier corrected checker contracts and the later advertised-route correction use version `1.0.1`; the surface-agreement contract also removes an uncited incident claim and preserves the later distinction between missing fields and stated nulls. At `bf1c18e`, all 67 cases in the public [boundary/control suite](../scripts/source-skill-boundaries.test.py) and all 30 supplied synthetic examples passed against the combined source. The suite checks structured outcomes and specific result fields, including expected refusals and positive controls. CI also requires a checker, licence and synthetic example for every non-legacy skill directory, and runs every example. These are bounded regression and installation checks, not certification of source truth, general effectiveness or native-agent activation. The additional profiles remain portable instructions; this historical source-only batch remains outside the npm and website original-resource bundles.

## Six later source-only skills: correction record — 2026-10-07

Independent review of the six skills added at `9595ea9` found two boundary errors. `undominated-multiplier-aside` accepted a base-rate claim containing `2×` followed by whitespace or the end of the excerpt, because its word-boundary expression did not handle the multiplication symbol. It now requires review for those cases while preserving the separate-component exemption. `undominated-final-host` removed every trailing dot, allowing an invalid host such as `example.test..` to equal `example.test`. It now removes at most one DNS root dot and rejects repeated trailing dots. Both corrected skills use version `1.0.1`.

Seven added regressions and positive controls are in the public [boundary fixtures](../scripts/fixtures/source-skill-boundaries.json). All 111 cases in the public suite passed. A separate six-skill review passed 85 cases: 28 bundled examples, 32 relevant public boundary cases and 25 additional controls and adverse inputs. All 39 source validator synthetic examples also passed. These results cover supplied text, revision shape and recorded host strings; they do not verify a vendor quote, a real redirect, source truth or publication rights.

After preserving the four concurrent source-only additions from `743c4cc`, the merged source passed 132 boundary/control cases and all 43 synthetic examples. The six reviewed skill directories remained byte-identical to `2e01e84`.

These six skills are outside the published `undominated-check@0.4.0` package and its unchanged 18-resource installation map. [PR #6](https://github.com/Lenvanderhof/Undominated.ai/pull/6) merged the corrections while preserving concurrent contributions; all source and Linux/macOS/Windows installer CI checks passed. Fresh Skills CLI 1.7.1 acquisition at [`2e01e84`](https://github.com/Lenvanderhof/Undominated.ai/tree/2e01e84506189a3534f16d829b0b0cbc44142569) installed the 17 website-listed skills, matched 95 source files, passed 17 synthetic examples and reran the 85 six-skill cases from the installed copies. This covers acquisition and the stated supplied-input contracts; it does not establish native activation or source truth.

## Four later source-only skills: correction record — 2026-10-07

Independent review of final-path, status-not-page, schema-not-quote and header-not-row at `743c4cc` (preserved by `2cda264`) found two contracts requiring correction. `undominated-final-path` trimmed surrounding whitespace before validation and could normalize `//` into `/`; it also omitted its forbidden top-level amount/price check. Version `1.0.1` rejects these inputs, preserves valid root and single-trailing-slash controls, and states its narrow ASCII-path subset.

`undominated-status-not-page` labelled a supplied 200 as `read` and every other valid status as `not-read`, including a claim that 206 did not return the page. A status alone cannot establish that content was received or read: [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#name-content-semantics) separates response content from status, and [206](https://www.rfc-editor.org/rfc/rfc9110.html#name-206-partial-content) can carry representation ranges. Version `1.0.1` retains the conservative integer-200-only pass rule and universal refusal of status-based quotes, but uses `status-eligible`/`unverified` forms and explicit `bodyVerified: false`. This output-contract correction replaces the earlier `read`/`not-read` forms. The other two checker contracts remain at `1.0.0`.

The public boundary suite contains 148 cases after adding 16 controls and regressions, including malformed paths, partial-content status, absent row evidence and schema-role distinctions. All 148 cases passed, as did all 43 source synthetic examples. A separate four-skill review passed 213 checks against actual checker CLI outputs, including every pair of the six supported row/claim units, missing evidence, malformed inputs and structured refusal exit codes. These are bounded supplied-input checks; they do not certify source truth, successful fetching, source extraction or native host execution. [PR #7](https://github.com/Lenvanderhof/Undominated.ai/pull/7) published these corrections. The later `a67bd9b` acquisition above repeated all 213 cases against the installed copies. The npm `0.4.0` package and its 18-resource map are unchanged.

## Five consistency checks: correction record — 2026-10-07

The local drafts for serving attribution, filter invariance, payback basis, withdrawal residue and alias resolution were withheld before publication. Ten supplied examples passed their expected outcomes, but independent inputs exposed rounded payback false passes, a serving-mode claim accepted without a mode identity, and an empty valid filtered subsequence rejected. Reading the contracts also showed that serving attribution did not accept an actual claimed-score field and withdrawal checking did not inspect an observed withdrawn value.

The source-only `1.0.1` contracts now require those explicit observations. Serving attribution compares the claimed score exactly with the selected subject; a model-only claim may leave both mode fields null. Payback uses exact rational arithmetic and returns a numerator/denominator pair when no finite decimal represents the result. Filtering accepts empty subsequences. Withdrawal keeps zero as a value and refuses unestablished dependency coverage. Alias resolution counts distinct identities and refuses unresolved competitors, self-targets and contradictory declarations, while collapsing consistent duplicate observations. Malformed or duplicate JSON fields, invalid types, unknown fields and CLI argument errors return structured `invalid` outcomes.

All 125 cases in the dedicated [five-checker boundary/control suite](../scripts/five-original-boundaries.test.py) passed, as did its 16 bundled examples. An independent reviewer exercised 78 additional cases against the actual CLI outputs, including arithmetic beyond 200 digits, conflicting aliases in both orders, unknown observations and malformed input. These counts describe their respective suites, not a combined set of unique cases. The source CI runs both the existing suite and the new suite, along with every non-legacy skill's synthetic example.

The source inventory is now 48 validator skills and 11 portable profiles, plus the legacy quote-only skill and one MCP server. The npm `0.4.0` installation map remains exactly 18 resources and 69 source files, excluding these five. [PR #8](https://github.com/Lenvanderhof/Undominated.ai/pull/8) merged the reviewed source; its merge tree matches the installation pin `a67bd9b`. Fresh acquisition repeated the 125-case suite against the installed copies. Neither source review nor these installation checks establish live source truth, unrestricted task effectiveness or native activation.

## Four publication-boundary checkers — 2026-10-08

The following commit adds suggest-not-redirect, withheld-provider, announced-not-safe, and unit-not-scaled. The source inventory moves from 48 to 52 validator skills. The 11 profiles, the legacy skill, and the MCP server are unchanged. These four supply synthetic passes and refusal or invalid examples. They are outside the `a67bd9b` Skills CLI receipt and the npm map through `0.4.0`. The published `0.3.1` figure of 43 boundary and control cases remains the npm bundle's case count. Fifty-two validator skills are not that figure.

The public boundary suite contains 173 cases after adding 25 controls, including an absent Accept-Language redirect, the two withheld names, a safety claim from `unknown`, and a per-thousand unit restated per million. All 173 cases passed, as did all 52 source synthetic examples. These checks use supplied JSON. They do not send a request, publish a provider, or read a price.

## Catalogue figures and comparison wording

The older [PR #4](https://github.com/Lenvanderhof/Undominated.ai/pull/4) identified two distinct errors: counting unscored service listings as unmeasured models, and describing weak Pareto dominance as requiring both a higher score and a lower price. Current hero wording preserves ties: no lower score, no higher cost, with at least one strict gain. Recorded capability requirements remain a separate check.

The hero footer now calls `stats.models` **listings**, matching the platform guide. The unused standard-model/unrated figure helpers require an explicit published `integrity.coverage` population and refuse to substitute listing totals when it is absent. No September counts were copied from that PR. The active guide and hero figures were regenerated or checked against current published JSON; the data date remains 2026-10-06.

## What a source review means

A resource review records the pinned upstream definition, the applicable licence, the requested permissions, why it was selected and what was not tested. Third-party projects can change after a reviewed revision. A source review is not a security certification, an effectiveness benchmark or a promise that every integration works.

A synthetic example proves behaviour on that fixture. An adverse test demonstrates a particular refusal or boundary. Neither makes a validator an oracle for source truth. Unknown scores, amounts, licence status and precision remain unknown unless evidence establishes them.

The original scripts read explicit local input and produce structured results. The installer verifies its own bundled files; it cannot certify a separately downloaded upstream project. MCP resource text and commands remain untrusted reference material.

## Software, brand and data are different rights

| Material | Boundary |
|---|---|
| Original skill/profile directories with `LICENSE` | MIT as stated in each component's file |
| CLI and MCP source | MIT in the package's own `LICENSE` |
| Undominated name, marks and other repository material | Governed by the [root licence notice](../LICENSE); the entire repository is not blanket MIT |
| Third-party resources | Their upstream licence applies; inclusion in a directory does not relicense them |
| LMArena data | Official CC BY 4.0 dataset with attribution requirements |
| MTEB results used for embeddings | CC0 source results; retain source and benchmark identity when citing a result |
| Artificial Analysis scores | Redistribution rights remain unresolved; public tools exclude those fields |
| Provider rates and research observations | Published factual rates with source dates and terms; software licences grant no extra rights over third-party material |

See the platform's [methodology](https://undominated.ai/methodology/) and each [dataset release](../datasets/README.md) for the applicable attribution and export boundaries. Report corrections with a primary source; keep security-sensitive findings in the [private advisory channel](../SECURITY.md).
