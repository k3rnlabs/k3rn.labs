from __future__ import annotations

import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
from statistics import median
from typing import Any, Callable

from .engine import (
    AuraFaceEngine,
    FaceEngine,
    cosine_similarity,
    landmark_shape_residual,
)
from .face_geometry import (
    MEASUREMENT_CONTRACT,
    declared_geometry_matches,
    estimate_face_geometry,
    geometry_payload,
)


BENCHMARK_SCHEMA = "mirava-face-identity-benchmark/v3"
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
CANONICAL_SCENARIO_COHORTS = {
    "yaw": ("frontal", "three-quarter-left", "three-quarter-right", "profile-left", "profile-right"),
    "pitch": ("down", "neutral", "up"),
    "roll": ("neutral", "tilted-left", "tilted-right"),
    "expression": ("neutral", "closed-mouth-smile", "open-smile", "serious", "surprised"),
    "gaze": ("camera", "left", "right", "up", "down"),
    "faceScale": ("close-portrait", "half-body", "full-body"),
    "light": ("soft-frontal", "side-light", "hard-light", "low-light", "warm-cool-mixed"),
    "occlusion": ("none", "hair-partial", "glasses", "hand-near-face"),
    "styling": ("natural", "makeup", "wet-look", "hairstyle-change"),
    "context": ("studio", "interior", "exterior", "night", "campaign-reference-transfer"),
}


def _canonical_json(value: Any) -> str:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def _digest(value: bytes | str) -> str:
    payload = value.encode("utf-8") if isinstance(value, str) else value
    return sha256(payload).hexdigest()


def _partition_digest(subject_keys: set[str]) -> str:
    return _digest(_canonical_json(sorted(subject_keys)))


def _validate_coverage_contract(value: object) -> None:
    if not isinstance(value, dict):
        raise ValueError("coverageContract is required")
    for key in ("minimumGenuineCasesPerValue", "minimumImpostorCasesPerValue"):
        minimum = value.get(key)
        if not isinstance(minimum, int) or isinstance(minimum, bool) or minimum <= 0:
            raise ValueError(f"coverageContract.{key} must be a positive integer")
    axes = value.get("axes")
    if not isinstance(axes, dict) or set(axes) != set(REQUIRED_SCENARIO_AXES):
        raise ValueError("coverageContract.axes must declare every scenario axis")
    for axis in REQUIRED_SCENARIO_AXES:
        required_values = axes[axis]
        if (
            not isinstance(required_values, list)
            or not required_values
            or not all(isinstance(item, str) and item.strip() for item in required_values)
            or len(set(required_values)) != len(required_values)
        ):
            raise ValueError(f"coverageContract.axes.{axis} is invalid")
    profile = value.get("profile")
    if profile not in ("canonical-v1", "diagnostic-custom-v1"):
        raise ValueError("coverageContract.profile is invalid")
    if profile == "canonical-v1" and any(
        set(axes[axis]) != set(CANONICAL_SCENARIO_COHORTS[axis])
        for axis in REQUIRED_SCENARIO_AXES
    ):
        raise ValueError("coverageContract canonical cohorts are incomplete")


