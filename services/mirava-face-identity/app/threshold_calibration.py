from __future__ import annotations

import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
from typing import Any

from .benchmark import BENCHMARK_SCHEMA
from .calibration_report import benchmark_artifact_digest, canonical_json
from .cohort_thresholds import (
    COHORT_THRESHOLD_SCHEMA,
    MEASURED_COHORT_VALUES,
    resolve_cohort_thresholds,
    validate_cohort_thresholds,
)
from .face_geometry import (
    MEASUREMENT_CONTRACT,
    FaceGeometry,
    POSE_ESTIMATOR_VERSION,
    measured_cohorts,
)


CALIBRATION_PROPOSAL_SCHEMA = "mirava-face-threshold-calibration/v1"


def _valid_rate(value: float, name: str) -> None:
    if not math.isfinite(value) or value < 0 or value > 1:
        raise ValueError(f"{name} must be between 0 and 1")


def _geometry_cohorts(row: dict[str, Any]) -> dict[str, str]:
    payload = row.get("candidateGeometry")
    if not isinstance(payload, dict):
        raise ValueError("Scorable calibration row is missing candidate geometry")
    values = (
        payload.get("yaw"),
        payload.get("pitch"),
        payload.get("roll"),
        payload.get("faceAreaRatio"),
        payload.get("normalizedReprojectionError"),
    )
    if not all(
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        for value in values
    ):
        raise ValueError("Scorable calibration row has invalid candidate geometry")
    if payload.get("poseEstimatorVersion") != POSE_ESTIMATOR_VERSION:
        raise ValueError("Scorable calibration row has an unsupported pose estimator")
    geometry = FaceGeometry(
        yaw=float(values[0]),
        pitch=float(values[1]),
        roll=float(values[2]),
        face_area_ratio=float(values[3]),
        normalized_reprojection_error=float(values[4]),
    )
    cohorts = measured_cohorts(geometry)
    if payload.get("measuredCohorts") != cohorts:
        raise ValueError("Scorable calibration row cohorts do not match geometry")
    return cohorts


def _source_rows(report: dict[str, Any]) -> list[dict[str, Any]]:
    if report.get("schemaVersion") != BENCHMARK_SCHEMA:
        raise ValueError("Calibration source uses an unsupported benchmark schema")
    if report.get("datasetSplit") != "calibration":
        raise ValueError("Threshold calibration requires the calibration split")
    if report.get("measurementContract") != MEASUREMENT_CONTRACT:
        raise ValueError("Calibration source measurement contract is invalid")
    if (
        report.get("threshold") is not None
        or report.get("landmarkThreshold") is not None
        or report.get("cohortThresholds") is not None
    ):
        raise ValueError("Threshold calibration requires an unthresholded report")
    digest = report.get("artifactDigest")
    if not isinstance(digest, str) or digest != benchmark_artifact_digest(report):
        raise ValueError("Calibration source artifact digest is invalid")
    rows = report.get("rows")
    if not isinstance(rows, list) or not rows:
        raise ValueError("Calibration source has no rows")

    selected: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict) or row.get("status") != "SCORABLE":
            raise ValueError("Threshold calibration requires a fully scorable source report")
        score = row.get("aggregateSimilarity")
        residual = row.get("landmarkResidual")
        if (
            not isinstance(row.get("expectedIdentityMatch"), bool)
            or not isinstance(score, (int, float))
            or isinstance(score, bool)
            or not math.isfinite(score)
            or score < -1
            or score > 1
            or not isinstance(residual, (int, float))
            or isinstance(residual, bool)
            or not math.isfinite(residual)
            or residual < 0
        ):
            raise ValueError("Scorable calibration row has invalid score evidence")
        selected.append(
            {
                "genuine": row["expectedIdentityMatch"],
                "similarity": float(score),
                "residual": float(residual),
                "cohorts": _geometry_cohorts(row),
            }
        )
    if not selected:
        raise ValueError("Calibration source has no scorable rows")
    return selected


