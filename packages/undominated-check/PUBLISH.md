# Publishing `undominated-check`

**Registry status checked 2026-10-07:** `undominated-check@0.1.1` is the registry latest version. The prepared `0.2.0` version returns HTTP 404 and has not been published. Re-check the registry immediately before any release; this is a dated observation.

Publication is an explicit human release gate. An agent must not upload a package. Local tests, a tarball, a dry-run and an approved source change do not themselves authorise publication.

## Package identity

| Field | Value |
|---|---|
| Name | `undominated-check` |
| Prepared version | `0.2.0` |
| Licence | MIT, as specified in this package's `LICENSE` |
| Registry | `https://registry.npmjs.org/` |
| Access | `public` |

Start at the repository root, then enter this package directory once:

```sh
cd packages/undominated-check
```

Publish this standalone package from that directory. The repository-root package is a GitHub installation wrapper; it is not the npm release entry point. Confirm the current directory and inspect `package.json` before running release commands.

## Prepare the exact release candidate

```sh
npm test
npm pack
```

Inspect the archive contents and install the resulting `undominated-check-0.2.0.tgz` into a fresh temporary project. Run `undominated-check resources list` and inspect an original skill from the installed tarball. Exercise a dry-run, a skill install into a fresh temporary project, and the installed Python validator against its synthetic example. Keep the tarball hash with the test receipt. A successful local test does not prove that npm or the website already distributes this candidate.

Check identity and registry state:

```sh
npm whoami
npm view undominated-check name version maintainers
npm view undominated-check@0.2.0 version
```

A 404 is expected only for an unpublished name or version. If the account or existing package ownership is unexpected, stop. If this version already exists, do not republish it. If login is required, the human package owner must run `npm login`.

The `prepublishOnly` script requires `UNDOMINATED_PUBLISH=1`, including for a dry-run. A dry-run packs and validates but does not upload:

```sh
UNDOMINATED_PUBLISH=1 npm publish --access public --dry-run
```

## Human publication

After explicit approval of the tested version, the package owner may publish from the same package directory:

```sh
UNDOMINATED_PUBLISH=1 npm publish --access public
```

Keep npm's authentication and two-factor protections enabled. If npm requests an OTP, the human enters a fresh authenticator code into npm's prompt; do not put the code in chat, a tracked file, an environment file or shell history. Do not bypass the gate with `--ignore-scripts`, and do not use `--force`.

## Verify the published result

```sh
npm view undominated-check@0.2.0 name version dist.integrity
npx -y undominated-check@0.2.0 --help
```

Verify the pinned version's actual behaviour and archive contents before describing the release as available. Website resource endpoints and remote skill discovery require their own publication checks.
