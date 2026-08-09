from __future__ import annotations

import argparse
from hashlib import sha256
import json
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
    if not str(spec.get("datasetVersion", "")).strip():
        raise ValueError("datasetVersion is required")
    if not str(spec.get("commit", "")).strip():
        raise ValueError("commit is required")

    evaluator = spec.get("evaluator")
    if not isinstance(evaluator, dict):
        raise ValueError("evaluator manifest is required")
    for key in ("name", "version", "weightsDigest", "preprocessingVersion"):
        if not str(evaluator.get(key, "")).strip():
            raise ValueError(f"evaluator.{key} is required")

    threshold = spec.get("threshold")
    if threshold is not None and (
        not isinstance(threshold, (int, float)) or threshold < -1 or threshold > 1
    ):
        raise ValueError("threshold must be null or between -1 and 1")
    landmark_threshold = spec.get("landmarkThreshold")
    if landmark_threshold is not None and (
        not isinstance(landmark_threshold, (int, float))
        or landmark_threshold <= 0
        or landmark_threshold > 2
    ):
        raise ValueError("landmarkThreshold must be null or between 0 and 2")

    cases = spec.get("cases")
    if not isinstance(cases, list) or not cases:
        raise ValueError("at least one benchmark case is required")

    seen: set[str] = set()
    for case in cases:
        if not isinstance(case, dict):
            raise ValueError("benchmark cases must be objects")
        case_id = str(case.get("caseId", "")).strip()
        if not case_id or case_id in seen:
            raise ValueError("caseId must be present and unique")
        seen.add(case_id)
        if not str(case.get("subjectKey", "")).strip():
            raise ValueError(f"{case_id}: subjectKey is required")
        if not isinstance(case.get("expectedIdentityMatch"), bool):
            raise ValueError(f"{case_id}: expectedIdentityMatch is required")
        if not str(case.get("candidatePath", "")).strip():
            raise ValueError(f"{case_id}: candidatePath is required")
        references = case.get("referencePaths")
        if not isinstance(references, list) or not 3 <= len(references) <= 6:
            raise ValueError(f"{case_id}: three to six references are required")
        scenario = case.get("scenario")
        if not isinstance(scenario, dict) or any(
            not str(scenario.get(axis, "")).strip()
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
    threshold = spec.get("threshold")
    landmark_threshold = spec.get("landmarkThreshold")
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
    genuine = [row for row in scorable if row["expectedIdentityMatch"]]
    impostor = [row for row in scorable if not row["expectedIdentityMatch"]]

    false_rejects = (
        sum(row["decision"] == "FAIL" for row in genuine)
        if thresholded
        else None
    )
    false_accepts = (
        sum(row["decision"] == "PASS" for row in impostor)
        if thresholded
        else None
    )
    metrics = {
        "caseCount": len(rows),
        "scorableCount": len(scorable),
        "unscorableCount": len(rows) - len(scorable),
        "genuineCount": len(genuine),
        "impostorCount": len(impostor),
        "falseRejectRate": (
            false_rejects / len(genuine)
            if false_rejects is not None and genuine
            else None
        ),
        "falseAcceptRate": (
            false_accepts / len(impostor)
            if false_accepts is not None and impostor
            else None
        ),
    }
    report = {
        "schemaVersion": BENCHMARK_SCHEMA,
        "datasetVersion": spec["datasetVersion"],
        "commit": spec["commit"],
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
