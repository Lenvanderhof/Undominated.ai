# Evidence, licences and release state

A source file, a passing example, a public package and an observed installation prove different things. This page keeps those boundaries explicit. Observations below were checked on 2026-10-07.

## What has been verified

| Artifact | Verification scope |
|---|---|
| Original six-skill source release, [`f730988`](https://github.com/Lenvanderhof/Undominated.ai/tree/f730988d8c55fb7bd134da8c03ffbcf33a8b6738) | Standard Skills CLI discovery and named installation; installed bytes matched source; six synthetic checks passed |
| [`undominated-check@0.2.0`](https://registry.npmjs.org/undominated-check/0.2.0) | Downloaded archive matched the tested candidate; clean consumers listed resources and installed a skill, a profile and the bundled MCP server |
| [`undominated-check@0.3.0`](https://registry.npmjs.org/undominated-check/0.3.0) | Archive identity and expanded source/installation checks verified; later adverse cases found correctness defects in added checkers, described below |
| [`undominated-check@0.3.1`](https://registry.npmjs.org/undominated-check/0.3.1) | Anonymous registry archive matched the candidate; clean npx, 18 installed resources, 69 file hashes, 11 synthetic checks, 43 boundary and control cases with structured results, exported MCP tools and live plain-text frontier verified |
| [`undominated-mcp@0.1.0`](https://registry.npmjs.org/undominated-mcp/0.1.0) | Archive matched the tested candidate; clean-cache installation, stdio initialization, five tool definitions and a live frontier response verified |
| Website resource directories | Published indexes contain 71 skills, 72 agents and 89 MCP servers; these include third-party entries and are separate from CLI bundles |

For a registry release, these SHA-256 values identify the downloaded `.tgz` bytes, not an uncompressed directory:

| Package | Archive SHA-256 |
|---|---|
| `undominated-check@0.2.0` | `974509ea1fdbf08c32c391596169dd61991df9e978d2c7e53f9f5c15e6af3f06` |
| `undominated-check@0.3.0` | `05f17f7578b02309b60b12d97b6a42fe82345731ed5b8ee85e5330657022741e` |
| `undominated-check@0.3.1` | `a4550da5d0e5749b62217a96659f0d8ab91b1ab0a656e1cecd7115a983fe940b` |
| `undominated-mcp@0.1.0` | `d4783712da445075026883811b238de7485fe7a101e6a95a3853a1f6974a0c46` |

```sh
npm view undominated-check@0.3.1 version dist.tarball dist.integrity
npm view undominated-mcp@0.1.0 version dist.tarball dist.integrity
```

The older bundled `status: local-tested-unreleased` field is retained build-time metadata, not an npm registry query. It does not override the verified registry publication above. `0.3.1` uses `fixture-tested` to describe validation scope without implying publication. Published versions are immutable; source changes require a new package version. A version on npm does not establish marketplace listing, broad host compatibility or production performance.

## Checker corrections

Adverse review after `0.3.0` publication identified cases where supplied inputs could be accepted too favourably: a redistribution denial was labelled as internal-use permission; reverse dominance did not establish capability preservation in the reverse direction; an omitted final tier cap could stand in for an explicit unbounded cap; Decimal-context rounding could hide a mismatch in high-precision plan totals; and rounded repeating ratios could be mistaken for exact equality in spread or tier claims.

Corrective source for `0.3.1` now rejects those cases. It separates internal-use evidence, checks capability preservation in the proposed replacement direction, requires an explicit final tier cap and uses exact arithmetic for totals and equality. Independent adverse cases and the expanded source tests passed. The published `0.3.1` archive and an anonymous clean installation also passed those checks. The README recommends `0.3.1` for eleven skills, six profiles and the bundled MCP server. The website's original resource entries still pin the earlier verified source/package release; that separate publication was not changed by this repository refresh. Do not use a `0.3.0` pass from an affected checker as approval to publish, republish data or change providers.

The licence checker is a consistency check over a permission record you supply. It does not interpret a licence, verify your reading of it or grant rights. Seller-spread checks group the owners you supply and do not establish equivalent endpoint service. Context-tier checks require the complete supplied whole-request ladder; they do not discover omitted provider terms.

## Repository checks

The public resource workflow runs the standalone CLI, MCP and public GitHub Action suites. At this review, all **54 CLI tests**, **32 MCP tests** and **22 Action tests** passed, including installer boundaries, adverse checker cases, MCP price provenance and warn-only Action behaviour.

The legacy Action suite initially failed because one assertion read `.github/workflows/launch-verdicts.yml`, a private workflow absent from this public repository. That private-repository assertion was removed from the public suite; all 22 public Action assertions were preserved. No production workflow or Action runtime was copied or changed.

The separately published [source-only batch](https://github.com/Lenvanderhof/Undominated.ai/commit/8087a25ac453a717a3a8aabce9b2987f6b2b1b2d) adds 17 skill directories and four portable profiles. Their MIT licence files are present, and all 17 supplied synthetic examples independently returned structured passes. The source workflow runs every validator skill example, including later additions. A separate Skills CLI 1.7.1 check at that exact source revision discovered and copied all 29 repository skills (28 validators plus the legacy quote-only skill), matched 125 installed files and passed all 28 installed synthetic examples. That verifies acquisition and fixture behaviour at `8087a25`. Subsequent source-only corrections and their boundary tests are recorded below; the original install receipt does not by itself verify those newer bytes. It is outside the 18-resource npm bundle and the website's original-resource release.

A later source-only commit, [`c47ac12`](https://github.com/Lenvanderhof/Undominated.ai/commit/c47ac12cb8f173aefbdee752f8e8c40b190df8ee), adds advertised-route and shared-lastmod checks plus a crawl-auditor profile. This brings the source library to 30 validator skills and 11 portable profiles, plus the legacy quote-only skill and the MCP server. These additions remain outside the npm installation map. The earlier Skills CLI receipt does not cover the two new skill directories.

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

The nine earlier corrected checker contracts and the later advertised-route correction use version `1.0.1`; the surface-agreement contract also removes an uncited incident claim and preserves the later distinction between missing fields and stated nulls. All 67 cases in the public [boundary/control suite](../scripts/source-skill-boundaries.test.py) and all 30 supplied synthetic examples passed against the combined source. The suite checks structured outcomes and specific result fields, including expected refusals and positive controls. CI also requires a checker, licence and synthetic example for every non-legacy skill directory, and runs every example. These are bounded regression and installation checks, not certification of source truth, general effectiveness or native-agent activation. The additional profiles remain portable instructions; the extra resources remain outside the npm and website original-resource bundles.

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
