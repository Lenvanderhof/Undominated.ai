# Contributing

Help make a claim more traceable or a resource more useful. This repository accepts improvements to its public skills, portable profiles, CLI, MCP server and documentation. The production website and its data pipeline are maintained separately.

## Report a data correction

Open a [Wrong figure issue](https://github.com/Lenvanderhof/Undominated.ai/issues/new?template=wrong-price.yml). Include the exact model/resource and page URL, the value shown, the value supported by the primary source, the source URL and observation date. For prices, include seller, currency, unit, workload and relevant tiers or conditions. Keep unknown values unknown.

A correction is stronger when another person can reproduce it. Screenshots can illustrate the mismatch; a dated primary source should establish it. Applied corrections belong in the [public correction log](https://undominated.ai/corrections/).

## Improve a public resource

A focused pull request should explain the task it serves, the failure it prevents and its limits. For an original skill or agent profile, include:

- A distinct use case and a clear input/output contract.
- Source provenance and the licence for every included file; use short attributed excerpts only where permitted.
- Required tools and permissions, expected writes/network requests, and what was not tested.
- A meaningful synthetic example and, for a checker, an adverse example demonstrating a material refusal or boundary.
- An installation path that matches the specific distribution. An `AGENT.md` profile is not automatic native-agent registration.

Checks should validate explicit evidence rather than fill missing prices, scores, permissions or capabilities with favourable guesses. A licence checker can check the consistency of a supplied permission record; it cannot grant rights or make an unsupported legal interpretation.

For third-party directory suggestions, link the upstream repository/documentation and a specific reviewed revision. Do not vendor a project merely to increase the count. The website directory and the CLI's immutable resource bundle are separate publication surfaces.

## Work from source

Use Node.js **22.12+** and Python **3.10+**. These public packages have no runtime npm dependencies. From a checkout:

```sh
npm test
npm run check
npm run build
```

The root test command runs the CLI, MCP, public Action and source-boundary suites. `check` checks the public JavaScript entrypoints for syntax errors; `build` produces the offline resource bundle. The CLI suite includes installer, verdict and checker tests. The public resource workflow also exercises portable installation on Linux, macOS and Windows. Add tests for a reproduced defect or meaningful new boundary; a test that merely repeats an implementation does not establish correctness.

For generated documentation:

```sh
node scripts/refresh-readme.mjs
node scripts/build-floor-table.mjs
node scripts/build-hero.mjs
node scripts/refresh-readme.mjs --check
node scripts/build-floor-table.mjs --check
node scripts/build-hero.mjs --check
node scripts/shots-current.mjs --check
```

The figure/table markers live in [the platform guide](docs/PLATFORM.md). These commands fetch public website data; they do not rebuild or deploy the production website. Date screenshots and register any file under `docs/shots/` in its manifest. Do not present historical screenshots as current price evidence.

## Keep the boundary clear

Do not submit secrets, private research captures, paywalled extracts, scraped catalogues with unresolved rights, or Artificial Analysis score dumps. Do not add model rows here to change the live leaderboard. Software licences do not sublicense third-party datasets or the Undominated brand.

A source merge, registry publication and website deployment are separate steps. Follow the relevant package's `PUBLISH.md` for a release; do not republish an existing npm version or publish from a changing shared directory.

[Questions and design discussion](https://github.com/Lenvanderhof/Undominated.ai/discussions) · [Private security reporting](SECURITY.md) · [Licence map](LICENSE)
