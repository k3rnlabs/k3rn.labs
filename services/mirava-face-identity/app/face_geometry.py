from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Any

from .engine import FaceObservation


POSE_ESTIMATOR_VERSION = "mirava-five-point-sqpnp-v1"
MEASUREMENT_CONTRACT = {
    "schemaVersion": "mirava-face-measurement/v1",
    "poseEstimatorVersion": POSE_ESTIMATOR_VERSION,
    "angleConvention": {
        "rotationOrder": "Rz(roll)@Ry(yaw)@Rx(pitch)",
        "yawNegative": "left-in-image",
        "yawPositive": "right-in-image",
        "pitchNegative": "down-in-image",
        "pitchPositive": "up-in-image",
        "rollNegative": "tilted-left-in-image",
        "rollPositive": "tilted-right-in-image",
    },
    "cohortBoundaries": {
        "yawFrontalMaxAbsDegrees": 12.0,
        "yawProfileMinAbsDegrees": 50.0,
        "pitchNeutralMaxAbsDegrees": 10.0,
        "rollNeutralMaxAbsDegrees": 8.0,
        "closePortraitMinFaceAreaRatio": 0.08,
        "halfBodyMinFaceAreaRatio": 0.02,
    },
    "declaredCohortTolerance": {
        "angleDegrees": 3.0,
        "faceAreaRatio": 0.005,
    },
    "maxNormalizedReprojectionError": 0.12,
}


@dataclass(frozen=True)
class FaceGeometry:
    yaw: float
    pitch: float
    roll: float
    face_area_ratio: float
    normalized_reprojection_error: float
    estimator_version: str = POSE_ESTIMATOR_VERSION


def estimate_face_geometry(observation: FaceObservation) -> FaceGeometry:
    """Estimate five-point pose with a versioned weak-camera approximation.

    These angles are operational cohort measurements, not anthropometric ground
    truth. Population calibration remains required because a five-point model
    cannot remove lens and facial-proportion bias.
    """
    if observation.image_size is None or len(observation.landmarks) < 5:
        raise ValueError("Face image size and five landmarks are required")
    width, height = observation.image_size
    if width <= 0 or height <= 0:
        raise ValueError("Face image size is invalid")

    import cv2
    import numpy as np

    image_points = np.asarray(observation.landmarks[:5], dtype=np.float64)
    if image_points.shape != (5, 2) or not np.isfinite(image_points).all():
        raise ValueError("Face landmarks are invalid")
    centered_points = image_points - image_points.mean(axis=0)
    if np.linalg.matrix_rank(centered_points, tol=1e-6) < 2:
        raise ValueError("Face landmarks are degenerate")
    model_points = np.asarray(
        [
            (-30.0, -30.0, -30.0),
            (30.0, -30.0, -30.0),
            (0.0, 0.0, 0.0),
            (-25.0, 30.0, -20.0),
            (25.0, 30.0, -20.0),
        ],
        dtype=np.float64,
    )
    focal = float(width)
    camera = np.asarray(
        [[focal, 0.0, width / 2.0], [0.0, focal, height / 2.0], [0.0, 0.0, 1.0]],
        dtype=np.float64,
    )
    try:
        success, rotation_vector, translation_vector = cv2.solvePnP(
            model_points,
            image_points,
            camera,
            np.zeros((4, 1), dtype=np.float64),
            flags=cv2.SOLVEPNP_SQPNP,
        )
    except cv2.error as exc:
        raise ValueError("Five-point pose cannot be solved") from exc
    if not success:
        raise ValueError("Five-point pose cannot be solved")
    try:
        rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
        angles = cv2.RQDecomp3x3(rotation_matrix)[0]
        pitch, yaw, roll = (float(value) for value in angles)
        projected, _ = cv2.projectPoints(
            model_points,
            rotation_vector,
            translation_vector,
            camera,
            np.zeros((4, 1), dtype=np.float64),
        )
    except cv2.error as exc:
        raise ValueError("Five-point pose projection failed") from exc
    residuals = projected.reshape(5, 2) - image_points
    rmse = float(np.sqrt(np.mean(np.sum(residuals * residuals, axis=1))))

    left, top, right, bottom = observation.box
    clamped_left = min(float(width), max(0.0, left))
    clamped_right = min(float(width), max(0.0, right))
    clamped_top = min(float(height), max(0.0, top))
    clamped_bottom = min(float(height), max(0.0, bottom))
    box_width = max(0.0, clamped_right - clamped_left)
    box_height = max(0.0, clamped_bottom - clamped_top)
    box_diagonal = math.hypot(box_width, box_height)
    if box_diagonal <= 1e-6:
        raise ValueError("Face box is degenerate")
    values = (pitch, yaw, roll, rmse)
    if not all(math.isfinite(value) for value in values):
        raise ValueError("Face geometry is non-finite")
    normalized_error = rmse / box_diagonal
    if normalized_error > float(MEASUREMENT_CONTRACT["maxNormalizedReprojectionError"]):
        raise ValueError("Five-point reprojection error is too high")

    return FaceGeometry(
        yaw=yaw,
        pitch=pitch,
        roll=roll,
        face_area_ratio=(box_width * box_height) / float(width * height),
        normalized_reprojection_error=normalized_error,
    )


