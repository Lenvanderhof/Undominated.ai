#!/usr/bin/env python3
"""Bind an MCP tools/list capture to explicit permission labels.

The checker never infers a permission from a tool description. A read-only
claim is a statement to test against the labels, not evidence that the server
is read-only. Python 3 standard library only. No network and no writes.
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
    if not isinstance(value, str) or not value or value.startswith("/"):
        raise ValueError("evidence path must be a non-empty relative string")
    path = Path(value)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError("evidence path must stay inside the input directory")
    current = base
    for part in path.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("evidence symlinks are not allowed")
    if not current.resolve().is_relative_to(base.resolve()):
        raise ValueError("evidence path escapes the input directory")
    return current.read_bytes()


def check(data, base):
    for key in ("serverName", "evidenceFile", "sha256"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError(f"{key} must be non-empty text")
    url = urlparse(data["sourceUrl"])
    if url.scheme != "https" or not url.netloc:
        raise ValueError("sourceUrl must be HTTPS")
    date.fromisoformat(data["observedAt"])
    if not isinstance(data.get("claimsReadOnly"), bool):
        raise ValueError("claimsReadOnly must be a boolean")
    if not re.fullmatch(r"[a-f0-9]{64}", data["sha256"]):
        raise ValueError("sha256 must be 64 lowercase hexadecimal characters")
    raw = read_local(base, data["evidenceFile"])
    digest = hashlib.sha256(raw).hexdigest()
    issues = []
    if digest != data["sha256"]:
        issues.append("evidence hash mismatch")
    try:
        captured = json.loads(raw.decode("utf-8"))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"evidence file is not UTF-8 JSON: {exc}") from exc
    tools = captured.get("tools") if isinstance(captured, dict) else None
    if not isinstance(tools, list) or not tools:
        raise ValueError("evidence tools must be a non-empty array")
    names = []
    for tool in tools:
        name = tool.get("name") if isinstance(tool, dict) else None
        if not isinstance(name, str) or not NAME.fullmatch(name):
            raise ValueError("each tool name must match the allowed token pattern")
        names.append(name)
    if len(names) != len(set(names)):
        raise ValueError("duplicate tool names in the capture")
    labels = data.get("labels")
    if not isinstance(labels, list) or not labels:
        raise ValueError("labels must be a non-empty array")
    assigned = {}
    for label in labels:
        if not isinstance(label, dict):
            raise ValueError("each label must be an object")
        name, permission = label.get("name"), label.get("permission")
        if not isinstance(name, str) or not isinstance(permission, str):
            raise ValueError("each label needs a name and a permission")
        if permission not in PERMISSIONS:
            raise ValueError(f"permission must be one of: {', '.join(PERMISSIONS)}")
        if name in assigned:
            raise ValueError(f"duplicate label for {name}")
        assigned[name] = permission
    missing = [name for name in names if name not in assigned]
    extra = [name for name in assigned if name not in set(names)]
    if missing:
        issues.append("unlabeled tools: " + ", ".join(missing))
    if extra:
        issues.append("labels name tools absent from the capture: " + ", ".join(extra))
    counts = {permission: 0 for permission in PERMISSIONS}
    for name in names:
        if name in assigned:
            counts[assigned[name]] += 1
    mutating = sum(counts[permission] for permission in PERMISSIONS if permission != "read")
    if data["claimsReadOnly"] and mutating:
        issues.append("read-only claim is contradicted by a non-read label")
    expected = data.get("expectedCounts")
    if expected is not None:
        if not isinstance(expected, dict) or set(expected) != set(PERMISSIONS):
            raise ValueError("expectedCounts must name every permission class")
        for permission in PERMISSIONS:
            if expected[permission] != counts[permission]:
                issues.append(f"{permission} count {counts[permission]} != expected {expected[permission]}")
    return {
        "status": "review" if issues else "pass",
        "serverName": data["serverName"],
        "observedAt": data["observedAt"],
        "toolCount": len(names),
        "counts": counts,
        "mutating": mutating,
        "claimsReadOnly": data["claimsReadOnly"],
        "sha256": digest,
        "issues": issues,
        "scope": "Label coverage and claim contradiction only. Descriptions were not read. This is not a runtime or security certification.",
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
