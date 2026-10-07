#!/usr/bin/env python3
"""Local deterministic check for prompt cost estimation.
Python 3 standard library only; zero external dependencies.
Performs exact decimal arithmetic, validates trajectory tokens, and enforces boundary safety.
"""
import argparse
import json
import re
import sys
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


def safe_decimal(value, label: str) -> Decimal:
    if isinstance(value, bool):
        raise ValueError(f"{label} cannot be a boolean")
    if isinstance(value, (int, str)):
        s = str(value).strip()
        if not re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?", s):
            raise ValueError(f"{label} must be a non-negative decimal string or integer, got: {value}")
        d = Decimal(s)
        if not d.is_finite() or d < 0:
            raise ValueError(f"{label} must be a finite non-negative number")
        return d
    raise ValueError(f"{label} must be a decimal string or integer, got {type(value).__name__}")


def safe_int(value, label: str, allow_zero: bool = True) -> int:
    if isinstance(value, bool):
        raise ValueError(f"{label} cannot be a boolean")
    if not isinstance(value, int):
        raise ValueError(f"{label} must be an integer, got {type(value).__name__}")
    if allow_zero and value < 0:
        raise ValueError(f"{label} must be non-negative, got {value}")
    if not allow_zero and value <= 0:
        raise ValueError(f"{label} must be strictly positive, got {value}")
    return value


def verify_path_security(path: Path, label: str):
    if path.is_symlink():
        raise ValueError(f"{label} symlinks are strictly forbidden: {path}")
    for parent in path.parents:
        if parent.is_symlink():
            raise ValueError(f"{label} parent directory symlinks are strictly forbidden: {parent}")


def resolve_safe_relative_file(base_dir: Path, rel_str: str) -> Path:
    if not isinstance(rel_str, str) or not rel_str.strip():
        raise ValueError("relative path must be a non-empty string")
    p = Path(rel_str)
    if p.is_absolute() or ".." in p.parts:
        raise ValueError(f"path traversal not permitted: '{rel_str}'")
    current = base_dir
    for part in p.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError(f"symlinks are forbidden in path: {current}")
    resolved = current.resolve()
    base_resolved = base_dir.resolve()
    if not resolved.is_relative_to(base_resolved):
        raise ValueError(f"path escapes base directory: {rel_str}")
    if not resolved.is_file():
        raise ValueError(f"referenced file does not exist or is not a regular file: {rel_str}")
    return resolved


def parse_pricing_ladders(raw_ladders: list) -> list:
    if not isinstance(raw_ladders, list) or not raw_ladders:
        raise ValueError("ladders must be a non-empty list of tiers")
    parsed = []
    prev_cap = 0
    for idx, rung in enumerate(raw_ladders):
        if not isinstance(rung, dict):
            raise ValueError(f"ladder rung {idx} must be an object")
        cap = rung.get("maxInputTokens")
        if idx == len(raw_ladders) - 1:
            if cap is not None:
                raise ValueError("the final ladder rung must have maxInputTokens=null (unbounded)")
        else:
            if cap is None:
                raise ValueError(f"intermediate ladder rung {idx} must have an integer maxInputTokens cap")
            cap = safe_int(cap, f"rung[{idx}].maxInputTokens", allow_zero=False)
            if cap <= prev_cap:
                raise ValueError(f"rung[{idx}].maxInputTokens must be strictly greater than preceding rung cap")
            prev_cap = cap
        
        uncached = safe_decimal(rung.get("uncachedInputPerMillion"), f"rung[{idx}].uncachedInputPerMillion")
        cache_read = safe_decimal(rung.get("cacheReadInputPerMillion"), f"rung[{idx}].cacheReadInputPerMillion")
        cache_write_val = rung.get("cacheWriteInputPerMillion")
        cache_write = safe_decimal(cache_write_val, f"rung[{idx}].cacheWriteInputPerMillion") if cache_write_val is not None else uncached
        output_rate = safe_decimal(rung.get("outputPerMillion"), f"rung[{idx}].outputPerMillion")
        reasoning_rate_val = rung.get("reasoningOutputPerMillion")
        reasoning_rate = safe_decimal(reasoning_rate_val, f"rung[{idx}].reasoningOutputPerMillion") if reasoning_rate_val is not None else output_rate

        parsed.append({
            "maxInputTokens": cap,
            "uncachedInputPerMillion": uncached,
            "cacheReadInputPerMillion": cache_read,
            "cacheWriteInputPerMillion": cache_write,
            "outputPerMillion": output_rate,
            "reasoningOutputPerMillion": reasoning_rate,
        })
    return parsed


