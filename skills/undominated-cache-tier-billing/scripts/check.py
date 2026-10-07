#!/usr/bin/env python3
"""Local deterministic check. Python 3 standard library; no network or writes."""
import argparse
import json
import re
import sys
from decimal import Decimal, Inexact, localcontext
from pathlib import Path

MILLION = Decimal(1000000)


def exact_product(left, right):
    # The input contract has no fixed digit ceiling; 50 significant digits can lose a rate.
    with localcontext() as context:
        context.prec = len(left.as_tuple().digits) + len(right.as_tuple().digits)
        context.traps[Inexact] = True
        return left * right


def token_cost(tokens, unit_rate):
    product = exact_product(Decimal(tokens), unit_rate)
    with localcontext() as context:
        context.prec = len(product.as_tuple().digits) + len(MILLION.as_tuple().digits)
        context.traps[Inexact] = True
        return product / MILLION


def exact_sum(values):
    exponent = min(value.as_tuple().exponent for value in values)
    digits = max(len(value.as_tuple().digits) + value.as_tuple().exponent - exponent
                 for value in values)
    with localcontext() as context:
        context.prec = digits + len(str(len(values)))
        context.traps[Inexact] = True
        return sum(values, Decimal(0))


def money(value, label):
    if isinstance(value, bool) or not isinstance(value, str) or not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", value):
        raise ValueError(f"{label} must be a non-negative decimal string")
    return Decimal(value)


def rate(value, label, issues):
    """None means the publisher stated no rate. A JSON number is read but flagged.

    Reading a number keeps the breakdown printable; the issue it raises forces the
    review lane, so no float reaches a page on this path unattended.
    """
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        raise ValueError(f"{label} must be a non-negative decimal string or null")
    if not isinstance(value, str):
        issues.append(f"{label} is a JSON number rather than a decimal string")
        return Decimal(str(value))
    return money(value, label)


def count(value, label):
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"{label} must be a non-negative integer")
    return value


