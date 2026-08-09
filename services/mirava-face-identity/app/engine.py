from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Protocol

from .model_manifest import load_and_verify_model_manifest


@dataclass(frozen=True)
class FaceObservation:
    confidence: float
    box: tuple[float, float, float, float]
    embedding: tuple[float, ...]
    landmarks: tuple[tuple[float, float], ...]


class FaceEngine(Protocol):
    def observe(self, encoded_image: bytes) -> list[FaceObservation]: ...


class AuraFaceEngine:
    """AuraFace adapter with all heavyweight imports kept inside startup."""

    def __init__(self) -> None:
        import cv2
        import numpy as np
        from insightface.app import FaceAnalysis

        model_root = Path(
            os.environ.get("MIRAVA_FACE_MODEL_ROOT", "/models")
        )
        model_name = os.environ.get(
            "MIRAVA_FACE_MODEL_NAME", "auraface"
        ).strip()
        model_dir = model_root / "models" / model_name

        if not model_dir.is_dir():
            raise RuntimeError(
                f"Pinned face model directory is missing: {model_dir}"
            )

        expected_digest = os.environ.get(
            "MIRAVA_FACE_MODEL_DIGEST", ""
        ).strip()
        if not expected_digest:
            raise RuntimeError("MIRAVA_FACE_MODEL_DIGEST is required")
        load_and_verify_model_manifest(
            model_dir,
            expected_model_name=model_name,
            expected_digest=expected_digest,
        )

        provider = os.environ.get(
            "MIRAVA_FACE_ONNX_PROVIDER", "CPUExecutionProvider"
        ).strip()
        allowed_providers = {
            "CPUExecutionProvider",
            "CUDAExecutionProvider",
        }
        if provider not in allowed_providers:
            raise RuntimeError("Unsupported MIRAVA_FACE_ONNX_PROVIDER")

        self._cv2 = cv2
        self._np = np
        self._analysis = FaceAnalysis(
            name=model_name,
            root=str(model_root),
            providers=[provider],
            allowed_modules=["detection", "recognition"],
        )
        self._analysis.prepare(
            ctx_id=0 if provider == "CUDAExecutionProvider" else -1,
            det_size=(640, 640),
        )

    def observe(self, encoded_image: bytes) -> list[FaceObservation]:
        array = self._np.frombuffer(encoded_image, dtype=self._np.uint8)
        image = self._cv2.imdecode(array, self._cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Image cannot be decoded")

        observations: list[FaceObservation] = []
        for face in self._analysis.get(image):
            if face.kps is None:
                continue
            bbox = tuple(float(value) for value in face.bbox.tolist())
            embedding = tuple(
                float(value) for value in face.normed_embedding.tolist()
            )
            landmarks = tuple(
                (float(point[0]), float(point[1])) for point in face.kps.tolist()
            )
            if len(landmarks) < 5:
                continue
            observations.append(
                FaceObservation(
                    confidence=float(face.det_score),
                    box=(bbox[0], bbox[1], bbox[2], bbox[3]),
                    embedding=embedding,
                    landmarks=landmarks,
                )
            )
        return observations


def cosine_similarity(
    left: tuple[float, ...], right: tuple[float, ...]
) -> float:
    if not left or len(left) != len(right):
        raise ValueError("Embedding dimensions do not match")

    dot = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = sum(value * value for value in left) ** 0.5
    right_norm = sum(value * value for value in right) ** 0.5
    if left_norm == 0 or right_norm == 0:
        raise ValueError("Embedding norm is zero")
    return max(-1.0, min(1.0, dot / (left_norm * right_norm)))


def normalized_landmark_shape(
    observation: FaceObservation,
) -> tuple[float, ...]:
    if len(observation.landmarks) < 5:
        raise ValueError("Five facial landmarks are required")

    left_eye, right_eye, nose, mouth_left, mouth_right = observation.landmarks[:5]
    dx = right_eye[0] - left_eye[0]
    dy = right_eye[1] - left_eye[1]
    eye_distance = (dx * dx + dy * dy) ** 0.5
    if eye_distance <= 1e-6:
        raise ValueError("Eye landmarks are degenerate")

    center_x = (left_eye[0] + right_eye[0]) / 2
    center_y = (left_eye[1] + right_eye[1]) / 2
    cos_angle = dx / eye_distance
    sin_angle = dy / eye_distance

    values: list[float] = []
    for point in (nose, mouth_left, mouth_right):
        translated_x = point[0] - center_x
        translated_y = point[1] - center_y
        values.extend(
            (
                (translated_x * cos_angle + translated_y * sin_angle)
                / eye_distance,
                (-translated_x * sin_angle + translated_y * cos_angle)
                / eye_distance,
            )
        )
    return tuple(values)


def landmark_shape_residual(
    left: FaceObservation, right: FaceObservation
) -> float:
    left_shape = normalized_landmark_shape(left)
    right_shape = normalized_landmark_shape(right)
    squared = [
        (left_value - right_value) ** 2
        for left_value, right_value in zip(left_shape, right_shape, strict=True)
    ]
    return (sum(squared) / len(squared)) ** 0.5
