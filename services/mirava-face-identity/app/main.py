from __future__ import annotations

from contextlib import asynccontextmanager
import hmac
import math
import os
from pathlib import Path
from statistics import median
from typing import Annotated, Any

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile

from .calibration_report import load_and_verify_benchmark_report
from .engine import (
    AuraFaceEngine,
    FaceEngine,
    FaceObservation,
    cosine_similarity,
    landmark_shape_residual,
)
from .face_geometry import (
    FaceGeometry,
    POSE_ESTIMATOR_VERSION,
    estimate_face_geometry,
    geometry_payload,
    measured_cohorts,
)
from .cohort_thresholds import resolve_cohort_thresholds
from .split_isolation import load_and_verify_split_isolation_report


SCHEMA_VERSION = "mirava-face-identity-gate/v7"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MIN_REFERENCE_COUNT = 3
MAX_REFERENCE_COUNT = 6


def _required_environment(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def _threshold() -> float:
    raw = _required_environment("MIRAVA_FACE_GATE_THRESHOLD")
    try:
        value = float(raw)
    except ValueError as exc:
        raise RuntimeError("MIRAVA_FACE_GATE_THRESHOLD is invalid") from exc
    if not math.isfinite(value) or value < -1 or value > 1:
        raise RuntimeError("MIRAVA_FACE_GATE_THRESHOLD is out of range")
    return value


def _landmark_threshold() -> float:
    raw = _required_environment("MIRAVA_FACE_LANDMARK_RESIDUAL_MAX")
    try:
        value = float(raw)
    except ValueError as exc:
        raise RuntimeError("MIRAVA_FACE_LANDMARK_RESIDUAL_MAX is invalid") from exc
    if not math.isfinite(value) or value <= 0 or value > 2:
        raise RuntimeError("MIRAVA_FACE_LANDMARK_RESIDUAL_MAX is out of range")
    return value


def _evaluator_manifest(
    threshold: float, landmark_threshold: float
) -> tuple[dict[str, str], dict[str, Any]]:
    name = os.environ.get("MIRAVA_FACE_MODEL_NAME", "auraface").strip()
    version = _required_environment("MIRAVA_FACE_MODEL_VERSION")
    weights_digest = _required_environment("MIRAVA_FACE_MODEL_DIGEST")
    preprocessing_version = _required_environment(
        "MIRAVA_FACE_PREPROCESSING_VERSION"
    )
    calibration_path = _required_environment("MIRAVA_FACE_CALIBRATION_REPORT")
    calibration_digest = _required_environment("MIRAVA_FACE_CALIBRATION_DIGEST")
    test_path = _required_environment("MIRAVA_FACE_TEST_REPORT")
    test_digest = _required_environment("MIRAVA_FACE_TEST_DIGEST")
    split_isolation_path = _required_environment(
        "MIRAVA_FACE_SPLIT_ISOLATION_REPORT"
    )
    split_isolation_digest = _required_environment(
        "MIRAVA_FACE_SPLIT_ISOLATION_DIGEST"
    )
    calibration = load_and_verify_benchmark_report(
        Path(calibration_path),
        expected_split="calibration",
        expected_digest=calibration_digest,
        expected_model_name=name,
        expected_model_version=version,
        expected_model_digest=weights_digest,
        expected_preprocessing_version=preprocessing_version,
        expected_threshold=threshold,
        expected_landmark_threshold=landmark_threshold,
    )
    test = load_and_verify_benchmark_report(
        Path(test_path),
        expected_split="test",
        expected_digest=test_digest,
        expected_model_name=name,
        expected_model_version=version,
        expected_model_digest=weights_digest,
        expected_preprocessing_version=preprocessing_version,
        expected_threshold=threshold,
        expected_landmark_threshold=landmark_threshold,
    )
    isolation = load_and_verify_split_isolation_report(
        Path(split_isolation_path),
        expected_digest=split_isolation_digest,
        calibration_report=calibration,
        test_report=test,
    )
    return {
        "name": name,
        "version": version,
        "weightsDigest": weights_digest,
        "preprocessingVersion": preprocessing_version,
        "calibrationVersion": str(calibration["calibrationVersion"]),
        "calibrationDigest": str(calibration["artifactDigest"]),
        "calibrationStatus": str(calibration["status"]),
        "testDatasetVersion": str(test["datasetVersion"]),
        "testDigest": str(test["artifactDigest"]),
        "testStatus": str(test["status"]),
        "poseEstimatorVersion": POSE_ESTIMATOR_VERSION,
        "measurementContractDigest": str(calibration["measurementContractDigest"]),
        "cohortThresholdsDigest": str(calibration["cohortThresholdsDigest"]),
        "thresholdProposalDigest": str(
            calibration["thresholdProvenance"]["proposalArtifactDigest"]
        ),
        "thresholdSourceBenchmarkDigest": str(
            calibration["thresholdProvenance"]["sourceBenchmarkArtifactDigest"]
        ),
        **isolation,
    }, calibration["cohortThresholds"]


def _authorize(authorization: str | None) -> None:
    expected = _required_environment("MIRAVA_FACE_SERVICE_TOKEN")
    supplied = authorization or ""
    prefix = "Bearer "
    token = supplied[len(prefix) :] if supplied.startswith(prefix) else ""
    if not token or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


async def _read_image(upload: UploadFile) -> bytes:
    if not (upload.content_type or "").startswith("image/"):
        raise HTTPException(status_code=422, detail="Invalid image media type")
    content = await upload.read(MAX_IMAGE_BYTES + 1)
    if not content or len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=422, detail="Invalid image size")
    return content


