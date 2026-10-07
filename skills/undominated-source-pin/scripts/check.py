#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from pathlib import Path

FULL = re.compile(r"^[0-9a-fA-F]{40}$")
SCOPE = "a source is pinned only by a 40-hex revision you supply; a branch, a tag, or a short SHA is not resolved"


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def check(data):
    label = text(data.get("label"), "label")
    sources = data.get("sources")
    if not isinstance(sources, list) or not sources:
        raise ValueError("at least one source is required")
    parsed = []
    seen = set()
    for index, source in enumerate(sources):
        if not isinstance(source, dict):
            raise ValueError("each source must be an object")
        ident = text(source.get("id"), f"sources[{index}].id")
        if ident in seen:
            raise ValueError("each source id must be unique")
        seen.add(ident)
        if "revision" not in source:
            raise ValueError(f"sources[{index}].revision is required")
        revision = source.get("revision")
        if not isinstance(revision, str):
            raise ValueError(f"sources[{index}].revision must be a string")
        ref = source.get("ref", "")
        if ref is None or not isinstance(ref, str):
            raise ValueError(f"sources[{index}].ref must be a string when it is present")
        parsed.append({"id": ident, "revision": revision, "ref": ref})
    issues = []
    out = []
    for source in parsed:
        if FULL.fullmatch(source["revision"]):
            pinned = source["revision"].lower()
            form = "pinned"
        else:
            pinned = None
            form = "unpinned"
            shown = source["revision"] if source["revision"] else "(empty)"
            issues.append(f"{source['id']} revision {shown} is not a 40-hex pin")
        out.append({
            "id": source["id"],
            "form": form,
            "revision": pinned,
            "ref": source["ref"],
        })
    return {
        "status": "pass" if not issues else "review",
        "label": label,
        "sources": out,
        "issues": issues,
        "scope": SCOPE,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="JSON input path; no network fetches")
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.input).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("input must be a JSON object")
        result = check(data)
        print(json.dumps(result, indent=2))
        return 0 if result["status"] == "pass" else 1
    except (ValueError, KeyError, TypeError, OSError, ArithmeticError, AttributeError) as exc:
        print(json.dumps({"status": "invalid", "error": str(exc)}))
        return 2


if __name__ == "__main__":
    sys.exit(main())
