---
name: undominated-install-receipt
description: Compare an expected file manifest with a sha256sum receipt and, when asked, the bytes in a directory next to the input.
license: MIT
metadata:
  author: Undominated.ai
  version: "1.0.0"
---

# Install receipt

Use after copying a skill, agent profile, or MCP bundle into a directory you control, before treating that copy as the reviewed revision.

1. Write the expected manifest yourself from the reviewed hashes: each relative path and its SHA-256. Save a `sha256sum` receipt (`64 lowercase hex`, two spaces, relative path) for the copy you are checking.
2. Put both documents next to the input JSON and record their SHA-256. Set `sourceUrl` to the page or commit you believe the bytes came from, and `observedAt` to the day you hashed them.
3. Set `bindFiles` to true and `root` to a relative directory when the bytes themselves are next to the input. The checker hashes only those files. It does not search a repository, follow symlinks, or accept absolute paths.
4. A pass means the manifest, the receipt, and the bound bytes agree. It does not mean `npx`, the Skills CLI, or a registry published that directory.
5. Missing files, extra files, and hash mismatches are review results. Do not delete the extra file from inside this checker. Decide that outside it.

## Run the local check

```sh
python3 scripts/check.py examples/synthetic.json
python3 scripts/check.py /absolute/path/to/your-input.json
```

The bundled fixture is **synthetic**. The script reads the input directory only, makes no network requests, and writes no files. Python 3.10+; no dependencies.

Exit codes: `0` the documents and bound bytes agree; `1` review required; `2` invalid input. Passing is not an installation certificate.

## Input contract

Required: `resourceId` (slug), `sourceUrl` (HTTPS), `observedAt` (ISO date), `bindFiles` (boolean), `expectedFile`, `expectedSha256`, `observedFile`, `observedSha256`. When `bindFiles` is true, `root` is a relative directory. The expected file is JSON `{"files":[{"path","sha256"}]}`. The observed file uses `sha256sum` lines. Paths are portable relative segments: letters, digits, `.`, `_`, `-`.

## Deliverable and limits

Return the resource id, file count, which paths were hashed from disk, and every mismatch. Keep the JSON with the explanation.

The user retains control over what is deleted or published. This skill does not install packages or contact a registry.
