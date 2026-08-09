from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
from statistics import median
from typing import Any

from .benchmark import (
    BENCHMARK_SCHEMA,
    CANONICAL_SCENARIO_COHORTS,
    REQUIRED_SCENARIO_AXES,
    _coverage_report,
    _partition_digest,
    _validate_coverage_contract,
)
from .face_geometry import (
    MEASUREMENT_CONTRACT,
    FaceGeometry,
    declared_geometry_matches,
    measured_cohorts,
)
from .cohort_thresholds import (
    cohort_thresholds_digest,
    resolve_cohort_thresholds,
    validate_cohort_thresholds,
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


def _verified_candidate_geometry(row: dict[str, Any]) -> FaceGeometry:
    value = row.get("candidateGeometry")
    if not isinstance(value, dict):
        raise RuntimeError("Calibration candidate geometry is missing")
    numeric_keys = (
        "yaw",
        "pitch",
        "roll",
        "faceAreaRatio",
        "normalizedReprojectionError",
    )
    if any(
        not isinstance(value.get(key), (int, float))
        or isinstance(value.get(key), bool)
        or not math.isfinite(value[key])
        for key in numeric_keys
    ):
        raise RuntimeError("Calibration candidate geometry is invalid")
    geometry = FaceGeometry(
        yaw=float(value["yaw"]),
        pitch=float(value["pitch"]),
        roll=float(value["roll"]),
        face_area_ratio=float(value["faceAreaRatio"]),
        normalized_reprojection_error=float(value["normalizedReprojectionError"]),
        estimator_version=str(value.get("poseEstimatorVersion", "")),
    )
    if (
        geometry.estimator_version != MEASUREMENT_CONTRACT["poseEstimatorVersion"]
        or not 0 <= geometry.face_area_ratio <= 1
        or not 0 <= geometry.normalized_reprojection_error
        <= MEASUREMENT_CONTRACT["maxNormalizedReprojectionError"]
        or value.get("measuredCohorts") != measured_cohorts(geometry)
    ):
        raise RuntimeError("Calibration candidate geometry contract is invalid")
    return geometry


def _recompute_metrics_and_status(
    report: dict[str, Any],
) -> tuple[dict[str, int | float | None], str, dict[str, Any]]:
    threshold = report["threshold"]
    landmark_threshold = report["landmarkThreshold"]
    try:
        cohort_thresholds = validate_cohort_thresholds(
            report.get("cohortThresholds"),
            global_similarity=float(threshold),
            global_landmark_residual=float(landmark_threshold),
        )
    except (TypeError, ValueError) as exc:
        raise RuntimeError("Calibration cohort thresholds are invalid") from exc
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
        for subject_field in ("candidateSubjectKey", "referenceSubjectKey"):
            if not isinstance(row.get(subject_field), str) or not row[
                subject_field
            ].strip():
                raise RuntimeError("Calibration subject keys are invalid")
        if (
            row["candidateSubjectKey"] == row["referenceSubjectKey"]
        ) != row["expectedIdentityMatch"]:
            raise RuntimeError("Calibration identity label contradicts subject keys")
        if not _valid_sha256(row.get("candidateContentSha256")):
            raise RuntimeError("Calibration candidate digest is invalid")
        scenario = row.get("scenario")
        if not isinstance(scenario, dict) or any(
            not isinstance(scenario.get(axis), str) or not scenario[axis]
            for axis in REQUIRED_SCENARIO_AXES
        ):
            raise RuntimeError("Calibration scenario evidence is incomplete")
        if any(
            scenario[axis] not in CANONICAL_SCENARIO_COHORTS[axis]
            for axis in REQUIRED_SCENARIO_AXES
        ):
            raise RuntimeError("Calibration scenario value is outside canonical cohorts")

        status = row.get("status")
        decision = row.get("decision")
        if status == "UNSCORABLE":
            if decision != "UNSCORABLE":
                raise RuntimeError("Calibration unscorable decision is invalid")
            if row.get("appliedThresholds") is not None:
                raise RuntimeError("Calibration unscorable thresholds are invalid")
            if row.get("reasonCode") == "SCENARIO_MEASUREMENT_MISMATCH":
                geometry = _verified_candidate_geometry(row)
                if declared_geometry_matches(scenario, geometry):
                    raise RuntimeError("Calibration scenario mismatch evidence is forged")
            continue
        if status != "SCORABLE":
            raise RuntimeError("Calibration benchmark status is invalid")
        geometry = _verified_candidate_geometry(row)
        if not declared_geometry_matches(scenario, geometry):
            raise RuntimeError("Calibration scenario does not match measurements")
        expected_applied_thresholds = resolve_cohort_thresholds(
            cohort_thresholds,
            measured_cohorts(geometry),
        )
        if canonical_json(row.get("appliedThresholds")) != canonical_json(
            expected_applied_thresholds
        ):
            raise RuntimeError("Calibration applied cohort thresholds are invalid")

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
            if aggregate >= expected_applied_thresholds["similarityMin"]
            and landmark_residual
            <= expected_applied_thresholds["landmarkResidualMax"]
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

    try:
        _validate_coverage_contract(report.get("coverage", {}).get("contract"))
    except (AttributeError, ValueError) as exc:
        raise RuntimeError("Calibration coverage contract is invalid") from exc
    if report["coverage"]["contract"].get("profile") != "canonical-v1":
        raise RuntimeError("Calibration requires the canonical coverage profile")
    if any(
        row["scenario"][axis] not in CANONICAL_SCENARIO_COHORTS[axis]
        for row in rows
        for axis in REQUIRED_SCENARIO_AXES
    ):
        raise RuntimeError("Calibration scenario value is outside canonical cohorts")
    recomputed_coverage = _coverage_report(
        {"coverageContract": report["coverage"]["contract"]}, rows
    )

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
        and recomputed_coverage["status"] == "PASS"
    )
    return metrics, "PASS" if accepted else "FAIL", recomputed_coverage


