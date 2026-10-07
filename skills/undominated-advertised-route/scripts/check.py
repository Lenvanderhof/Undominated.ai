#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

LOCALE = re.compile(r"^[a-z]{2}$")
ROUTE = re.compile(r"^/(?:[A-Za-z0-9][A-Za-z0-9._-]*/)*$")


def https_origin(parts):
    # A non-empty netloc alone accepted absent hosts and ports that no URL client can use.
    if parts.scheme != "https" or not parts.hostname:
        raise ValueError("URL must have an explicit https scheme and hostname")
    if parts.username is not None or parts.password is not None:
        raise ValueError("credentials are not permitted in a crawl-list origin or URL")
    if parts.netloc.endswith(":"):
        raise ValueError("an explicit port separator must be followed by a numeric port")
    parts.port  # urllib validates port syntax and the allowed numeric range on access.
    return f"{parts.scheme}://{parts.netloc}"


def file_for(pathname, markdown):
    name = "index.md" if markdown else "index.html"
    if pathname == "/":
        return name
    return f"{pathname.strip('/')}/{name}"


def check(data):
    site = data.get("site")
    parsed_site = urlsplit(site) if isinstance(site, str) else urlsplit("")
    origin = https_origin(parsed_site)
    if parsed_site.path not in ("", "/") or parsed_site.query or parsed_site.fragment:
        raise ValueError("site must be an https origin")
    english = data.get("englishOnly")
    locales = data.get("locales")
    advertised = data.get("advertised")
    files = data.get("files")
    if not isinstance(english, list) or not english or any(not isinstance(path, str) or not ROUTE.fullmatch(path) for path in english) or len(set(english)) != len(english):
        raise ValueError("englishOnly must be unique /-terminated paths")
    if not isinstance(locales, list) or not locales or any(not isinstance(code, str) or not LOCALE.fullmatch(code) for code in locales) or len(set(locales)) != len(locales):
        raise ValueError("locales must be unique two-letter codes")
    if not isinstance(advertised, list) or not isinstance(files, list):
        raise ValueError("advertised and files must be arrays")
    if any(not isinstance(name, str) or not name or name.startswith("/") or ".." in name.split("/") for name in files) or len(set(files)) != len(files):
        raise ValueError("each file must be a unique relative path")
    present = set(files)
    issues = []
    rows = []
    seen = set()
    if not advertised:
        issues.append("no URLs were supplied; an empty crawl list proves nothing")
    for url in advertised:
        if not isinstance(url, str) or url in seen:
            raise ValueError("each advertised URL must be unique text")
        seen.add(url)
        parts = urlsplit(url)
        advertised_origin = https_origin(parts)
        row = {"url": url, "serves": None}
        local = []
        if advertised_origin != origin:
            local.append("off-origin URL does not belong in this site's crawl list")
        elif parts.fragment:
            local.append("a fragment is not a separate page")
        elif parts.query not in ("", "format=md"):
            local.append("only an empty query or format=md maps to a static sibling file")
        elif not ROUTE.fullmatch(parts.path):
            local.append("path must end with / and contain no traversal")
        else:
            segments = [segment for segment in parts.path.split("/") if segment]
            if segments and segments[0] in set(locales):
                rest = segments[1:]
                stripped = ("/" + "/".join(rest) + "/") if rest else "/"
                if stripped in set(english):
                    local.append(f"locale prefix {segments[0]} is advertised on English-only path {stripped}")
            required = file_for(parts.path, parts.query == "format=md")
            row["serves"] = required
            if required not in present:
                kind = "markdown sibling" if parts.query == "format=md" else "html page"
                local.append(f"advertised {kind} has no supplied file {required}")
        issues.extend(f"{url}: {item}" for item in local)
        rows.append(row)
    return {
        "status": "review" if issues else "pass",
        "site": origin,
        "advertised": len(rows),
        "files": len(present),
        "rows": rows,
        "issues": issues,
        "scope": "supplied URL list against supplied relative files; no fetch and no claim that a present file's contents are correct",
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
