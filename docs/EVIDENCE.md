# Evidence, licences and release state

A source file, a passing example, a public package and an observed installation prove different things. This page keeps those boundaries explicit. Observations below were checked on 2026-10-07.

## What has been verified

| Artifact | Verification scope |
|---|---|
| Original six-skill source release, [`f730988`](https://github.com/Lenvanderhof/Undominated.ai/tree/f730988d8c55fb7bd134da8c03ffbcf33a8b6738) | Standard Skills CLI discovery and named installation; installed bytes matched source; six synthetic checks passed |
| [`undominated-check@0.2.0`](https://registry.npmjs.org/undominated-check/0.2.0) | Downloaded archive matched the tested candidate; clean consumers listed resources and installed a skill, a profile and the bundled MCP server |
| [`undominated-check@0.3.0`](https://registry.npmjs.org/undominated-check/0.3.0) | Archive identity and expanded source/installation checks verified; later adverse cases found correctness defects in added checkers, described below |
| [`undominated-mcp@0.1.0`](https://registry.npmjs.org/undominated-mcp/0.1.0) | Archive matched the tested candidate; clean-cache installation, stdio initialization, five tool definitions and a live frontier response verified |
| Website resource directories | Published indexes contain 71 skills, 72 agents and 89 MCP servers; these include third-party entries and are separate from CLI bundles |

For a registry release, these SHA-256 values identify the downloaded `.tgz` bytes, not an uncompressed directory:

| Package | Archive SHA-256 |
|---|---|
| `undominated-check@0.2.0` | `974509ea1fdbf08c32c391596169dd61991df9e978d2c7e53f9f5c15e6af3f06` |
| `undominated-check@0.3.0` | `05f17f7578b02309b60b12d97b6a42fe82345731ed5b8ee85e5330657022741e` |
| `undominated-mcp@0.1.0` | `d4783712da445075026883811b238de7485fe7a101e6a95a3853a1f6974a0c46` |

```sh
npm view undominated-check@0.2.0 version dist.tarball dist.integrity
npm view undominated-mcp@0.1.0 version dist.tarball dist.integrity
```

The older bundled `status: local-tested-unreleased` field is retained build-time metadata, not an npm registry query. It does not override the verified registry publication above. New `0.3.1` source uses `fixture-tested` to describe validation scope without implying publication. Published versions are immutable; source changes require a new package version. A version on npm does not establish marketplace listing, broad host compatibility or production performance.

## Checker corrections

Adverse review after `0.3.0` publication identified cases where supplied inputs could be accepted too favourably: a redistribution denial was labelled as internal-use permission; reverse dominance did not establish capability preservation in the reverse direction; an omitted final tier cap could stand in for an explicit unbounded cap; Decimal-context rounding could hide a mismatch in large plan totals; and rounded repeating ratios could be mistaken for exact equality in spread or tier claims.

Corrective source for `0.3.1` now rejects those cases. It separates internal-use evidence, checks capability preservation in the proposed replacement direction, requires an explicit final tier cap and uses exact arithmetic for totals and equality. Independent adverse cases and the expanded source tests passed. Registry publication and the downloaded archive still require their own verification. The README currently recommends `0.2.0` for its original six skills, four profiles and bundled MCP server. Do not use a `0.3.0` pass from an affected checker as approval to publish, republish data or change providers.

The licence checker is a consistency check over a permission record you supply. It does not interpret a licence, verify your reading of it or grant rights. Seller-spread checks group the owners you supply and do not establish equivalent endpoint service. Context-tier checks require the complete supplied whole-request ladder; they do not discover omitted provider terms.

## Repository checks

The public resource workflow runs the standalone CLI, MCP and public GitHub Action suites. At this review, all **54 CLI tests**, **32 MCP tests** and **22 Action tests** passed, including installer boundaries, adverse checker cases, MCP price provenance and warn-only Action behaviour.

The legacy Action suite initially failed because one assertion read `.github/workflows/launch-verdicts.yml`, a private workflow absent from this public repository. That private-repository assertion was removed from the public suite; all 22 public Action assertions were preserved. No production workflow or Action runtime was copied or changed.

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