def measured_cohorts(geometry: FaceGeometry) -> dict[str, str]:
    bounds: dict[str, Any] = MEASUREMENT_CONTRACT["cohortBoundaries"]  # type: ignore[assignment]
    yaw_abs = abs(geometry.yaw)
    yaw = (
        "frontal"
        if yaw_abs <= bounds["yawFrontalMaxAbsDegrees"]
        else ("profile-left" if geometry.yaw < 0 else "profile-right")
        if yaw_abs >= bounds["yawProfileMinAbsDegrees"]
        else "three-quarter-left"
        if geometry.yaw < 0
        else "three-quarter-right"
    )
    pitch = (
        "neutral"
        if abs(geometry.pitch) <= bounds["pitchNeutralMaxAbsDegrees"]
        else "down"
        if geometry.pitch < 0
        else "up"
    )
    roll = (
        "neutral"
        if abs(geometry.roll) <= bounds["rollNeutralMaxAbsDegrees"]
        else "tilted-left"
        if geometry.roll < 0
        else "tilted-right"
    )
    scale = (
        "close-portrait"
        if geometry.face_area_ratio >= bounds["closePortraitMinFaceAreaRatio"]
        else "half-body"
        if geometry.face_area_ratio >= bounds["halfBodyMinFaceAreaRatio"]
        else "full-body"
    )
    return {"yaw": yaw, "pitch": pitch, "roll": roll, "faceScale": scale}


def declared_geometry_matches(
    scenario: dict[str, str], geometry: FaceGeometry
) -> bool:
    bounds: dict[str, Any] = MEASUREMENT_CONTRACT["cohortBoundaries"]  # type: ignore[assignment]
    tolerance: dict[str, Any] = MEASUREMENT_CONTRACT["declaredCohortTolerance"]  # type: ignore[assignment]
    angle = float(tolerance["angleDegrees"])
    scale = float(tolerance["faceAreaRatio"])

    yaw_abs = abs(geometry.yaw)
    yaw_matches = {
        "frontal": yaw_abs <= bounds["yawFrontalMaxAbsDegrees"] + angle,
        "three-quarter-left": (
            geometry.yaw < 0
            and yaw_abs >= bounds["yawFrontalMaxAbsDegrees"] - angle
            and yaw_abs <= bounds["yawProfileMinAbsDegrees"] + angle
        ),
        "three-quarter-right": (
            geometry.yaw > 0
            and yaw_abs >= bounds["yawFrontalMaxAbsDegrees"] - angle
            and yaw_abs <= bounds["yawProfileMinAbsDegrees"] + angle
        ),
        "profile-left": geometry.yaw < 0 and yaw_abs >= bounds["yawProfileMinAbsDegrees"] - angle,
        "profile-right": geometry.yaw > 0 and yaw_abs >= bounds["yawProfileMinAbsDegrees"] - angle,
    }.get(scenario["yaw"], False)
    pitch_matches = {
        "neutral": abs(geometry.pitch) <= bounds["pitchNeutralMaxAbsDegrees"] + angle,
        "down": geometry.pitch < -(bounds["pitchNeutralMaxAbsDegrees"] - angle),
        "up": geometry.pitch > bounds["pitchNeutralMaxAbsDegrees"] - angle,
    }.get(scenario["pitch"], False)
    roll_matches = {
        "neutral": abs(geometry.roll) <= bounds["rollNeutralMaxAbsDegrees"] + angle,
        "tilted-left": geometry.roll < -(bounds["rollNeutralMaxAbsDegrees"] - angle),
        "tilted-right": geometry.roll > bounds["rollNeutralMaxAbsDegrees"] - angle,
    }.get(scenario["roll"], False)
    area = geometry.face_area_ratio
    scale_matches = {
        "close-portrait": area >= bounds["closePortraitMinFaceAreaRatio"] - scale,
        "half-body": (
            area >= bounds["halfBodyMinFaceAreaRatio"] - scale
            and area <= bounds["closePortraitMinFaceAreaRatio"] + scale
        ),
        "full-body": area <= bounds["halfBodyMinFaceAreaRatio"] + scale,
    }.get(scenario["faceScale"], False)
    return yaw_matches and pitch_matches and roll_matches and scale_matches


def geometry_payload(geometry: FaceGeometry) -> dict[str, float | str | dict[str, str]]:
    return {
        "yaw": geometry.yaw,
        "pitch": geometry.pitch,
        "roll": geometry.roll,
        "faceAreaRatio": geometry.face_area_ratio,
        "normalizedReprojectionError": geometry.normalized_reprojection_error,
        "poseEstimatorVersion": geometry.estimator_version,
        "measuredCohorts": measured_cohorts(geometry),
    }
