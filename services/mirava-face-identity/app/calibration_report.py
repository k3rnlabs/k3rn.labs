from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from statistics import median
from typing import Any


BENCHMARK_SCHEMA = "mirava-face-identity-benchmark/v1"
REQUIRED_SCENARIO_AXES = (
    "yaw",
    "pitch",
    "roll",
    "expression",
    "gaze",
    "faceScale",
    "light",
    "occlusion",
    "styling",
    "context",
)


def canonical_json(value: object) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def benchmark_artifact_digest(report: dict[str, Any]) -> str:
    content = dict(report)
    content.pop("artifactDigest", None)
    return hashlib.sha256(canonical_json(content).encode("utf-8")).hexdigest()


def _valid_sha256(value: object) -> bool:
    return isinstance(value, str) and len(value) == 64 and all(
        character in "0123456789abcdef" for character in value
    )


def _valid_rate(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and 0 <= value <= 1
    )


def _recompute_metrics_and_status(
    report: dict[str, Any],
) -> tuple[dict[str, int | float | None], str]:
    threshold = report["threshold"]
    landmark_threshold = report["landmarkThreshold"]
    rows = report.get("rows")
    if not isinstance(rows, list) or not rows:
        raise RuntimeError("Calibration benchmark rows are missing")

    seen: set[str] = set()
    for row in rows:
        if not isinstance(row, dict):
            raise RuntimeError("Calibration benchmark row is invalid")
        case_id = row.get("caseId")
        if not isinstance(case_id, str) or not case_id or case_id in seen:
            raise RuntimeError("Calibration benchmark case IDs are invalid")
        seen.add(case_id)
        if not isinstance(row.get("expectedIdentityMatch"), bool):
            raise RuntimeError("Calibration benchmark identity labels are invalid")
        if not _valid_sha256(row.get("candidateContentSha256")):
            raise RuntimeError("Calibration candidate digest is invalid")
        scenario = row.get("scenario")
        if not isinstance(scenario, dict) or any(
            not isinstance(scenario.get(axis), str) or not scenario[axis]
            for axis in REQUIRED_SCENARIO_AXES
        ):
            raise RuntimeError("Calibration scenario evidence is incomplete")

        status = row.get("status")
        decision = row.get("decision")
        if status == "UNSCORABLE":
            if decision != "UNSCORABLE":
                raise RuntimeError("Calibration unscorable decision is invalid")
            continue
        if status != "SCORABLE":
            raise RuntimeError("Calibration benchmark status is invalid")

        references = row.get("referenceContentSha256")
        similarities = row.get("perReferenceSimilarity")
        landmark_residuals = row.get("perReferenceLandmarkResidual")
        aggregate = row.get("aggregateSimilarity")
        landmark_residual = row.get("landmarkResidual")
        if (
            not isinstance(references, list)
            or not 3 <= len(references) <= 6
            or not all(_valid_sha256(value) for value in references)
            or not isinstance(similarities, list)
            or len(similarities) != len(references)
            or not all(
                isinstance(value, (int, float))
                and not isinstance(value, bool)
                and math.isfinite(value)
                and -1 <= value <= 1
                for value in similarities
            )
            or not isinstance(landmark_residuals, list)
            or len(landmark_residuals) != len(references)
            or not all(
                isinstance(value, (int, float))
                and not isinstance(value, bool)
                and math.isfinite(value)
                and value >= 0
                for value in landmark_residuals
            )
            or not isinstance(aggregate, (int, float))
            or isinstance(aggregate, bool)
            or not math.isfinite(aggregate)
            or aggregate < -1
            or aggregate > 1
            or not isinstance(landmark_residual, (int, float))
            or isinstance(landmark_residual, bool)
            or not math.isfinite(landmark_residual)
            or landmark_residual < 0
        ):
            raise RuntimeError("Calibration score evidence is invalid")
        if not math.isclose(
            float(aggregate),
            float(median(similarities)),
            rel_tol=0,
            abs_tol=1e-12,
        ) or not math.isclose(
            float(landmark_residual),
            float(median(landmark_residuals)),
            rel_tol=0,
            abs_tol=1e-12,
        ):
            raise RuntimeError("Calibration aggregates do not match score evidence")
        expected_decision = (
            "PASS"
            if aggregate >= threshold and landmark_residual <= landmark_threshold
            else "FAIL"
        )
        if decision != expected_decision:
            raise RuntimeError("Calibration row decision does not match thresholds")

    genuine = [row for row in rows if row["expectedIdentityMatch"]]
    impostor = [row for row in rows if not row["expectedIdentityMatch"]]
    scorable_genuine = [row for row in genuine if row["status"] == "SCORABLE"]
    scorable_impostor = [row for row in impostor if row["status"] == "SCORABLE"]
    scorable_count = sum(row["status"] == "SCORABLE" for row in rows)
    unscorable_count = len(rows) - scorable_count
    false_reject_rate = sum(row["decision"] != "PASS" for row in genuine) / len(
        genuine
    ) if genuine else 1.0
    false_accept_rate = (
        sum(row["decision"] == "PASS" for row in scorable_impostor)
        / len(scorable_impostor)
        if scorable_impostor
        else None
    )
    metrics: dict[str, int | float | None] = {
        "caseCount": len(rows),
        "scorableCount": scorable_count,
        "unscorableCount": unscorable_count,
        "genuineCount": len(genuine),
        "impostorCount": len(impostor),
        "scorableGenuineCount": len(scorable_genuine),
        "scorableImpostorCount": len(scorable_impostor),
        "falseRejectRate": false_reject_rate,
        "falseAcceptRate": false_accept_rate,
        "unscorableRate": unscorable_count / len(rows),
    }

    acceptance = report.get("acceptance")
    if not isinstance(acceptance, dict):
        raise RuntimeError("Calibration acceptance contract is missing")
    for key in (
        "maxFalseAcceptRate",
        "maxFalseRejectRate",
        "maxUnscorableRate",
    ):
        if not _valid_rate(acceptance.get(key)):
            raise RuntimeError("Calibration acceptance rate is invalid")
    for key in ("minimumGenuineCases", "minimumImpostorCases"):
        value = acceptance.get(key)
        if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
            raise RuntimeError("Calibration minimum cohort size is invalid")

    accepted = (
        len(scorable_genuine) >= acceptance["minimumGenuineCases"]
        and len(scorable_impostor) >= acceptance["minimumImpostorCases"]
        and false_accept_rate is not None
        and false_accept_rate <= acceptance["maxFalseAcceptRate"]
        and false_reject_rate <= acceptance["maxFalseRejectRate"]
        and metrics["unscorableRate"] <= acceptance["maxUnscorableRate"]
    )
    return metrics, "PASS" if accepted else "FAIL"