def find_ladder_rung(ladders: list, input_tokens: int) -> dict:
    for rung in ladders:
        cap = rung["maxInputTokens"]
        if cap is None or input_tokens <= cap:
            return rung
    return ladders[-1]


def check(data: dict, base_dir: Path) -> dict:
    if not isinstance(data.get("workloadId"), str) or not data["workloadId"].strip():
        raise ValueError("workloadId must be non-empty text")
    model_name = data.get("model")
    if not isinstance(model_name, str) or not model_name.strip():
        raise ValueError("model must be non-empty text")
    
    currency = data.get("currency", "USD")
    if not re.fullmatch(r"[A-Z]{3}", currency):
        raise ValueError("currency must be an explicit 3-letter ISO code (e.g. USD)")

    # Load pricing ladder: either from pricingTable or inline ladders
    ladders = None
    provider = data.get("provider", "Unspecified")
    if "pricingTable" in data:
        pricing_file = resolve_safe_relative_file(base_dir, data["pricingTable"])
        pricing_data = json.loads(pricing_file.read_text(encoding="utf-8"))
        if not isinstance(pricing_data, dict) or "models" not in pricing_data:
            raise ValueError("pricing table file must be an object with a 'models' dictionary")
        if model_name not in pricing_data["models"]:
            raise ValueError(f"model '{model_name}' not found in pricing table: {data['pricingTable']}")
        model_entry = pricing_data["models"][model_name]
        provider = model_entry.get("provider", provider)
        ladders = parse_pricing_ladders(model_entry.get("ladders", []))
    elif "ladders" in data:
        ladders = parse_pricing_ladders(data["ladders"])
    else:
        raise ValueError("either 'pricingTable' relative path or inline 'ladders' must be provided")

    turns_data = data.get("turns")
    if not isinstance(turns_data, list) or not turns_data:
        raise ValueError("turns must be a non-empty array of turn objects")

    turns_breakdown = []
    tot_uncached_in = 0
    tot_cache_read = 0
    tot_cache_write = 0
    tot_reasoning = 0
    tot_completion = 0
    tot_cost = Decimal("0")
    tot_unoptimized_cost = Decimal("0")

    one_million = Decimal("1000000")

    for idx, turn in enumerate(turns_data):
        if not isinstance(turn, dict):
            raise ValueError(f"turn at index {idx} must be an object")
        turn_num = safe_int(turn.get("turn", idx + 1), f"turns[{idx}].turn")
        uncached_in = safe_int(turn.get("uncachedInputTokens", 0), f"turns[{idx}].uncachedInputTokens")
        cache_read = safe_int(turn.get("cacheReadTokens", 0), f"turns[{idx}].cacheReadTokens")
        cache_write = safe_int(turn.get("cacheWriteTokens", 0), f"turns[{idx}].cacheWriteTokens")
        reasoning = safe_int(turn.get("reasoningTokens", 0), f"turns[{idx}].reasoningTokens")
        completion = safe_int(turn.get("completionTokens", 0), f"turns[{idx}].completionTokens")

        turn_input_tokens = uncached_in + cache_read + cache_write
        turn_output_tokens = reasoning + completion
        turn_total_tokens = turn_input_tokens + turn_output_tokens

        if turn_total_tokens == 0:
            raise ValueError(f"turn {turn_num} has zero total tokens")

        rung = find_ladder_rung(ladders, turn_input_tokens)

        cost_uncached = (Decimal(uncached_in) * rung["uncachedInputPerMillion"]) / one_million
        cost_cache_read = (Decimal(cache_read) * rung["cacheReadInputPerMillion"]) / one_million
        cost_cache_write = (Decimal(cache_write) * rung["cacheWriteInputPerMillion"]) / one_million
        cost_reasoning = (Decimal(reasoning) * rung["reasoningOutputPerMillion"]) / one_million
        cost_completion = (Decimal(completion) * rung["outputPerMillion"]) / one_million

        turn_cost = cost_uncached + cost_cache_read + cost_cache_write + cost_reasoning + cost_completion

        # Counterfactual unoptimized cost: all input tokens at full uncached rate, all outputs at outputPerMillion
        unopt_input = (Decimal(turn_input_tokens) * rung["uncachedInputPerMillion"]) / one_million
        unopt_output = (Decimal(turn_output_tokens) * rung["outputPerMillion"]) / one_million
        turn_unoptimized = unopt_input + unopt_output

        tot_uncached_in += uncached_in
        tot_cache_read += cache_read
        tot_cache_write += cache_write
        tot_reasoning += reasoning
        tot_completion += completion
        tot_cost += turn_cost
        tot_unoptimized_cost += turn_unoptimized

        turns_breakdown.append({
            "turn": turn_num,
            "uncachedInputTokens": uncached_in,
            "cacheReadTokens": cache_read,
            "cacheWriteTokens": cache_write,
            "reasoningTokens": reasoning,
            "completionTokens": completion,
            "totalTurnTokens": turn_total_tokens,
            "turnCost": str(turn_cost.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)),
        })

    issues = []
    expected_cost_str = data.get("expectedTotalCost")
    if expected_cost_str is not None:
        expected_cost = safe_decimal(expected_cost_str, "expectedTotalCost")
        tolerance = safe_decimal(data.get("tolerance", "0.00001"), "tolerance")
        discrepancy = abs(tot_cost - expected_cost)
        if discrepancy > tolerance:
            issues.append(
                f"calculated total cost {tot_cost} deviates from expectedTotalCost {expected_cost} by {discrepancy} (tolerance: {tolerance})"
            )

    cache_savings = tot_unoptimized_cost - tot_cost
    cache_savings_pct = (
        (cache_savings / tot_unoptimized_cost * Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if tot_unoptimized_cost > 0 else Decimal("0.00")
    )

    grand_total_tokens = tot_uncached_in + tot_cache_read + tot_cache_write + tot_reasoning + tot_completion

    return {
        "status": "review" if issues else "pass",
        "workloadId": data["workloadId"],
        "model": model_name,
        "provider": provider,
        "currency": currency,
        "tokenSummary": {
            "totalUncachedInputTokens": tot_uncached_in,
            "totalCacheReadTokens": tot_cache_read,
            "totalCacheWriteTokens": tot_cache_write,
            "totalReasoningTokens": tot_reasoning,
            "totalCompletionTokens": tot_completion,
            "grandTotalTokens": grand_total_tokens,
        },
        "financialSummary": {
            "totalCost": str(tot_cost.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)),
            "unoptimizedBaselineCost": str(tot_unoptimized_cost.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)),
            "netSavings": str(cache_savings.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)),
            "savingsPercentage": f"{cache_savings_pct}%",
        },
        "turnBreakdown": turns_breakdown,
        "issues": issues,
        "scope": "exact multi-turn prompt caching and reasoning token accounting with tiered ladders",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="JSON input path; no network fetches")
    args = parser.parse_args()

    try:
        input_path = Path(args.input)
        verify_path_security(input_path, "input path")
        if not input_path.is_file():
            raise ValueError(f"input file does not exist or is not a regular file: {args.input}")

        raw_content = input_path.read_text(encoding="utf-8")
        data = json.loads(raw_content)
        if not isinstance(data, dict):
            raise ValueError("input JSON must be an object")

        result = check(data, input_path.parent.resolve())
        print(json.dumps(result, indent=2))
        return 0 if result["status"] == "pass" else 1

    except (ValueError, KeyError, TypeError, OSError, ArithmeticError, AttributeError, IndexError) as exc:
        print(json.dumps({"status": "invalid", "error": str(exc)}, indent=2))
        return 2


if __name__ == "__main__":
    sys.exit(main())
