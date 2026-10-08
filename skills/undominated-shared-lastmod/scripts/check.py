#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

DAY = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_day(value, label):
    if not isinstance(value, str) or not DAY.fullmatch(value):
        raise ValueError(f"{label} must be YYYY-MM-DD")
    year, month, day = (int(part) for part in value.split("-"))
    try:
        return date(year, month, day)
    except ValueError as exc:
        raise ValueError(f"{label} is not a real date") from exc


def check(data):
    build = parse_day(data.get("buildDay"), "buildDay")
    pages = data.get("pages")
    if not isinstance(pages, list) or not pages:
        raise ValueError("pages must be a non-empty array")
    seen = set()
    rows = []
    issues = []
    for page in pages:
        if not isinstance(page, dict):
            raise ValueError("each page must be an object")
        path = page.get("path")
        if not isinstance(path, str) or not path.startswith("/") or not path.endswith("/") or path in seen:
            raise ValueError("each page path must be a unique path ending with /")
        seen.add(path)
        lastmod = parse_day(page.get("lastmod"), f"{path} lastmod")
        state = "dated"
        if lastmod > build:
            issues.append(f"{path} lastmod {lastmod.isoformat()} is after buildDay {build.isoformat()}")
            state = "future"
        rows.append({"path": path, "lastmod": lastmod.isoformat(), "state": state})
    dates = {row["lastmod"] for row in rows}
    if len(rows) >= 2 and dates == {build.isoformat()}:
        issues.append(f"all {len(rows)} pages share buildDay {build.isoformat()}; a shared build clock is not a per-page fact date")
        for row in rows:
            row["state"] = "build-clock"
    return {
        "status": "review" if issues else "pass",
        "buildDay": build.isoformat(),
        "pages": len(rows),
        "distinctDates": len(dates),
        "rows": rows,
        "issues": issues,
        "scope": "supplied lastmod values only; one page dated on the build day can be a real change, and a shared older date can be the day a record began",
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
