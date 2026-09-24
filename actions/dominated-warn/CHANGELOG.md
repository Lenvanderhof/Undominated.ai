# Changelog

`dominated-warn` releases. Consumers pin `@v1`, a moving major tag that follows the newest
`v1.x.y` and never crosses a breaking change. Each heading is also the GitHub Release body.

## 1.0.0

First public release (tagged 2026-09-09).

- Scans `.env.example`, `config/*.toml` and `package.json` string values for
  `provider/model` identifiers. Skips `.env`, URLs, MIME types, npm scopes, dependency
  keys and anything that looks like a secret.
- Reads the published verdict for each from `undominated.ai/data/dominance/<slug>.json`
  and comments once on the pull request, updating that comment in place, when a declared
  model is **strictly dominated as of** a dated snapshot.
- Warn, never fail: exits 0 on findings, on fetch failure and without a comment token.
  No dependencies, no secret, no `setup-node`.