def _metrics(
    rows: list[dict[str, Any]], similarity_min: float, residual_max: float
) -> dict[str, int | float]:
    genuine = [row for row in rows if row["genuine"]]
    impostor = [row for row in rows if not row["genuine"]]
    accepted = [
        row["similarity"] >= similarity_min and row["residual"] <= residual_max
        for row in rows
    ]
    false_rejects = sum(
        not accepted[index] for index, row in enumerate(rows) if row["genuine"]
    )
    false_accepts = sum(
        accepted[index] for index, row in enumerate(rows) if not row["genuine"]
    )
    return {
        "genuineCount": len(genuine),
        "impostorCount": len(impostor),
        "falseRejectRate": false_rejects / len(genuine) if genuine else 1.0,
        "falseAcceptRate": false_accepts / len(impostor) if impostor else 1.0,
    }


def _select_thresholds(
    rows: list[dict[str, Any]],
    *,
    max_false_accept_rate: float,
    max_false_reject_rate: float,
    minimum_genuine_cases: int,
    minimum_impostor_cases: int,
) -> dict[str, Any]:
    genuine_count = sum(row["genuine"] for row in rows)
    impostor_count = len(rows) - genuine_count
    if genuine_count < minimum_genuine_cases or impostor_count < minimum_impostor_cases:
        raise ValueError("Calibration cohort does not meet minimum genuine/impostor counts")
    residual_candidates = {
        row["residual"] for row in rows if 0 < row["residual"] <= 2
    }
    if any(row["residual"] == 0 for row in rows):
        residual_candidates.add(math.nextafter(0.0, math.inf))
    candidates = []
    for similarity_min in sorted({row["similarity"] for row in rows}):
        for residual_max in sorted(residual_candidates):
            metrics = _metrics(rows, similarity_min, residual_max)
            if (
                metrics["falseAcceptRate"] <= max_false_accept_rate
                and metrics["falseRejectRate"] <= max_false_reject_rate
            ):
                candidates.append((similarity_min, residual_max, metrics))
    if not candidates:
        raise ValueError("No threshold pair satisfies the explicit calibration limits")
    similarity_min, residual_max, metrics = min(
        candidates,
        key=lambda item: (
            item[2]["falseRejectRate"],
            item[2]["falseAcceptRate"],
            -item[0],
            item[1],
        ),
    )
    return {
        "similarityMin": similarity_min,
        "landmarkResidualMax": residual_max,
        "metrics": metrics,
    }


