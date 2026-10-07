# Publishing `undominated-mcp`

**Published and verified 2026-10-07:** [`undominated-mcp@0.1.0`](https://registry.npmjs.org/undominated-mcp/0.1.0) is available on npm. Its downloaded archive matches the tested release candidate; the pinned package was also exercised in a fresh consumer.

**Do not republish `0.1.0`.** [Published npm name/version pairs cannot be reused](https://docs.npmjs.com/cli/v11/commands/npm-publish/#description). Any later source or resource changes require a new version and a new release candidate.

| Field | Value |
|---|---|
| Name | `undominated-mcp` |
| Published version | `0.1.0` |
| Licence | MIT, as specified in this package's `LICENSE` |
| Registry | `https://registry.npmjs.org/` |
| Access | `public` |
| Published archive SHA-256 | `d4783712da445075026883811b238de7485fe7a101e6a95a3853a1f6974a0c46` |
| Reviewed runtime source | [`f730988`](https://github.com/Lenvanderhof/Undominated.ai/commit/f730988d8c55fb7bd134da8c03ffbcf33a8b6738) |

Verify the existing release without publishing anything:

```sh
npm view undominated-mcp@0.1.0 name version dist.integrity
npx --yes undominated-mcp@0.1.0 --help
```

## Prepare a future release

Publication requires explicit human approval of the exact tested candidate. Local tests, a tarball, a dry-run or approval of a source change do not by themselves authorise an upload. An authorised release operator may perform the approved upload.

Use an isolated checkout, choose a new version in `package.json`, and enter this standalone package directory:

```sh
cd packages/undominated-mcp
npm whoami
npm view undominated-mcp name version maintainers
npm test
npm pack --pack-destination /absolute/path/to/release-directory
```

Confirm the account and package ownership, and query the proposed new version before uploading: a 404 is expected only for an unpublished name or version. Stop if that version already exists. The repository-root package is a GitHub installation wrapper, not the npm release entry point.

Inspect the packed archive and install that exact file into a fresh temporary project. Run the installed server with `--help`, complete a stdio initialize/tools-list round trip and verify a live read-only response. Confirm that a missing published resource returns an explicit error. Keep the archive SHA-256 and npm integrity with the test receipt. Do not rebuild or publish from a mutable shared source tree after validating an archive: newly edited files could enter a different package.

## Publish only the approved archive

After approval, recheck the saved archive hash. From this package directory, explicitly run the publication guard, then publish the tested archive by its absolute path:

```sh
UNDOMINATED_PUBLISH=1 node prepublish.mjs
npm publish /absolute/path/to/tested-package-NEW-VERSION.tgz --access public
```

Replace the placeholder with the reviewed archive's actual path and new version. In the release CLI, [npm 11.12.0 runs `prepublishOnly` only for a directory input](https://github.com/npm/cli/blob/v11.12.0/lib/commands/publish.js#L88-L98), so publishing a tarball requires the explicit guard above. Do not bypass the guard with `--ignore-scripts`, and do not use `--force`.

Keep npm authentication and two-factor protections enabled. If login or an OTP is required, the human package owner completes npm's authentication flow; do not place credentials or codes in chat, tracked files or shell history.

## Verify the new published result

Fetch the new pinned version's registry metadata and archive. Match its integrity and SHA-256 to the tested candidate, then execute the pinned package in a fresh consumer. Run the installed server with `--help`, complete a stdio initialize/tools-list round trip and verify a live read-only response. Confirm that a missing published resource returns an explicit error.

Only then describe the new version as available. Website resource endpoints and remote skill discovery require their own publication checks.
