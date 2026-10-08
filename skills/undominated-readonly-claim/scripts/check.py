#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from pathlib import Path

MUTATIONS = frozenset({
    "delete", "remove", "create", "update", "send", "pay", "submit", "claim",
    "write", "drop", "insert", "execute", "purchase", "transfer", "post", "put",
    "patch", "destroy", "mutate", "charge",
})
TOKEN = re.compile(r"[a-z0-9]+")


def write_like(name):
    return sorted(set(TOKEN.findall(name.lower())) & MUTATIONS)


def check(data):
    label = data.get("label")
    if not isinstance(label, str) or not label.strip():
        raise ValueError("label must be non-empty text")
    claim = data.get("claimsReadOnly")
    if not isinstance(claim, bool):
        raise ValueError("claimsReadOnly must be a boolean")
    tools = data.get("tools")
    if not isinstance(tools, list):
        raise ValueError("tools must be an array")
    seen = set()
    observed = []
    for tool in tools:
        if not isinstance(tool, str) or not tool.strip() or tool in seen:
            raise ValueError("each tool name must be unique non-empty text")
        seen.add(tool)
        matched = write_like(tool)
        if matched:
            observed.append({"name": tool, "tokens": matched})
    issues = []
    if claim and not tools:
        issues.append("a read-only claim has no tool names to check")
    if claim and observed:
        issues.append("a read-only claim lists a tool name with a mutation token")
    return {
        "status": "review" if issues else "pass",
        "label": label,
        "claimsReadOnly": claim,
        "toolCount": len(tools),
        "writeLike": observed,
        "issues": issues,
        "scope": "name tokens only; a pass is not proof the handlers are read-only",
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