def load_and_verify_calibration_report(
    path: Path,
    *,
    expected_digest: str,
    expected_model_name: str,
    expected_model_version: str,
    expected_model_digest: str,
    expected_preprocessing_version: str,
    expected_threshold: float,
    expected_landmark_threshold: float,
) -> dict[str, str]:
    try:
        report = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Calibration benchmark report is missing or invalid") from exc
    if not isinstance(report, dict) or report.get("schemaVersion") != BENCHMARK_SCHEMA:
        raise RuntimeError("Calibration benchmark schema is invalid")

    artifact_digest = report.get("artifactDigest")
    actual_digest = benchmark_artifact_digest(report)
    if artifact_digest != actual_digest:
        raise RuntimeError("Calibration benchmark artifact digest does not match")
    if expected_digest != f"sha256:{actual_digest}":
        raise RuntimeError("Configured calibration digest does not match report")

    calibration_version = report.get("calibrationVersion")
    if not isinstance(calibration_version, str) or not calibration_version.strip():
        raise RuntimeError("Calibration version is missing")
    if not str(report.get("datasetVersion", "")).strip() or not str(
        report.get("commit", "")
    ).strip():
        raise RuntimeError("Calibration provenance is incomplete")

    evaluator = report.get("evaluator")
    expected_evaluator = {
        "name": expected_model_name,
        "version": expected_model_version,
        "weightsDigest": expected_model_digest,
        "preprocessingVersion": expected_preprocessing_version,
    }
    if not isinstance(evaluator, dict) or any(
        evaluator.get(key) != value for key, value in expected_evaluator.items()
    ):
        raise RuntimeError("Calibration evaluator does not match runtime")
    if report.get("threshold") != expected_threshold or report.get(
        "landmarkThreshold"
    ) != expected_landmark_threshold:
        raise RuntimeError("Calibration thresholds do not match runtime")

    configuration = {
        "datasetVersion": report["datasetVersion"],
        "evaluator": evaluator,
        "threshold": expected_threshold,
        "landmarkThreshold": expected_landmark_threshold,
    }
    expected_configuration_digest = hashlib.sha256(
        canonical_json(configuration).encode("utf-8")
    ).hexdigest()
    if report.get("configurationDigest") != expected_configuration_digest:
        raise RuntimeError("Calibration configuration digest does not match")

    recomputed_metrics, status = _recompute_metrics_and_status(report)
    supplied_metrics = report.get("metrics")
    metrics_match = isinstance(supplied_metrics, dict) and all(
        key in supplied_metrics
        and (
            supplied_metrics[key] is None
            if value is None
            else isinstance(supplied_metrics[key], (int, float))
            and not isinstance(supplied_metrics[key], bool)
            and math.isfinite(supplied_metrics[key])
            and math.isclose(
                float(supplied_metrics[key]),
                float(value),
                rel_tol=0,
                abs_tol=1e-12,
            )
        )
        for key, value in recomputed_metrics.items()
    )
    if not metrics_match:
        raise RuntimeError("Calibration metrics do not match rows")
    if report.get("acceptanceStatus") != status:
        raise RuntimeError("Calibration acceptance status does not match evidence")

    return {
        "calibrationVersion": calibration_version,
        "calibrationDigest": expected_digest,
        "calibrationStatus": status,
    }