def _candidate_face_payload(
    faces: list[FaceObservation],
    geometry: FaceGeometry | None = None,
) -> dict[str, Any]:
    if len(faces) != 1:
        return {
            "count": len(faces),
            "confidence": None,
            "box": None,
            "yaw": None,
            "pitch": None,
            "roll": None,
            "faceAreaRatio": None,
            "normalizedReprojectionError": None,
            "poseEstimatorVersion": None,
            "measuredCohorts": None,
        }

    face = faces[0]
    left, top, right, bottom = face.box
    payload: dict[str, Any] = {
        "count": 1,
        "confidence": face.confidence,
        "box": {
            "left": max(0.0, left),
            "top": max(0.0, top),
            "width": max(0.0, right - left),
            "height": max(0.0, bottom - top),
        },
    }
    try:
        payload.update(geometry_payload(geometry or estimate_face_geometry(face)))
    except ValueError:
        payload.update(
            {
                "yaw": None,
                "pitch": None,
                "roll": None,
                "faceAreaRatio": None,
                "normalizedReprojectionError": None,
                "poseEstimatorVersion": None,
                "measuredCohorts": None,
            }
        )
    return payload


def _unscorable(
    *,
    reason_code: str,
    faces: list[FaceObservation],
    threshold: float,
    landmark_threshold: float,
    evaluator: dict[str, str],
) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "decision": "UNSCORABLE",
        "reasonCode": reason_code,
        "aggregateSimilarity": None,
        "threshold": threshold,
        "landmarkResidual": None,
        "landmarkThreshold": landmark_threshold,
        "perReferenceSimilarity": [],
        "evaluator": evaluator,
        "candidateFace": _candidate_face_payload(faces),
    }


