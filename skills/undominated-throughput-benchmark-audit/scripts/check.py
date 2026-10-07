#!/usr/bin/env python3
"""Local deterministic check for throughput and latency benchmark audits.
Python 3 standard library only; zero external dependencies.
Audits TTFT, TPOT, aggregate vs single-stream TPS, Little's Law coherence, and cohort parity.
"""
import argparse
import json
import math
import re
import sys
from datetime import date
from pathlib import Path


def safe_float(value, label: str, min_val: float = 0.0) -> float:
    if isinstance(value, bool):
        raise ValueError(f"{label} cannot be a boolean")
    if not isinstance(value, (int, float)):
        raise ValueError(f"{label} must be a number, got {type(value).__name__}")
    val = float(value)
    if not math.isfinite(val) or val < min_val:
        raise ValueError(f"{label} must be a finite number >= {min_val}, got {val}")
    return val


def safe_int(value, label: str, min_val: int = 1) -> int:
    if isinstance(value, bool):
        raise ValueError(f"{label} cannot be a boolean")
    if not isinstance(value, int):
        raise ValueError(f"{label} must be an integer, got {type(value).__name__}")
    if value < min_val:
        raise ValueError(f"{label} must be >= {min_val}, got {value}")
    return value


def verify_path_security(path: Path, label: str):
    if path.is_symlink():
        raise ValueError(f"{label} symlinks are strictly forbidden: {path}")
    for parent in path.parents:
        if parent.is_symlink():
            raise ValueError(f"{label} parent directory symlinks are strictly forbidden: {parent}")


