#!/usr/bin/env python3
"""Compare an expected file manifest with an observed sha256sum receipt.

When bindFiles is true, each path is also hashed from a directory next to the
input. The checker does not walk a project outside that directory, does not
follow symlinks, and does not treat a matching receipt as proof of a registry
install. Python 3 standard library only.
"""
import hashlib
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
HEX = re.compile(r"^[a-f0-9]{64}$")
PART = re.compile(r"^[A-Za-z0-9._-]+$")


def read_local(base, value):
    if not isinstance(value, str) or not value:
        raise ValueError("path must be a non-empty relative string")
    path = Path(value)
    if path.is_absolute() or ".." in path.parts or any(part == "" for part in path.parts):
        raise ValueError("path must stay inside the input directory")
    current = base
    for part in path.parts:
        if not PART.fullmatch(part):
            raise ValueError(f"path component is not portable: {part}")
        current = current / part
        if current.is_symlink():
            raise ValueError("symlinks are not allowed")
    if not current.resolve().is_relative_to(base.resolve()):
        raise ValueError("path escapes the input directory")
    return current


def parse_receipt(text):
    observed = {}
    for line_no, line in enumerate(text.splitlines(), 1):
        if not line.strip():
            continue
        if "  " not in line:
            raise ValueError(f"receipt line {line_no} must be hex, two spaces, then a relative path")
        digest, rel = line.split("  ", 1)
        if not HEX.fullmatch(digest):
            raise ValueError(f"receipt line {line_no} hash is not 64 lowercase hex")
        if rel != rel.strip() or not rel or rel.startswith("./"):
            raise ValueError(f"receipt line {line_no} path must be relative and not start with ./")
        path = Path(rel)
        if path.is_absolute() or ".." in path.parts or any(not PART.fullmatch(part) for part in path.parts):
            raise ValueError(f"receipt line {line_no} path is not portable")
        key = rel
        if key in observed:
            raise ValueError(f"duplicate receipt path {key}")
        observed[key] = digest
    if not observed:
        raise ValueError("receipt has no files")
    return observed


def check(data, base):
    if not isinstance(data.get("resourceId"), str) or not SLUG.fullmatch(data["resourceId"]):
        raise ValueError("resourceId must be a slug")
    url = urlparse(data["sourceUrl"])
    if url.scheme != "https" or not url.netloc:
        raise ValueError("sourceUrl must be HTTPS")
    date.fromisoformat(data["observedAt"])
    if not isinstance(data.get("bindFiles"), bool):
        raise ValueError("bindFiles must be a boolean")
    for key in ("expectedFile", "observedFile"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError(f"{key} must be a relative path")
    for key in ("expectedSha256", "observedSha256"):
        if not isinstance(data.get(key), str) or not HEX.fullmatch(data[key]):
            raise ValueError(f"{key} must be 64 lowercase hex")
    expected_bytes = read_local(base, data["expectedFile"]).read_bytes()
    observed_bytes = read_local(base, data["observedFile"]).read_bytes()
    issues = []
    expected_digest = hashlib.sha256(expected_bytes).hexdigest()
    observed_digest = hashlib.sha256(observed_bytes).hexdigest()
    if expected_digest != data["expectedSha256"]:
        issues.append("expected manifest hash mismatch")
    if observed_digest != data["observedSha256"]:
        issues.append("observed receipt hash mismatch")
    try:
        manifest = json.loads(expected_bytes.decode("utf-8"))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"expected manifest is not UTF-8 JSON: {exc}") from exc
    files = manifest.get("files") if isinstance(manifest, dict) else None
    if not isinstance(files, list) or not files:
        raise ValueError("expected manifest files must be a non-empty array")
    expected = {}
    for item in files:
        if not isinstance(item, dict):
            raise ValueError("each expected file must be an object")
        rel, digest = item.get("path"), item.get("sha256")
        if not isinstance(rel, str) or not isinstance(digest, str) or not HEX.fullmatch(digest):
            raise ValueError("each expected file needs a path and a 64-hex sha256")
        path = Path(rel)
        if path.is_absolute() or ".." in path.parts or any(not PART.fullmatch(part) for part in path.parts):
            raise ValueError(f"expected path is not portable: {rel}")
        if rel in expected:
            raise ValueError(f"duplicate expected path {rel}")
        expected[rel] = digest
    observed = parse_receipt(observed_bytes.decode("utf-8"))
    missing = sorted(set(expected) - set(observed))
    extra = sorted(set(observed) - set(expected))
    if missing:
        issues.append("missing from receipt: " + ", ".join(missing))
    if extra:
        issues.append("extra in receipt: " + ", ".join(extra))
    mismatched = sorted(path for path in expected.keys() & observed.keys() if expected[path] != observed[path])
    if mismatched:
        issues.append("hash mismatch: " + ", ".join(mismatched))
    bound = []
    if data["bindFiles"]:
        root = read_local(base, data["root"])
        if not root.is_dir():
            raise ValueError("root must be a directory inside the input directory")
        for rel, digest in sorted(expected.items()):
            file_path = read_local(root, rel)
            if not file_path.is_file():
                issues.append(f"bound file missing: {rel}")
                continue
            actual = hashlib.sha256(file_path.read_bytes()).hexdigest()
            bound.append(rel)
            if actual != digest:
                issues.append(f"bound bytes differ: {rel}")
    return {
        "status": "review" if issues else "pass",
        "resourceId": data["resourceId"],
        "fileCount": len(expected),
        "bound": bound,
        "issues": issues,
        "scope": "Manifest, receipt, and optional local bytes. This does not prove an npm or Skills CLI install occurred.",
    }


def main():
    if len(sys.argv) != 2:
        print(json.dumps({"status": "invalid", "error": "pass one JSON input path"}))
        return 2
    base = Path(sys.argv[1]).resolve().parent
    try:
        data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("input must be a JSON object")
        result = check(data, base)
        print(json.dumps(result, indent=2))
        return 0 if result["status"] == "pass" else 1
    except (ValueError, KeyError, TypeError, OSError, UnicodeError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "invalid", "error": str(exc)}))
        return 2


if __name__ == "__main__":
    sys.exit(main())
