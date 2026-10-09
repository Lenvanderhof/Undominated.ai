# Publishing `undominated-check`

**Current release, published and independently verified 2026-10-09:** [`undominated-check@0.5.0`](https://registry.npmjs.org/undominated-check/0.5.0). Exact archive SHA-256: `1e197ca6a9ede5eea19ceaf11f09c47c51ee98b0531c9690e33fc427330f7a24`. Anonymous metadata/tarball acquisition matched the tested candidate and registry SHA-512 integrity. A fresh-cache npm entrypoint listed 18 resources; the fresh registry consumer installed all 18, verified all 69 unchanged source hashes, ran eleven fixtures, initialized MCP, and exercised four-client global skill setup in an isolated test home. Actual registry-entrypoint terminal tests passed installation, decline, Ctrl+C, EOF and dry-run. Source passed 101 package tests; the cleanup ownership correction and verification limits are recorded in [Evidence](../../docs/EVIDENCE.md#guided-installer--050-verified-2026-10-09). **Do not republish 0.5.0 or rebuild it for another upload.**

**Previous release, published and independently verified 2026-10-07:** [`undominated-check@0.4.0`](https://registry.npmjs.org/undominated-check/0.4.0). Exact archive SHA-256: `260ab6679d4068f0e9ea01c6890b09eedad13b5097eb38dc2389c8b784e9a49b`. Fresh anonymous acquisition verified all 18 resource installs, 69 source hashes, eleven synthetic checks, 43 checker boundary/control cases, native adapter generation, MCP initialization and the live frontier. A separate 71-case installer audit passed against the same archive. Actual native discovery and Linux/macOS/Windows results are in [Installer](../../docs/INSTALLER.md) and [Evidence](../../docs/EVIDENCE.md#installer-integration--040). **Do not republish 0.4.0.**

**Published and independently verified 2026-10-07:** [`undominated-check@0.3.1`](https://registry.npmjs.org/undominated-check/0.3.1) is available. The registry archive SHA-256 is `a4550da5d0e5749b62217a96659f0d8ab91b1ab0a656e1cecd7115a983fe940b`. An anonymous fresh-cache consumer listed and installed all 18 resources, matched 69 file hashes, passed 11 installed synthetic checks and 43 boundary and control cases with structured-result validation, initialized the exported MCP server's five tools, and retrieved the live plain-text frontier. Version 0.3.1 corrects the five added checkers and uses `fixture-tested` for validation metadata; that label itself does not establish publication. **Do not republish 0.3.1.**

**Previous release, published and installation-verified 2026-10-07:** [`undominated-check@0.3.0`](https://registry.npmjs.org/undominated-check/0.3.0) is available on npm. The downloaded registry archive SHA-256 is `05f17f7578b02309b60b12d97b6a42fe82345731ed5b8ee85e5330657022741e` and matches the tested candidate (78 files, sha1 `387bfa5f5d02954dc277167ee9a6cac6560eb531`). `npm exec --yes -- undominated-check@0.3.0 resources list` returned eleven skills, six agents and the MCP server, including `undominated-context-tier`, `undominated-seller-spread`, `undominated-dominance-wording`, `undominated-plan-quote`, `undominated-licence-boundary`, `undominated-comparison-editor` and `undominated-pricing-source-reviewer`. A fresh install of `undominated-context-tier` passed its synthetic ladder. Subsequent adverse review found correctness defects in added checkers; see [the correction record](../../docs/EVIDENCE.md#checker-corrections). Synthetic success did not establish those boundaries. The same installed package printed a live dominance verdict for `google/gemini-3.7-flash`.

**Do not republish `0.5.0`, `0.4.0`, `0.3.1`, `0.3.0` or `0.2.0`.** [Published npm name/version pairs cannot be reused](https://docs.npmjs.com/cli/v11/commands/npm-publish/#description). Any later source or resource changes require a new version and a new release candidate. `0.2.0` remains the earlier release of six skills, four agents and the MCP server. Its archive SHA-256 is `974509ea1fdbf08c32c391596169dd61991df9e978d2c7e53f9f5c15e6af3f06`, reviewed from [`f730988`](https://github.com/Lenvanderhof/Undominated.ai/commit/f730988d8c55fb7bd134da8c03ffbcf33a8b6738).

| Field | Value |
|---|---|
| Name | `undominated-check` |
| Published version | `0.5.0` |
| Licence | MIT, as specified in this package's `LICENSE` |
| Registry | `https://registry.npmjs.org/` |
| Access | `public` |
| Published archive SHA-256 | `1e197ca6a9ede5eea19ceaf11f09c47c51ee98b0531c9690e33fc427330f7a24` |
| npm integrity | `sha512-0R3LE8WKNQC0NW7yTh1IDWkM4VwTfFRRxNBU/7g4vAv2vs7HwETWq0jTV6CYGv7Idi/HMHS2KWz1/eYEbteR3Q==` |

Verify the existing release without publishing anything:

```sh
npm view undominated-check@0.5.0 name version dist.integrity
npx undominated-check@0.5.0 resources list
```

## Prepare a future release

Publication requires explicit human approval of the exact tested candidate. Local tests, a tarball, a dry-run or approval of a source change do not by themselves authorise an upload. An authorised release operator may perform the approved upload.

Use an isolated checkout, choose a new version in `package.json`, and enter this standalone package directory:

```sh
cd packages/undominated-check
npm whoami
npm view undominated-check name version maintainers
npm test
npm pack --pack-destination /absolute/path/to/release-directory
```

Confirm the account and package ownership, and query the proposed new version before uploading: a 404 is expected only for an unpublished name or version. Stop if that version already exists. The repository-root package is a GitHub installation wrapper, not the npm release entry point.

Test the packed wizard in an actual terminal: selection, multiple clients, project/global paths, final decline, Ctrl+C, EOF and dry-run. Confirm piped and JSON commands never prompt. Check shared destinations are deduplicated, a conflict in the last target blocks every write, and no existing client configuration is edited. Unsupported global GitHub agent and VS Code MCP adapters must be refused.

Inspect the packed archive and install that exact file into a fresh temporary project. List and inspect resources, exercise a dry-run, install all bundled resources into a fresh temporary project, compare every installed file hash and run the installed Python validators against their synthetic examples. Keep the archive SHA-256 and npm integrity with the test receipt. Do not rebuild or publish from a mutable shared source tree after validating an archive: newly edited files could enter a different package.

## Publish only the approved archive

After approval, recheck the saved archive hash. From this package directory, explicitly run the publication guard, then publish the tested archive by its absolute path:

```sh
UNDOMINATED_PUBLISH=1 node prepublish.mjs
npm publish /absolute/path/to/tested-package-NEW-VERSION.tgz --access public
```

Replace the placeholder with the reviewed archive's actual path and new version. In the release CLI, [npm 11.12.0 runs `prepublishOnly` only for a directory input](https://github.com/npm/cli/blob/v11.12.0/lib/commands/publish.js#L88-L98), so publishing a tarball requires the explicit guard above. Do not bypass the guard with `--ignore-scripts`, and do not use `--force`.

Keep npm authentication and two-factor protections enabled. If login or an OTP is required, the human package owner completes npm's authentication flow; do not place credentials or codes in chat, tracked files or shell history.

## Verify the new published result

Fetch the new pinned version's registry metadata and archive. Match its integrity and SHA-256 to the tested candidate, then execute the pinned package in a fresh consumer. List and inspect resources, exercise a dry-run, install all bundled resources into a fresh temporary project, compare every installed file hash and run the installed Python validators against their synthetic examples.

Only then describe the new version as available. Website resource endpoints and remote skill discovery require their own publication checks.
