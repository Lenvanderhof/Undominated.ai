#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path

READS = {"http_get", "read_file", "list"}
WRITES = {"write_file", "mkdir", "remove", "http_post", "http_put", "http_patch", "http_delete", "exec"}
OPS = READS | WRITES


def text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be non-empty text")
    return value


def check(data):
    label = text(data.get("label"), "label")
    tools = data.get("tools")
    if not isinstance(tools, list) or not tools:
        raise ValueError("at least one tool is required")
    parsed = []
    seen = set()
    for index, tool in enumerate(tools):
        if not isinstance(tool, dict):
            raise ValueError("each tool must be an object")
        name = text(tool.get("name"), f"tools[{index}].name")
        if name in seen:
            raise ValueError("each tool name must be unique")
        seen.add(name)
        hint = tool.get("readOnlyHint")
        if not isinstance(hint, bool) and hint is not None:
            raise ValueError(f"tools[{index}].readOnlyHint must be true, false, or null")
        operations = tool.get("operations")
        if not isinstance(operations, list) or not all(isinstance(item, str) for item in operations):
            raise ValueError(f"tools[{index}].operations must be a list of operation names")
        if len(set(operations)) != len(operations):
            raise ValueError(f"tools[{index}].operations contains a duplicate")
        unknown = [item for item in operations if item not in OPS]
        if unknown:
            raise ValueError(f"tools[{index}].operations contains an operation that is not allowlisted")
        parsed.append({"name": name, "readOnlyHint": hint, "operations": operations})
    issues = []
    rows = []
    for tool in parsed:
        writes = [op for op in tool["operations"] if op in WRITES]
        if tool["readOnlyHint"] is not True:
            form = "not-claimed"
        elif not tool["operations"]:
            form = "unsupported"
            issues.append(f"{tool['name']} sets readOnlyHint true and lists no operations")
        elif writes:
            form = "contradicted"
            issues.append(f"{tool['name']} sets readOnlyHint true and lists {', '.join(writes)}")
        else:
            form = "matched"
        rows.append({
            "name": tool["name"],
            "readOnlyHint": tool["readOnlyHint"],
            "operations": tool["operations"],
            "form": form,
        })
    return {
        "status": "review" if issues else "pass",
        "label": label,
        "tools": rows,
        "issues": issues,
        "scope": "a true read-only hint is supported only by a non-empty list of read operations you supply; tool names are not inspected",
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