def _validate_spec(spec: dict[str, Any]) -> None:
    if spec.get("schemaVersion") != BENCHMARK_SCHEMA:
        raise ValueError("Unsupported MIRAVA benchmark schema")
    if not isinstance(spec.get("datasetVersion"), str) or not spec[
        "datasetVersion"
    ].strip():
        raise ValueError("datasetVersion is required")
    if not isinstance(spec.get("commit"), str) or not spec["commit"].strip():
        raise ValueError("commit is required")
    if spec.get("datasetSplit") not in ("calibration", "test"):
        raise ValueError("datasetSplit must be calibration or test")
    if not isinstance(spec.get("subjectKeyScheme"), str) or not spec[
        "subjectKeyScheme"
    ].strip():
        raise ValueError("subjectKeyScheme is required")
    if not isinstance(spec.get("subjectKeyKeyId"), str) or not spec[
        "subjectKeyKeyId"
    ].strip():
        raise ValueError("subjectKeyKeyId is required")
    _validate_coverage_contract(spec.get("coverageContract"))
    if spec.get("measurementContract") != MEASUREMENT_CONTRACT:
        raise ValueError("measurementContract must equal the canonical contract")

    evaluator = spec.get("evaluator")
    if not isinstance(evaluator, dict):
        raise ValueError("evaluator manifest is required")
    for key in ("name", "version", "weightsDigest", "preprocessingVersion"):
        if not isinstance(evaluator.get(key), str) or not evaluator[key].strip():
            raise ValueError(f"evaluator.{key} is required")

    threshold = spec.get("threshold")
    if threshold is not None and (
        not isinstance(threshold, (int, float))
        or isinstance(threshold, bool)
        or not math.isfinite(threshold)
        or threshold < -1
        or threshold > 1
    ):
        raise ValueError("threshold must be null or between -1 and 1")
    landmark_threshold = spec.get("landmarkThreshold")
    if landmark_threshold is not None and (
        not isinstance(landmark_threshold, (int, float))
        or isinstance(landmark_threshold, bool)
        or not math.isfinite(landmark_threshold)
        or landmark_threshold <= 0
        or landmark_threshold > 2
    ):
        raise ValueError("landmarkThreshold must be null or between 0 and 2")
    thresholded = threshold is not None and landmark_threshold is not None
    if (threshold is None) != (landmark_threshold is None):
        raise ValueError("both thresholds must be null or both must be set")
    if thresholded:
        if not isinstance(spec.get("calibrationVersion"), str) or not spec[
            "calibrationVersion"
        ].strip():
            raise ValueError("calibrationVersion is required for thresholded runs")
        acceptance = spec.get("acceptance")
        if not isinstance(acceptance, dict):
            raise ValueError("acceptance is required for thresholded runs")
        for key in (
            "maxFalseAcceptRate",
            "maxFalseRejectRate",
            "maxUnscorableRate",
        ):
            value = acceptance.get(key)
            if (
                not isinstance(value, (int, float))
                or isinstance(value, bool)
                or not math.isfinite(value)
                or value < 0
                or value > 1
            ):
                raise ValueError(f"acceptance.{key} must be between 0 and 1")
        for key in ("minimumGenuineCases", "minimumImpostorCases"):
            value = acceptance.get(key)
            if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
                raise ValueError(f"acceptance.{key} must be a positive integer")
    cases = spec.get("cases")
    if not isinstance(cases, list) or not cases:
        raise ValueError("at least one benchmark case is required")

    seen: set[str] = set()
    for case in cases:
        if not isinstance(case, dict):
            raise ValueError("benchmark cases must be objects")
        raw_case_id = case.get("caseId")
        case_id = raw_case_id.strip() if isinstance(raw_case_id, str) else ""
        if not case_id or case_id in seen:
            raise ValueError("caseId must be present and unique")
        seen.add(case_id)
        for subject_field in ("candidateSubjectKey", "referenceSubjectKey"):
            if not isinstance(case.get(subject_field), str) or not case[
                subject_field
            ].strip():
                raise ValueError(f"{case_id}: {subject_field} is required")
        if not isinstance(case.get("expectedIdentityMatch"), bool):
            raise ValueError(f"{case_id}: expectedIdentityMatch is required")
        same_subject = case["candidateSubjectKey"] == case["referenceSubjectKey"]
        if same_subject != case["expectedIdentityMatch"]:
            raise ValueError(f"{case_id}: identity label contradicts subject keys")
        if not isinstance(case.get("candidatePath"), str) or not case[
            "candidatePath"
        ].strip():
            raise ValueError(f"{case_id}: candidatePath is required")
        references = case.get("referencePaths")
        if (
            not isinstance(references, list)
            or not 3 <= len(references) <= 6
            or not all(isinstance(value, str) and value.strip() for value in references)
        ):
            raise ValueError(f"{case_id}: three to six references are required")
        scenario = case.get("scenario")
        if not isinstance(scenario, dict) or any(
            not isinstance(scenario.get(axis), str) or not scenario[axis].strip()
            for axis in REQUIRED_SCENARIO_AXES
        ):
            raise ValueError(f"{case_id}: every scenario axis is required")
        if spec["coverageContract"]["profile"] == "canonical-v1" and any(
            scenario[axis] not in CANONICAL_SCENARIO_COHORTS[axis]
            for axis in REQUIRED_SCENARIO_AXES
        ):
            raise ValueError(f"{case_id}: scenario value is outside canonical cohorts")

    actual_partition_digest = _partition_digest(
        {
            subject_key
            for case in cases
            for subject_key in (
                case["candidateSubjectKey"],
                case["referenceSubjectKey"],
            )
        }
    )
    if spec.get("subjectPartitionDigest") != f"sha256:{actual_partition_digest}":
        raise ValueError("subjectPartitionDigest does not match subjectKey evidence")


