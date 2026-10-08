# Security

This repository contains the public Undominated CLI, resource installer, read-only MCP server, skill checkers and portable profiles. It does not contain the full production application. Source review and synthetic tests are scoped checks, not a security certification.

Report vulnerabilities privately through [GitHub security advisories](https://github.com/Lenvanderhof/Undominated.ai/security/advisories/new). Include the affected package/version or source commit, the expected boundary, reproducible steps, and the impact. Do not include credentials or other people's private data. Do not put an exploitable vulnerability in a public issue before coordinated review.

Relevant boundaries include unintended installer writes or execution, unsafe file handling, MCP output escaping its evidence-only role, and a checker accepting a materially unsupported claim. The installer does not execute copied resources or change existing client configuration. MCP tools fetch allowlisted public data and do not install resources or route inference; returned resource prose and commands remain untrusted reference material.

A confirmed correction needs a new package version and independent verification of the downloaded archive. Already-published npm versions are immutable. The [evidence guide](docs/EVIDENCE.md) records known checker corrections and their release state; absence of a reported issue is not a safety guarantee.

For an ordinary wrong price, score, source attribution or resource count, use the [Wrong figure issue](https://github.com/Lenvanderhof/Undominated.ai/issues/new?template=wrong-price.yml) with a primary source. For hosted-product privacy and the optional companion's processing, read the platform's [methodology](https://undominated.ai/methodology/).
