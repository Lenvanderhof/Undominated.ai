#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path

import hashlib
import re
from datetime import datetime
from urllib.parse import urlparse


def read_local(base, value):
    if not isinstance(value, str) or not value:
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


def check(data):
    if not isinstance(data["release"], str) or not data["release"].strip():
        raise ValueError("release identity is required")
    if not isinstance(data["artifacts"], list) or not data["artifacts"] or not isinstance(data["publicReceipts"], list) or not data["publicReceipts"]:
        raise ValueError("artifacts and publicReceipts must be non-empty arrays")
    base, issues, verified = Path(sys.argv[1]).resolve().parent, [], []
    for item in data["artifacts"]:
        if not re.fullmatch(r"[a-fA-F0-9]{64}", item["sha256"]):
            raise ValueError("artifact sha256 must be 64 hexadecimal characters")
        digest = hashlib.sha256(read_local(base, item["path"])).hexdigest()
        if digest != item["sha256"].lower():
            issues.append(f"artifact mismatch: {item['path']}")
        verified.append({"path": item["path"], "sha256": digest})
    for receipt in data["publicReceipts"]:
        url = urlparse(receipt["url"])
        if url.scheme != "https" or not url.netloc:
            raise ValueError("receipt URL must be HTTPS")
        when = datetime.fromisoformat(receipt["checkedAt"].replace("Z", "+00:00"))
        if when.tzinfo is None:
            raise ValueError("checkedAt needs a timezone")
        status, expected = receipt["status"], receipt["requiredText"]
        if type(status) is not int or not 100 <= status <= 599:
            raise ValueError("status must be an HTTP integer")
        if not isinstance(expected, str) or not expected.strip():
            raise ValueError("requiredText must be a meaningful non-empty marker")
        forbidden = receipt["forbiddenText"]
        if not isinstance(forbidden, list) or any(not isinstance(x, str) or not x for x in forbidden):
            raise ValueError("forbiddenText must be a string array")
        body = read_local(base, receipt["bodyFile"]).decode("utf-8")
        if not 200 <= status < 300 or expected not in body or any(x.casefold() in body.casefold() for x in forbidden):
            issues.append(f"public receipt failed: {receipt['url']}")
    runtime = data["runtime"]
    if runtime["passed"] is not None and type(runtime["passed"]) is not bool:
        raise ValueError("runtime.passed must be boolean or null")
    if runtime["passed"] is not True or not isinstance(runtime["evidence"], str) or not runtime["evidence"].strip():
        issues.append("runtime installation is unverified or failed")
    return {"status": "review" if issues else "pass", "release": data["release"], "artifacts": verified, "issues": issues, "scope": "offline verification of supplied release receipts"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="JSON input path; no network fetches")
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.input).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("input must be a JSON object")
        result = check(data)
        print(json.dumps(result, indent=2, allow_nan=False))
        return 0 if result["status"] == "pass" else 1
    except (ValueError, KeyError, TypeError, OSError, ArithmeticError, AttributeError, IndexError) as exc:
        print(json.dumps({"status": "invalid", "error": str(exc)}))
        return 2

if __name__ == "__main__":
    sys.exit(main())
