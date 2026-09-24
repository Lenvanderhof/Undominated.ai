# Changelog

All notable changes to `undominated-check`. Versions follow [SemVer](https://semver.org/).
Each heading is also the body of the matching GitHub Release, so it is written for users.

## 0.2.0

- **MCP server.** `npx -y undominated-check --mcp` serves the same two read-only lookups
  over the Model Context Protocol (stdio): `check_model` and `list_frontier`. Both are
  annotated read-only, return the rendered verdict plus `structuredContent`, and report a
  failed lookup as a tool error that says *cannot confirm*, never as a default.
  `--local` and `--origin` apply. Still no dependencies.
- The user-agent version is read from `package.json`, so it can no longer lag a release.
- Tests ship in the public repository and run offline against synthetic fixtures.
- Published from GitHub Actions with npm trusted publishing, so every tarball carries a
  provenance attestation linking it to the commit that built it.

## 0.1.1 — 2026-09-09

- TTY Pareto staircase. Chartreuse paints only a frontier finding. Pipes, CI, `--json`
  and `--plain` print the same bytes as 0.1.0.
- `--plain` / `--no-color` and `--color` to force either mode.

## 0.1.0 — 2026-09-01

- First release: `undominated-check <provider/model>`, `--frontier`, `--json`,
  `--local`, `--origin` and opt-in `--exit-code` with one code per verdict status.