def _coverage_report(spec: dict[str, Any], rows: list[dict[str, Any]]) -> dict[str, Any]:
    contract = spec["coverageContract"]
    axes: dict[str, dict[str, dict[str, int | str]]] = {}
    missing: list[dict[str, str]] = []
    for axis in REQUIRED_SCENARIO_AXES:
        axis_report: dict[str, dict[str, int | str]] = {}
        for value in contract["axes"][axis]:
            matching = [row for row in rows if row["scenario"][axis] == value]
            genuine = [row for row in matching if row["expectedIdentityMatch"]]
            impostor = [row for row in matching if not row["expectedIdentityMatch"]]
            counts: dict[str, int | str] = {
                "genuineCount": len(genuine),
                "scorableGenuineCount": sum(row["status"] == "SCORABLE" for row in genuine),
                "impostorCount": len(impostor),
                "scorableImpostorCount": sum(row["status"] == "SCORABLE" for row in impostor),
            }
            covered = (
                counts["scorableGenuineCount"] >= contract["minimumGenuineCasesPerValue"]
                and counts["scorableImpostorCount"] >= contract["minimumImpostorCasesPerValue"]
            )
            counts["status"] = "PASS" if covered else "FAIL"
            axis_report[value] = counts
            if not covered:
                missing.append({"axis": axis, "value": value})
        axes[axis] = axis_report
    return {
        "contract": contract,
        "status": "PASS" if not missing else "FAIL",
        "missing": missing,
        "axes": axes,
    }