def check(data):
    if not isinstance(data.get("model"), str) or not data["model"].strip():
        raise ValueError("model must be non-empty text")
    if not re.fullmatch(r"[A-Z]{3}", data.get("currency", "")):
        raise ValueError("currency must be an explicit three-letter code")
    base = data.get("base")
    if not isinstance(base, dict):
        raise ValueError("base must be an object with input and output")
    request = data.get("request")
    if not isinstance(request, dict):
        raise ValueError("request must be an object")

    issues = []
    if base.get("input") is None or base.get("output") is None:
        raise ValueError("base.input and base.output are both required rates")
    base_input = rate(base.get("input"), "base.input", issues)
    base_output = rate(base.get("output"), "base.output", issues)
    cache_read = rate(data.get("cacheRead"), "cacheRead", issues)
    cache_write = rate(data.get("cacheWrite"), "cacheWrite", issues)
    multiplier = rate(data.get("cacheWriteMultiplier"), "cacheWriteMultiplier", issues)

    keys = ("inputTokens", "cachedPrefixTokens", "minimumCacheablePrefixTokens", "cacheWriteTokens", "outputTokens")
    tokens = {key: count(request.get(key), f"request.{key}") for key in keys}

    cache_write_billing = data.get("cacheWriteBilling")
    if tokens["cacheWriteTokens"] > 0 and cache_write_billing not in ("replacement", "surcharge"):
        raise ValueError("positive cacheWriteTokens requires explicit cacheWriteBilling: replacement or surcharge")
    if cache_write_billing is not None and cache_write_billing not in ("replacement", "surcharge"):
        raise ValueError("cacheWriteBilling must be replacement or surcharge when supplied")
    if cache_write_billing == "replacement" and tokens["cachedPrefixTokens"] + tokens["cacheWriteTokens"] > tokens["inputTokens"]:
        raise ValueError("replacement cache reads and writes must not exceed inputTokens together")

    # An absolute published price outranks a multiple of it, so it wins when both arrive.
    if cache_write is not None and multiplier is not None:
        issues.append("cacheWrite and cacheWriteMultiplier were both supplied; the absolute rate was used")
    if multiplier == 0:
        issues.append("cacheWriteMultiplier is zero, which would bill a cache write at no cost")
    if tokens["cachedPrefixTokens"] > tokens["inputTokens"]:
        issues.append("cachedPrefixTokens exceeds inputTokens; the uncached remainder was clamped to zero")
    if tokens["cacheWriteTokens"] > tokens["inputTokens"]:
        issues.append("cacheWriteTokens exceeds inputTokens")

    # A prefix shorter than the publisher's minimum does not receive the cache
    # rate. Saying it "does not qualify" while still multiplying by cacheRead
    # underpriced the cached share.
    below_minimum = 0 < tokens["cachedPrefixTokens"] < tokens["minimumCacheablePrefixTokens"]
    if below_minimum:
        issues.append("cachedPrefixTokens is below minimumCacheablePrefixTokens, so the cached share does not qualify for the cache tier and bills at the base input rate")
        cache_read_rate, cache_read_form, cache_read_source = base_input, "below-minimum-billed-at-uncached-input", "base.input"
    elif cache_read is None:
        # No published cache-read rate means the cached share bills as uncached input.
        # Absence is never billed as the cheaper cache price.
        cache_read_rate, cache_read_form, cache_read_source = base_input, "absent-billed-at-uncached-input", "base.input"
    else:
        cache_read_rate, cache_read_form, cache_read_source = cache_read, "absolute", "cacheRead"

    if cache_write is not None:
        cache_write_rate, cache_write_form, cache_write_source = cache_write, "absolute", "cacheWrite"
    elif multiplier is not None:
        cache_write_rate, cache_write_form, cache_write_source = exact_product(base_input, multiplier), "multiplier-of-base-input", "cacheWriteMultiplier"
    elif tokens["cacheWriteTokens"] > 0:
        cache_write_rate, cache_write_form, cache_write_source = base_input, "absent-billed-at-uncached-input", "base.input"
        issues.append("no cache-write rate was supplied for a request that wrote cached tokens; the write billed at the base input rate")
    else:
        cache_write_rate, cache_write_form, cache_write_source = Decimal(0), "absent-no-write-billed", None

    cached_tokens = min(tokens["cachedPrefixTokens"], tokens["inputTokens"])
    replaced_write_tokens = tokens["cacheWriteTokens"] if cache_write_billing == "replacement" else 0
    uncached_tokens = max(tokens["inputTokens"] - tokens["cachedPrefixTokens"] - replaced_write_tokens, 0)
    components = {
        "inputUncached": token_cost(uncached_tokens, base_input),
        "cacheRead": token_cost(cached_tokens, cache_read_rate),
        "cacheWrite": token_cost(tokens["cacheWriteTokens"], cache_write_rate),
        "output": token_cost(tokens["outputTokens"], base_output),
    }
    total = exact_sum(list(components.values()))
    return {
        "status": "review" if issues else "pass",
        "model": data["model"],
        "currency": data["currency"],
        "cacheWriteBilling": cache_write_billing,
        "tokens": {
            "inputTokens": tokens["inputTokens"],
            "cachedPrefixTokens": cached_tokens,
            "inputUncachedTokens": uncached_tokens,
            "cacheWriteTokens": tokens["cacheWriteTokens"],
            "outputTokens": tokens["outputTokens"],
        },
        "components": {key: format(value, "f") for key, value in components.items()},
        "total": format(total, "f"),
        "rateBasis": {
            "inputUncached": {"form": "absolute", "perMillion": format(base_input, "f"), "source": "base.input"},
            "cacheRead": {"form": cache_read_form, "perMillion": format(cache_read_rate, "f"), "source": cache_read_source},
            "cacheWrite": {
                "form": cache_write_form,
                "perMillion": format(cache_write_rate, "f"),
                "source": cache_write_source,
            },
            "output": {"form": "absolute", "perMillion": format(base_output, "f"), "source": "base.output"},
        },
        "issues": issues,
        "scope": "one request against one published rate set; exact decimals, no context-tier ladder, no billing-period or subscription rules",
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