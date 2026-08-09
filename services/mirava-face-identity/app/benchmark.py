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


def _validate_spec(spec: dict[str, Any]) -> None:
    if spec.get("schemaVersion") != BENCHMARK_SCHEMA:
        raise ValueError("Unsupported MIRAVA benchmark schema")
    if not isinstance(spec.get("datasetVersion"), str) or not spec[
        "datasetVersion"
    ].strip():
        raise ValueError("datasetVersion is required")
    if not isinstance(spec.get("commit"), str) or not spec["commit"].strip():
        raise ValueError("commit is required")

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
        if not isinstance(case.get("subjectKey"), str) or not case[
            "subjectKey"
        ].strip():
            raise ValueError(f"{case_id}: subjectKey is required")
        if not isinstance(case.get("expectedIdentityMatch"), bool):
            raise ValueError(f"{case_id}: expectedIdentityMatch is required")
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
            "subjectKey": case["subjectKey"],
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
    acceptance = spec.get("acceptance")
    acceptance_status = (
        "PASS"
        if thresholded
        and len(scorable_genuine) >= acceptance["minimumGenuineCases"]
        and len(scorable_impostor) >= acceptance["minimumImpostorCases"]
        and metrics["falseAcceptRate"] <= acceptance["maxFalseAcceptRate"]
        and metrics["falseRejectRate"] <= acceptance["maxFalseRejectRate"]
        and unscorable_rate <= acceptance["maxUnscorableRate"]
        else "FAIL"
    )
    report = {
        "schemaVersion": BENCHMARK_SCHEMA,
        "datasetVersion": spec["datasetVersion"],
        "commit": spec["commit"],
        "calibrationVersion": spec.get("calibrationVersion"),
        "configurationDigest": _digest(
            _canonical_json(
                {
                    "datasetVersion": spec["datasetVersion"],
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
