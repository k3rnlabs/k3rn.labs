from __future__ import annotations

from contextlib import asynccontextmanager
import hmac
import os
from statistics import median
from typing import Annotated, Any

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile

from .engine import AuraFaceEngine, FaceEngine, FaceObservation, cosine_similarity


SCHEMA_VERSION = "mirava-face-identity-gate/v1"
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
    if value < -1 or value > 1:
        raise RuntimeError("MIRAVA_FACE_GATE_THRESHOLD is out of range")
    return value


def _evaluator_manifest() -> dict[str, str]:
    return {
        "name": os.environ.get(
            "MIRAVA_FACE_MODEL_NAME", "auraface"
        ).strip(),
        "version": _required_environment("MIRAVA_FACE_MODEL_VERSION"),
        "weightsDigest": _required_environment("MIRAVA_FACE_MODEL_DIGEST"),
        "preprocessingVersion": _required_environment(
            "MIRAVA_FACE_PREPROCESSING_VERSION"
        ),
    }


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
) -> dict[str, Any]:
    if len(faces) != 1:
        return {
            "count": len(faces),
            "confidence": None,
            "box": None,
            "yaw": None,
            "pitch": None,
            "roll": None,
        }

    face = faces[0]
    left, top, right, bottom = face.box
    return {
        "count": 1,
        "confidence": face.confidence,
        "box": {
            "left": max(0.0, left),
            "top": max(0.0, top),
            "width": max(0.0, right - left),
            "height": max(0.0, bottom - top),
        },
        "yaw": None,
        "pitch": None,
        "roll": None,
    }


def _unscorable(
    *, reason_code: str, faces: list[FaceObservation]
) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "decision": "UNSCORABLE",
        "reasonCode": reason_code,
        "aggregateSimilarity": None,
        "threshold": _threshold(),
        "perReferenceSimilarity": [],
        "evaluator": _evaluator_manifest(),
        "candidateFace": _candidate_face_payload(faces),
    }


def create_app(engine: FaceEngine | None = None) -> FastAPI:
    engine_holder: dict[str, FaceEngine] = {}

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        _threshold()
        _evaluator_manifest()
        _required_environment("MIRAVA_FACE_SERVICE_TOKEN")
        engine_holder["engine"] = engine or AuraFaceEngine()
        yield
        engine_holder.clear()

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
            return _unscorable(reason_code=reason, faces=candidate_faces)

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
                )
            reference_faces.append(observed[0])

        scores = [
            cosine_similarity(candidate_faces[0].embedding, reference.embedding)
            for reference in reference_faces
        ]
        aggregate = float(median(scores))
        threshold = _threshold()
        decision = "PASS" if aggregate >= threshold else "FAIL"

        return {
            "schemaVersion": SCHEMA_VERSION,
            "decision": decision,
            "reasonCode": (
                "CALIBRATED_PASS" if decision == "PASS" else "IDENTITY_DRIFT"
            ),
            "aggregateSimilarity": aggregate,
            "threshold": threshold,
            "perReferenceSimilarity": scores,
            "evaluator": _evaluator_manifest(),
            "candidateFace": _candidate_face_payload(candidate_faces),
        }

    return application


app = create_app()