def load_and_verify_benchmark_report(
    path: Path,
    *,
    expected_split: str,
    expected_digest: str,
    expected_model_name: str,
    expected_model_version: str,
    expected_model_digest: str,
    expected_preprocessing_version: str,
    expected_threshold: float,
    expected_landmark_threshold: float,
) -> dict[str, Any]:
    if expected_split not in ("calibration", "test"):
        raise RuntimeError("Expected benchmark split is invalid")
    try:
        report = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Benchmark report is missing or invalid") from exc
    if not isinstance(report, dict) or report.get("schemaVersion") != BENCHMARK_SCHEMA:
        raise RuntimeError("Benchmark report schema is invalid")
    if report.get("measurementContract") != MEASUREMENT_CONTRACT:
        raise RuntimeError("Calibration measurement contract is invalid")
    if report.get("datasetSplit") != expected_split:
        raise RuntimeError(f"Benchmark report must use the {expected_split} split")
    if not isinstance(report.get("subjectKeyScheme"), str) or not report[
        "subjectKeyScheme"
    ].strip():
        raise RuntimeError("Calibration subject key scheme is missing")
    if not isinstance(report.get("subjectKeyKeyId"), str) or not report[
        "subjectKeyKeyId"
    ].strip():
        raise RuntimeError("Calibration subject key ID is missing")

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
    try:
        cohort_thresholds = validate_cohort_thresholds(
            report.get("cohortThresholds"),
            global_similarity=expected_threshold,
            global_landmark_residual=expected_landmark_threshold,
        )
    except ValueError as exc:
        raise RuntimeError("Calibration cohort thresholds do not match runtime") from exc

    coverage = report.get("coverage")
    if not isinstance(coverage, dict):
        raise RuntimeError("Calibration coverage is missing")

    configuration = {
        "datasetVersion": report["datasetVersion"],
        "datasetSplit": report["datasetSplit"],
        "subjectKeyScheme": report["subjectKeyScheme"],
        "subjectKeyKeyId": report["subjectKeyKeyId"],
        "subjectPartitionDigest": report.get("subjectPartitionDigest"),
        "coverageContract": coverage.get("contract"),
        "measurementContract": MEASUREMENT_CONTRACT,
        "evaluator": evaluator,
        "threshold": expected_threshold,
        "landmarkThreshold": expected_landmark_threshold,
        "cohortThresholds": cohort_thresholds,
    }
    expected_configuration_digest = hashlib.sha256(
        canonical_json(configuration).encode("utf-8")
    ).hexdigest()
    if report.get("configurationDigest") != expected_configuration_digest:
        raise RuntimeError("Calibration configuration digest does not match")

    expected_partition_digest = "sha256:" + _partition_digest(
        {
            row[subject_field]
            for row in report.get("rows", [])
            if isinstance(row, dict)
            for subject_field in ("candidateSubjectKey", "referenceSubjectKey")
            if isinstance(row.get(subject_field), str)
        }
    )
    if report.get("subjectPartitionDigest") != expected_partition_digest:
        raise RuntimeError("Calibration subject partition digest does not match rows")

    recomputed_metrics, status, recomputed_coverage = _recompute_metrics_and_status(report)
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
    if canonical_json(report.get("coverage")) != canonical_json(recomputed_coverage):
        raise RuntimeError("Calibration coverage does not match rows")
    if report.get("acceptanceStatus") != status:
        raise RuntimeError("Calibration acceptance status does not match evidence")

    subject_keys = {
        row[subject_field]
        for row in report["rows"]
        for subject_field in ("candidateSubjectKey", "referenceSubjectKey")
    }
    return {
        "datasetSplit": expected_split,
        "datasetVersion": report["datasetVersion"],
        "commit": report["commit"],
        "calibrationVersion": calibration_version,
        "artifactDigest": expected_digest,
        "status": status,
        "subjectKeyScheme": report["subjectKeyScheme"],
        "subjectKeyKeyId": report["subjectKeyKeyId"],
        "subjectPartitionDigest": report["subjectPartitionDigest"],
        "subjectCount": len(subject_keys),
        "subjectKeys": frozenset(subject_keys),
        "acceptanceContractDigest": "sha256:"
        + hashlib.sha256(canonical_json(report["acceptance"]).encode("utf-8")).hexdigest(),
        "coverageContractDigest": "sha256:"
        + hashlib.sha256(
            canonical_json(report["coverage"]["contract"]).encode("utf-8")
        ).hexdigest(),
        "measurementContractDigest": "sha256:"
        + hashlib.sha256(canonical_json(MEASUREMENT_CONTRACT).encode("utf-8")).hexdigest(),
        "cohortThresholds": cohort_thresholds,
        "cohortThresholdsDigest": cohort_thresholds_digest(cohort_thresholds),
    }


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
    verified = load_and_verify_benchmark_report(
        path,
        expected_split="calibration",
        expected_digest=expected_digest,
        expected_model_name=expected_model_name,
        expected_model_version=expected_model_version,
        expected_model_digest=expected_model_digest,
        expected_preprocessing_version=expected_preprocessing_version,
        expected_threshold=expected_threshold,
        expected_landmark_threshold=expected_landmark_threshold,
    )
    return {
        "calibrationVersion": str(verified["calibrationVersion"]),
        "calibrationDigest": str(verified["artifactDigest"]),
        "calibrationStatus": str(verified["status"]),
    }