def create_app(engine: FaceEngine | None = None) -> FastAPI:
    engine_holder: dict[str, FaceEngine] = {}
    configuration_holder: dict[str, Any] = {}

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        threshold = _threshold()
        landmark_threshold = _landmark_threshold()
        evaluator, cohort_thresholds = _evaluator_manifest(
            threshold, landmark_threshold
        )
        configuration_holder.update(
            {
                "threshold": threshold,
                "landmarkThreshold": landmark_threshold,
                "cohortThresholds": cohort_thresholds,
                "evaluator": evaluator,
            }
        )
        _required_environment("MIRAVA_FACE_SERVICE_TOKEN")
        engine_holder["engine"] = engine or AuraFaceEngine()
        yield
        engine_holder.clear()
        configuration_holder.clear()

    application = FastAPI(
        title="MIRAVA Face Identity Gate",
        version="1.0.0",
        docs_url=None,
        redoc_url=None,
        lifespan=lifespan,
    )

    @application.get("/health/ready")
    async def ready() -> dict[str, str]:
        if "engine" not in engine_holder:
            raise HTTPException(status_code=503, detail="Not ready")
        return {"status": "ready"}

    @application.post("/v1/evaluate")
    async def evaluate(
        candidate: Annotated[UploadFile, File()],
        references: Annotated[list[UploadFile], File()],
        identity_manifest_version: Annotated[
            str, Form(alias="identityManifestVersion")
        ],
        request_id: Annotated[str, Form(alias="requestId")],
        authorization: Annotated[str | None, Header()] = None,
    ) -> dict[str, Any]:
        _authorize(authorization)

        if not identity_manifest_version.strip() or not request_id.strip():
            raise HTTPException(status_code=422, detail="Missing trace metadata")
        if not MIN_REFERENCE_COUNT <= len(references) <= MAX_REFERENCE_COUNT:
            raise HTTPException(status_code=422, detail="Invalid reference count")

        face_engine = engine_holder["engine"]
        threshold = configuration_holder["threshold"]
        landmark_threshold = configuration_holder["landmarkThreshold"]
        evaluator = configuration_holder["evaluator"]
        try:
            candidate_faces = face_engine.observe(await _read_image(candidate))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid candidate image") from exc

        if len(candidate_faces) != 1:
            reason = (
                "CANDIDATE_FACE_NOT_FOUND"
                if not candidate_faces
                else "CANDIDATE_MULTIPLE_FACES"
            )
            return _unscorable(
                reason_code=reason,
                faces=candidate_faces,
                threshold=threshold,
                landmark_threshold=landmark_threshold,
                evaluator=evaluator,
            )

        try:
            candidate_geometry = estimate_face_geometry(candidate_faces[0])
        except ValueError:
            return _unscorable(
                reason_code="CANDIDATE_GEOMETRY_INVALID",
                faces=candidate_faces,
                threshold=threshold,
                landmark_threshold=landmark_threshold,
                evaluator=evaluator,
            )

        applied_thresholds = resolve_cohort_thresholds(
            configuration_holder["cohortThresholds"],
            measured_cohorts(candidate_geometry),
        )
        threshold = applied_thresholds["similarityMin"]
        landmark_threshold = applied_thresholds["landmarkResidualMax"]

        reference_faces: list[FaceObservation] = []
        for reference in references:
            try:
                observed = face_engine.observe(await _read_image(reference))
            except ValueError as exc:
                raise HTTPException(
                    status_code=422, detail="Invalid reference image"
                ) from exc
            if len(observed) != 1:
                return _unscorable(
                    reason_code="REFERENCE_FACE_INVALID",
                    faces=candidate_faces,
                    threshold=threshold,
                    landmark_threshold=landmark_threshold,
                    evaluator=evaluator,
                )
            reference_faces.append(observed[0])

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
        embedding_pass = aggregate >= threshold
        landmark_pass = aggregate_landmark_residual <= landmark_threshold
        benchmark_evidence_accepted = (
            evaluator["calibrationStatus"] == "PASS"
            and evaluator["testStatus"] == "PASS"
            and evaluator["splitIsolationStatus"] == "PASS"
        )
        decision = (
            "PASS"
            if benchmark_evidence_accepted and embedding_pass and landmark_pass
            else "FAIL"
        )

        return {
            "schemaVersion": SCHEMA_VERSION,
            "decision": decision,
            "reasonCode": (
                "CALIBRATED_PASS"
                if decision == "PASS"
                else "BENCHMARK_EVIDENCE_NOT_ACCEPTED"
                if not benchmark_evidence_accepted
                else "IDENTITY_DRIFT"
                if not embedding_pass
                else "LANDMARK_DRIFT"
            ),
            "aggregateSimilarity": aggregate,
            "threshold": threshold,
            "landmarkResidual": aggregate_landmark_residual,
            "landmarkThreshold": landmark_threshold,
            "perReferenceSimilarity": scores,
            "evaluator": evaluator,
            "candidateFace": _candidate_face_payload(
                candidate_faces,
                candidate_geometry,
            ),
        }

    return application


app = create_app()