def derive_cohort_threshold_policy(
    report: dict[str, Any],
    *,
    calibration_version: str,
    expected_source_digest: str,
    max_false_accept_rate: float,
    max_false_reject_rate: float,
    minimum_genuine_cases: int,
    minimum_impostor_cases: int,
) -> dict[str, Any]:
    if not calibration_version.strip():
        raise ValueError("calibration_version is required")
    _valid_rate(max_false_accept_rate, "max_false_accept_rate")
    _valid_rate(max_false_reject_rate, "max_false_reject_rate")
    if minimum_genuine_cases <= 0 or minimum_impostor_cases <= 0:
        raise ValueError("Minimum cohort counts must be positive")
    actual_source_digest = "sha256:" + str(report.get("artifactDigest", ""))
    if expected_source_digest != actual_source_digest:
        raise ValueError("Expected source digest does not match the calibration report")
    rows = _source_rows(report)
    global_selection = _select_thresholds(
        rows,
        max_false_accept_rate=max_false_accept_rate,
        max_false_reject_rate=max_false_reject_rate,
        minimum_genuine_cases=minimum_genuine_cases,
        minimum_impostor_cases=minimum_impostor_cases,
    )
    axes: dict[str, dict[str, dict[str, float]]] = {}
    for axis, values in MEASURED_COHORT_VALUES.items():
        axes[axis] = {}
        for cohort in values:
            selection = _select_thresholds(
                [row for row in rows if row["cohorts"][axis] == cohort],
                max_false_accept_rate=max_false_accept_rate,
                max_false_reject_rate=max_false_reject_rate,
                minimum_genuine_cases=minimum_genuine_cases,
                minimum_impostor_cases=minimum_impostor_cases,
            )
            axes[axis][cohort] = {
                "similarityMin": selection["similarityMin"],
                "landmarkResidualMax": selection["landmarkResidualMax"],
            }
    policy = {
        "schemaVersion": COHORT_THRESHOLD_SCHEMA,
        "selectionStrategy": "strictest-applicable/v1",
        "global": {
            "similarityMin": global_selection["similarityMin"],
            "landmarkResidualMax": global_selection["landmarkResidualMax"],
        },
        "axes": axes,
    }
    if (
        policy["global"]["landmarkResidualMax"] <= 0
        or policy["global"]["landmarkResidualMax"] > 2
    ):
        raise ValueError("Derived global residual ceiling is outside the runtime contract")
    validate_cohort_thresholds(
        policy,
        global_similarity=float(policy["global"]["similarityMin"]),
        global_landmark_residual=float(policy["global"]["landmarkResidualMax"]),
    )
    effective_metrics: dict[str, Any] = {}
    groups: dict[str, list[dict[str, Any]]] = {"global": rows}
    for axis, values in MEASURED_COHORT_VALUES.items():
        for cohort in values:
            groups[f"{axis}:{cohort}"] = [
                row for row in rows if row["cohorts"][axis] == cohort
            ]
    for name, group in groups.items():
        resolved = [
            resolve_cohort_thresholds(policy, row["cohorts"]) for row in group
        ]
        accepted = [
            row["similarity"] >= thresholds["similarityMin"]
            and row["residual"] <= thresholds["landmarkResidualMax"]
            for row, thresholds in zip(group, resolved, strict=True)
        ]
        genuine = [row for row in group if row["genuine"]]
        impostor = [row for row in group if not row["genuine"]]
        metrics = {
            "genuineCount": len(genuine),
            "impostorCount": len(impostor),
            "falseRejectRate": sum(
                not accepted[index]
                for index, row in enumerate(group)
                if row["genuine"]
            )
            / len(genuine),
            "falseAcceptRate": sum(
                accepted[index]
                for index, row in enumerate(group)
                if not row["genuine"]
            )
            / len(impostor),
        }
        if (
            metrics["genuineCount"] < minimum_genuine_cases
            or metrics["impostorCount"] < minimum_impostor_cases
            or metrics["falseRejectRate"] > max_false_reject_rate
            or metrics["falseAcceptRate"] > max_false_accept_rate
        ):
            raise ValueError(f"Derived policy fails the final calibration limits for {name}")
        effective_metrics[name] = metrics
    return {
        "schemaVersion": CALIBRATION_PROPOSAL_SCHEMA,
        "calibrationVersion": calibration_version,
        "source": {
            "benchmarkArtifactDigest": "sha256:" + str(report["artifactDigest"]),
            "datasetVersion": report.get("datasetVersion"),
            "datasetSplit": "calibration",
        },
        "requirements": {
            "maxFalseAcceptRate": max_false_accept_rate,
            "maxFalseRejectRate": max_false_reject_rate,
            "minimumGenuineCases": minimum_genuine_cases,
            "minimumImpostorCases": minimum_impostor_cases,
        },
        "cohortThresholds": policy,
        "effectiveMetrics": effective_metrics,
    }


def calibration_proposal_digest(proposal: dict[str, Any]) -> str:
    canonical = canonical_json(
        {key: value for key, value in proposal.items() if key != "artifactDigest"}
    )
    return sha256(canonical.encode("utf-8")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Derive a MIRAVA cohort threshold policy from a private unthresholded report"
    )
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--calibration-version", required=True)
    parser.add_argument("--expected-source-digest", required=True)
    parser.add_argument("--max-false-accept-rate", required=True, type=float)
    parser.add_argument("--max-false-reject-rate", required=True, type=float)
    parser.add_argument("--minimum-genuine-cases", required=True, type=int)
    parser.add_argument("--minimum-impostor-cases", required=True, type=int)
    args = parser.parse_args()
    report = json.loads(Path(args.input).read_text(encoding="utf-8"))
    proposal = derive_cohort_threshold_policy(
        report,
        calibration_version=args.calibration_version,
        expected_source_digest=args.expected_source_digest,
        max_false_accept_rate=args.max_false_accept_rate,
        max_false_reject_rate=args.max_false_reject_rate,
        minimum_genuine_cases=args.minimum_genuine_cases,
        minimum_impostor_cases=args.minimum_impostor_cases,
    )
    proposal["artifactDigest"] = calibration_proposal_digest(proposal)
    Path(args.output).write_text(
        json.dumps(proposal, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