def check(data: dict) -> dict:
    if not isinstance(data.get("auditId"), str) or not data["auditId"].strip():
        raise ValueError("auditId must be non-empty text")
    if not isinstance(data.get("claim"), str) or not data["claim"].strip():
        raise ValueError("claim must be non-empty text")
    
    observed_at = data.get("observedAt")
    if observed_at is not None:
        if not isinstance(observed_at, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", observed_at):
            raise ValueError("observedAt must be a valid ISO-8601 date (YYYY-MM-DD)")
        date.fromisoformat(observed_at)

    tolerance = safe_float(data.get("tolerance", 0.05), "tolerance")
    if tolerance >= 1:
        raise ValueError("tolerance must be a fraction below 1")

    runs = data.get("runs")
    if not isinstance(runs, list) or not runs:
        raise ValueError("runs must be a non-empty array of benchmark runs")

    issues = []
    audited_runs = []

    for idx, run in enumerate(runs):
        if not isinstance(run, dict):
            raise ValueError(f"runs[{idx}] must be an object")

        # Equal invented placeholders previously made absent evidence look comparable.
        for field in ("engine", "model", "hardware", "precision"):
            if not isinstance(run.get(field), str) or not run[field].strip():
                raise ValueError(f"runs[{idx}].{field} must be explicit non-empty text")
            marker = re.sub(r"[\s_]+", "-", run[field].strip().casefold())
            if marker in {"unknown", "unspecified", "not-stated", "n/a", "none", "null", f"unknown-{field}", f"unspecified-{field}"}:
                issues.append(f"runs[{idx}].{field} is an unknown marker, so cohort equivalence is unassessed")
        engine, model, hardware, precision = (run[field] for field in ("engine", "model", "hardware", "precision"))

        concurrency = safe_int(run.get("concurrency"), f"runs[{idx}].concurrency", min_val=1)
        in_tokens = safe_int(run.get("inputTokens"), f"runs[{idx}].inputTokens", min_val=1)
        out_tokens = safe_int(run.get("outputTokens"), f"runs[{idx}].outputTokens", min_val=1)

        ttft_ms = safe_float(run.get("ttftMs"), f"runs[{idx}].ttftMs", min_val=0.1)
        tpot_ms = safe_float(run.get("tpotMs"), f"runs[{idx}].tpotMs", min_val=0.01)
        total_lat_ms = safe_float(run.get("totalLatencyMs"), f"runs[{idx}].totalLatencyMs", min_val=ttft_ms)

        claimed_single_tps = safe_float(run.get("claimedOutputTpsPerStream"), f"runs[{idx}].claimedOutputTpsPerStream", min_val=0.1)
        claimed_agg_tps = safe_float(run.get("claimedAggregateTps"), f"runs[{idx}].claimedAggregateTps", min_val=0.1)

        # 1. Latency decomposition check
        expected_latency_ms = ttft_ms + (out_tokens - 1) * tpot_ms
        if not math.isfinite(expected_latency_ms):
            raise ValueError("derived latency must be finite")
        lat_diff = abs(total_lat_ms - expected_latency_ms) / total_lat_ms
        lat_valid = lat_diff <= tolerance
        if not lat_valid:
            issues.append(
                f"[{engine}] Total latency ({total_lat_ms:.2f}ms) contradicts TTFT ({ttft_ms:.2f}ms) + decode ({expected_latency_ms:.2f}ms) by {lat_diff*100:.1f}% (threshold {tolerance*100:.1f}%)"
            )

        # 2. Single stream TPS vs TPOT check
        expected_single_tps = 1000.0 / tpot_ms
        single_tps_diff = abs(claimed_single_tps - expected_single_tps) / expected_single_tps
        single_tps_valid = single_tps_diff <= tolerance
        if not single_tps_valid:
            issues.append(
                f"[{engine}] Claimed per-stream TPS ({claimed_single_tps:.2f}) contradicts TPOT ({tpot_ms:.2f}ms -> expected {expected_single_tps:.2f} tps)"
            )

        # 3. Aggregate throughput check via Little's Law
        expected_agg_tps = (concurrency * out_tokens * 1000.0) / total_lat_ms
        if not math.isfinite(expected_agg_tps) or expected_agg_tps <= 0:
            raise ValueError("derived aggregate throughput must be positive and finite")
        agg_diff = abs(claimed_agg_tps - expected_agg_tps) / expected_agg_tps
        agg_valid = agg_diff <= (tolerance * 2.0)
        if not agg_valid:
            issues.append(
                f"[{engine}] Claimed aggregate TPS ({claimed_agg_tps:.2f}) contradicts Little's Law expectation ({expected_agg_tps:.2f} tps) under concurrency {concurrency}"
            )

        # 4. Deception check: single stream vs aggregate conflation
        if concurrency > 1 and claimed_single_tps > (expected_single_tps * 1.5):
            if abs(claimed_single_tps - claimed_agg_tps) / claimed_agg_tps < 0.20:
                issues.append(
                    f"[{engine}] DECEPTIVE: Aggregate throughput ({claimed_agg_tps:.2f} tps) appears deceptively cited as single-stream speed ({claimed_single_tps:.2f} tps) under concurrency {concurrency}"
                )

        audited_runs.append({
            "engine": engine,
            "model": model,
            "hardware": hardware,
            "precision": precision,
            "concurrency": concurrency,
            "tokens": {"input": in_tokens, "output": out_tokens},
            "metrics": {
                "ttftMs": round(ttft_ms, 2),
                "tpotMs": round(tpot_ms, 2),
                "totalLatencyMs": round(total_lat_ms, 2),
                "expectedLatencyMs": round(expected_latency_ms, 2),
                "claimedOutputTpsPerStream": round(claimed_single_tps, 2),
                "expectedOutputTpsPerStream": round(expected_single_tps, 2),
                "claimedAggregateTps": round(claimed_agg_tps, 2),
                "expectedAggregateTps": round(expected_agg_tps, 2),
            },
            "validations": {
                "latencyDecompositionValid": lat_valid,
                "singleStreamTpsValid": single_tps_valid,
                "aggregateThroughputValid": agg_valid,
            }
        })

    # 5. Cohort apples-to-apples parity checks across multiple runs
    parity_notes = []
    if len(audited_runs) > 1:
        base = audited_runs[0]
        for comp in audited_runs[1:]:
            # Check model parity
            if base["model"] != comp["model"]:
                issues.append(f"Cohort mismatch: comparing different models ('{base['model']}' vs '{comp['model']}')")
            # Check hardware parity
            if base["hardware"] != comp["hardware"]:
                note = f"Hardware differs: '{base['hardware']}' vs '{comp['hardware']}'"
                parity_notes.append(note)
                issues.append(note)
            # Check precision parity
            if base["precision"] != comp["precision"]:
                note = f"Precision differs: '{base['precision']}' vs '{comp['precision']}'"
                parity_notes.append(note)
                issues.append(note)
            # Check concurrency parity
            if base["concurrency"] != comp["concurrency"]:
                issues.append(f"Concurrency mismatch: comparing concurrency {base['concurrency']} with concurrency {comp['concurrency']}")
            # Check prompt & output size parity
            if base["tokens"] != comp["tokens"]:
                issues.append(
                    f"Workload size mismatch: input tokens ({base['tokens']['input']} vs {comp['tokens']['input']}) or output tokens ({base['tokens']['output']} vs {comp['tokens']['output']}) differ"
                )

    return {
        "status": "review" if issues else "pass",
        "auditId": data["auditId"],
        "claim": data["claim"],
        "totalRunsAudited": len(audited_runs),
        "auditedRuns": audited_runs,
        "parityNotes": parity_notes,
        "issues": issues,
        "scope": "deterministic verification of TTFT, TPOT, aggregate throughput, Little's Law, and cohort parity",
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

        data = json.loads(input_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("input JSON must be an object")

        result = check(data)
        print(json.dumps(result, indent=2))
        return 0 if result["status"] == "pass" else 1

    except (ValueError, KeyError, TypeError, OSError, ArithmeticError, AttributeError, IndexError) as exc:
        print(json.dumps({"status": "invalid", "error": str(exc)}, indent=2))
        return 2


if __name__ == "__main__":
    sys.exit(main())
