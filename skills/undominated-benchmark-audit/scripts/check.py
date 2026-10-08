#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import sys
from pathlib import Path

import math
from datetime import date
from urllib.parse import urlparse


def correlation(a, b):
    # Positive rescaling preserves correlation and prevents finite inputs from
    # overflowing during centering or squaring (for example scores near 1e308).
    scale_a, scale_b = max(map(abs, a)), max(map(abs, b))
    if not scale_a or not scale_b:
        return None
    a, b = [x / scale_a for x in a], [x / scale_b for x in b]
    ma, mb = math.fsum(a) / len(a), math.fsum(b) / len(b)
    da, db = [x - ma for x in a], [x - mb for x in b]
    divisor = math.sqrt(math.fsum(x*x for x in da)) * math.sqrt(math.fsum(x*x for x in db))
    if not divisor:
        return None
    result = math.fsum(x*y for x, y in zip(da, db)) / divisor
    if not math.isfinite(result):
        raise ValueError("correlation has a non-finite intermediate result")
    return max(-1.0, min(1.0, result))


def ranks(values):
    ordered = sorted(range(len(values)), key=values.__getitem__)
    result, start = [0.0] * len(values), 0
    while start < len(ordered):
        end = start + 1
        while end < len(ordered) and values[ordered[end]] == values[ordered[start]]:
            end += 1
        average = (start + 1 + end) / 2
        for index in ordered[start:end]:
            result[index] = average
        start = end
    return result


def check(data):
    for key in ("population", "selection"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError(f"{key} must be non-empty text")
    date.fromisoformat(data["observedAt"])
    urls = data["sourceUrls"]
    if not isinstance(urls, list) or not urls or any(urlparse(url).scheme != "https" or not urlparse(url).netloc for url in urls):
        raise ValueError("sourceUrls must contain HTTPS URLs")
    if not isinstance(data["rows"], list) or not data["rows"]:
        raise ValueError("rows must be a non-empty array")
    identities, matched, missing = set(), [], []
    for row in data["rows"]:
        ident = row["id"]
        if not isinstance(ident, str) or not ident.strip() or ident in identities:
            raise ValueError("model ids must be unique non-empty strings")
        identities.add(ident)
        scores = [row["a"], row["b"]]
        if any(x is not None and (type(x) not in (int, float) or not math.isfinite(x)) for x in scores):
            raise ValueError("scores must be finite numbers or null")
        if None in scores:
            missing.append(ident)
        else:
            matched.append(scores)
    issues = []
    pearson = spearman = None
    if len(matched) < 3:
        issues.append("fewer than three matched models")
    else:
        a, b = map(list, zip(*matched))
        pearson, spearman = correlation(a, b), correlation(ranks(a), ranks(b))
        if pearson is None:
            issues.append("constant score column; correlation undefined")
    if missing:
        issues.append("missing scores restrict the matched cohort")
    return {"status": "review" if issues else "pass", "population": data["population"], "selection": data["selection"], "totalModels": len(identities), "matchedModels": len(matched), "coverage": len(matched) / len(identities), "missingModels": missing, "pearson": pearson, "spearman": spearman, "issues": issues, "scope": "descriptive correlation of supplied matched cohort only"}


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