def run_benchmark(
    spec: dict[str, Any],
    engine: FaceEngine,
    read_bytes: Callable[[str], bytes] | None = None,
) -> dict[str, Any]:
    _validate_spec(spec)
    reader = read_bytes or (lambda value: Path(value).read_bytes())
    raw_threshold = spec.get("threshold")
    raw_landmark_threshold = spec.get("landmarkThreshold")
    threshold = float(raw_threshold) if raw_threshold is not None else None
    landmark_threshold = (
        float(raw_landmark_threshold)
        if raw_landmark_threshold is not None
        else None
    )
    thresholded = threshold is not None and landmark_threshold is not None
    rows: list[dict[str, Any]] = []

    for case in spec["cases"]:
        candidate_bytes = reader(case["candidatePath"])
        candidate_faces = engine.observe(candidate_bytes)
        base = {
            "caseId": case["caseId"],
            "candidateSubjectKey": case["candidateSubjectKey"],
            "referenceSubjectKey": case["referenceSubjectKey"],
            "expectedIdentityMatch": case["expectedIdentityMatch"],
            "scenario": case["scenario"],
            "candidateContentSha256": _digest(candidate_bytes),
        }

        if len(candidate_faces) != 1:
            rows.append(
                {
                    **base,
                    "status": "UNSCORABLE",
                    "reasonCode": (
                        "CANDIDATE_FACE_NOT_FOUND"
                        if not candidate_faces
                        else "CANDIDATE_MULTIPLE_FACES"
                    ),
                    "aggregateSimilarity": None,
                    "perReferenceSimilarity": [],
                    "decision": "UNSCORABLE",
                }
            )
            continue

        try:
            candidate_geometry = estimate_face_geometry(candidate_faces[0])
        except ValueError:
            rows.append(
                {
                    **base,
                    "status": "UNSCORABLE",
                    "reasonCode": "CANDIDATE_GEOMETRY_INVALID",
                    "aggregateSimilarity": None,
                    "perReferenceSimilarity": [],
                    "decision": "UNSCORABLE",
                }
            )
            continue
        candidate_geometry_payload = geometry_payload(candidate_geometry)
        if not declared_geometry_matches(case["scenario"], candidate_geometry):
            rows.append(
                {
                    **base,
                    "status": "UNSCORABLE",
                    "reasonCode": "SCENARIO_MEASUREMENT_MISMATCH",
                    "aggregateSimilarity": None,
                    "perReferenceSimilarity": [],
                    "decision": "UNSCORABLE",
                    "candidateGeometry": candidate_geometry_payload,
                }
            )
            continue

        reference_faces = []
        reference_hashes = []
        invalid_reference = False
        for reference_path in case["referencePaths"]:
            content = reader(reference_path)
            observed = engine.observe(content)
            reference_hashes.append(_digest(content))
            if len(observed) != 1:
                invalid_reference = True
                break
            reference_faces.append(observed[0])

        if invalid_reference:
            rows.append(
                {
                    **base,
                    "referenceContentSha256": reference_hashes,
                    "status": "UNSCORABLE",
                    "reasonCode": "REFERENCE_FACE_INVALID",
                    "aggregateSimilarity": None,
                    "perReferenceSimilarity": [],
                    "decision": "UNSCORABLE",
                }
            )
            continue

        scores = [
            cosine_similarity(candidate_faces[0].embedding, reference.embedding)
            for reference in reference_faces
        ]
        aggregate = float(median(scores))
        landmark_residuals = [
            landmark_shape_residual(candidate_faces[0], reference)
            for reference in reference_faces
        ]
        aggregate_landmark_residual = float(median(landmark_residuals))
        decision = (
            "UNTHRESHOLDED"
            if not thresholded
            else "PASS"
            if aggregate >= threshold
            and aggregate_landmark_residual <= landmark_threshold
            else "FAIL"
        )
        rows.append(
            {
                **base,
                "referenceContentSha256": reference_hashes,
                "status": "SCORABLE",
                "reasonCode": "MEASURED",
                "aggregateSimilarity": aggregate,
                "perReferenceSimilarity": scores,
                "landmarkResidual": aggregate_landmark_residual,
                "perReferenceLandmarkResidual": landmark_residuals,
                "decision": decision,
                "candidateFace": {
                    "confidence": candidate_faces[0].confidence,
                    "box": list(candidate_faces[0].box),
                },
                "candidateGeometry": candidate_geometry_payload,
            }
        )

    scorable = [row for row in rows if row["status"] == "SCORABLE"]
    genuine = [row for row in rows if row["expectedIdentityMatch"]]
    impostor = [row for row in rows if not row["expectedIdentityMatch"]]
    scorable_genuine = [row for row in scorable if row["expectedIdentityMatch"]]
    scorable_impostor = [
        row for row in scorable if not row["expectedIdentityMatch"]
    ]

    false_rejects = (
        sum(row["decision"] != "PASS" for row in genuine)
        if thresholded
        else None
    )
    false_accepts = (
        sum(row["decision"] == "PASS" for row in scorable_impostor)
        if thresholded
        else None
    )
    metrics = {
        "caseCount": len(rows),
        "scorableCount": len(scorable),
        "unscorableCount": len(rows) - len(scorable),
        "genuineCount": len(genuine),
        "impostorCount": len(impostor),
        "scorableGenuineCount": len(scorable_genuine),
        "scorableImpostorCount": len(scorable_impostor),
        "falseRejectRate": (
            false_rejects / len(genuine)
            if false_rejects is not None and genuine
            else None
        ),
        "falseAcceptRate": (
            false_accepts / len(scorable_impostor)
            if false_accepts is not None and scorable_impostor
            else None
        ),
    }
    unscorable_rate = (
        metrics["unscorableCount"] / metrics["caseCount"]
        if metrics["caseCount"]
        else 1.0
    )
    metrics["unscorableRate"] = unscorable_rate
    coverage = _coverage_report(spec, rows)
    acceptance = spec.get("acceptance")
    acceptance_status = (
        "PASS"
        if thresholded
        and len(scorable_genuine) >= acceptance["minimumGenuineCases"]
        and len(scorable_impostor) >= acceptance["minimumImpostorCases"]
        and metrics["falseAcceptRate"] <= acceptance["maxFalseAcceptRate"]
        and metrics["falseRejectRate"] <= acceptance["maxFalseRejectRate"]
        and unscorable_rate <= acceptance["maxUnscorableRate"]
        and coverage["status"] == "PASS"
        and spec["coverageContract"]["profile"] == "canonical-v1"
        else "FAIL"
    )
    report = {
        "schemaVersion": BENCHMARK_SCHEMA,
        "datasetVersion": spec["datasetVersion"],
        "datasetSplit": spec["datasetSplit"],
        "subjectKeyScheme": spec["subjectKeyScheme"],
        "subjectKeyKeyId": spec["subjectKeyKeyId"],
        "subjectPartitionDigest": spec["subjectPartitionDigest"],
        "commit": spec["commit"],
        "calibrationVersion": spec.get("calibrationVersion"),
        "measurementContract": MEASUREMENT_CONTRACT,
        "configurationDigest": _digest(
            _canonical_json(
                {
                    "datasetVersion": spec["datasetVersion"],
                    "datasetSplit": spec["datasetSplit"],
                    "subjectKeyScheme": spec["subjectKeyScheme"],
                    "subjectKeyKeyId": spec["subjectKeyKeyId"],
                    "subjectPartitionDigest": spec["subjectPartitionDigest"],
                    "coverageContract": spec["coverageContract"],
                    "measurementContract": MEASUREMENT_CONTRACT,
                    "evaluator": spec["evaluator"],
                    "threshold": threshold,
                    "landmarkThreshold": landmark_threshold,
                }
            )
        ),
        "evaluator": spec["evaluator"],
        "threshold": threshold,
        "landmarkThreshold": landmark_threshold,
        "acceptance": acceptance,
        "acceptanceStatus": acceptance_status,
        "rows": rows,
        "metrics": metrics,
        "coverage": coverage,
    }
    report["artifactDigest"] = _digest(_canonical_json(report))
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the private MIRAVA benchmark")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    spec = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    report = run_benchmark(spec, AuraFaceEngine())
    Path(args.output).write_text(
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
