#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from pathlib import Path

# A path only. A host, a query, or a fragment is rejected rather than parsed.
PATH = re.compile(r"^/(?:[A-Za-z0-9._~-]+(?:/[A-Za-z0-9._~-]+)*)?$")
SCOPE = (
    "a fetched page supports a path only when the final path you supply equals the requested path; "
    "one trailing slash is collapsed, the host is not compared, and no request is sent"
)


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def path(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    raw = value.strip()
    if "://" in raw or "?" in raw or "#" in raw or " " in raw or not raw.startswith("/"):
        raise ValueError(f"{label} must be a path, not a URL")
    if len(raw) > 1 and raw.endswith("/"):
        raw = raw[:-1]
    if not PATH.fullmatch(raw):
        raise ValueError(f"{label} is not a path")
    # A dot segment is a different path shape. Do not resolve it into the requested path.
    if any(part in {".", ".."} for part in raw.split("/")):
        raise ValueError(f"{label} must not contain a dot segment")
    return raw


def check(data):
    label = text(data.get("label"), "label")
    responses = data.get("responses")
    if not isinstance(responses, list) or not responses:
        raise ValueError("at least one response is required")
    parsed = []
    seen = set()
    for index, item in enumerate(responses):
        if not isinstance(item, dict):
            raise ValueError("each response must be an object")
        if "amount" in item or "price" in item:
            raise ValueError(f"responses[{index}] must not include an amount or a price")
        ident = text(item.get("id"), f"responses[{index}].id")
        if ident in seen:
            raise ValueError("each response id must be unique")
        seen.add(ident)
        if "requestedPath" not in item or "finalPath" not in item:
            raise ValueError(f"responses[{index}] needs requestedPath and finalPath")
        parsed.append(
            {
                "id": ident,
                "requestedPath": path(item.get("requestedPath"), f"responses[{index}].requestedPath"),
                "finalPath": path(item.get("finalPath"), f"responses[{index}].finalPath"),
            }
        )
    issues = []
    out = []
    for item in parsed:
        same = item["requestedPath"] == item["finalPath"]
        if not same:
            issues.append(
                f"{item['id']} final path {item['finalPath']} is not the requested path {item['requestedPath']}"
            )
        out.append(
            {
                "id": item["id"],
                "form": "same" if same else "redirected",
                "requestedPath": item["requestedPath"],
                "finalPath": item["finalPath"],
            }
        )
    return {
        "status": "pass" if not issues else "review",
        "label": label,
        "responses": out,
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
