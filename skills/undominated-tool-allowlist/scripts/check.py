#!/usr/bin/env python3
"""Decide whether a saved permission map fits a task allowlist.

The map is an input, not something this checker invents. A pass means the
decision matches the allowlist. A refuse decision can still pass when the
caller expected the task to be refused. Python 3 standard library only.
"""
import hashlib
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

PERMISSIONS = ("read", "write", "network", "credential", "shell", "payment")
NAME = re.compile(r"^[A-Za-z0-9_.:/-]{1,120}$")


def read_local(base, value):
    if not isinstance(value, str) or not value:
        raise ValueError("receipt path must be a non-empty relative string")
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError("receipt path must stay inside the input directory")
    current = base
    for part in path.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("receipt symlinks are not allowed")
    if not current.resolve().is_relative_to(base.resolve()):
        raise ValueError("receipt path escapes the input directory")
    return current.read_bytes()


def check(data, base):
    if not isinstance(data.get("task"), str) or not data["task"].strip():
        raise ValueError("task must be non-empty text")
    url = urlparse(data["sourceUrl"])
    if url.scheme != "https" or not url.netloc:
        raise ValueError("sourceUrl must be HTTPS")
    date.fromisoformat(data["observedAt"])
    if data.get("expectedDecision") not in ("allow", "refuse"):
        raise ValueError("expectedDecision must be allow or refuse")
    if not isinstance(data.get("sha256"), str) or not re.fullmatch(r"[a-f0-9]{64}", data["sha256"]):
        raise ValueError("sha256 must be 64 lowercase hexadecimal characters")
    allow = data.get("allow")
    if not isinstance(allow, list) or not allow or any(item not in PERMISSIONS for item in allow) or len(allow) != len(set(allow)):
        raise ValueError("allow must be a non-empty unique list of permission classes")
    raw = read_local(base, data["receiptFile"])
    digest = hashlib.sha256(raw).hexdigest()
    issues = []
    if digest != data["sha256"]:
        issues.append("receipt hash mismatch")
    try:
        receipt = json.loads(raw.decode("utf-8"))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"receipt is not UTF-8 JSON: {exc}") from exc
    tools = receipt.get("tools") if isinstance(receipt, dict) else None
    if not isinstance(tools, list):
        raise ValueError("receipt tools must be an array")
    seen = set()
    blocked = []
    for tool in tools:
        if not isinstance(tool, dict):
            raise ValueError("each tool must be an object")
        name, permission = tool.get("name"), tool.get("permission")
        if not isinstance(name, str) or not NAME.fullmatch(name):
            raise ValueError("tool name is missing or not a token")
        if permission not in PERMISSIONS:
            raise ValueError(f"tool {name} has a permission outside the class list")
        if name in seen:
            raise ValueError(f"duplicate tool {name}")
        seen.add(name)
        if permission not in allow:
            blocked.append({"name": name, "permission": permission})
    decision = "refuse" if blocked else "allow"
    if decision != data["expectedDecision"]:
        issues.append(f"decision is {decision}, expected {data['expectedDecision']}")
    return {
        "status": "review" if issues else "pass",
        "task": data["task"],
        "decision": decision,
        "allow": allow,
        "blocked": blocked,
        "toolCount": len(tools),
        "sha256": digest,
        "issues": issues,
        "scope": "Allowlist decision over a saved map. Tools were not called. A pass that refuses is a consistent refusal, not approval to run the task.",
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
