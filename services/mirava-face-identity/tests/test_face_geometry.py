from __future__ import annotations

import cv2
import numpy as np
import pytest

from app.engine import FaceObservation
from app.face_geometry import (
    FaceGeometry,
    declared_geometry_matches,
    estimate_face_geometry,
    measured_cohorts,
)


MODEL_POINTS = np.asarray(
    [
        (-30.0, -30.0, -30.0),
        (30.0, -30.0, -30.0),
        (0.0, 0.0, 0.0),
        (-25.0, 30.0, -20.0),
        (25.0, 30.0, -20.0),
    ],
    dtype=np.float64,
)


def observation(pitch: float, yaw: float, roll: float) -> FaceObservation:
    width = height = 400
    pitch_radians, yaw_radians, roll_radians = np.radians(
        [pitch, yaw, roll]
    )
    rx = np.asarray(
        [
            [1, 0, 0],
            [0, np.cos(pitch_radians), -np.sin(pitch_radians)],
            [0, np.sin(pitch_radians), np.cos(pitch_radians)],
        ]
    )
    ry = np.asarray(
        [
            [np.cos(yaw_radians), 0, np.sin(yaw_radians)],
            [0, 1, 0],
            [-np.sin(yaw_radians), 0, np.cos(yaw_radians)],
        ]
    )
    rz = np.asarray(
        [
            [np.cos(roll_radians), -np.sin(roll_radians), 0],
            [np.sin(roll_radians), np.cos(roll_radians), 0],
            [0, 0, 1],
        ]
    )
    rotation_vector, _ = cv2.Rodrigues(rz @ ry @ rx)
    camera = np.asarray(
        [[width, 0, width / 2], [0, width, height / 2], [0, 0, 1]],
        dtype=np.float64,
    )
    projected, _ = cv2.projectPoints(
        MODEL_POINTS,
        rotation_vector,
        np.asarray([[0.0], [0.0], [700.0]]),
        camera,
        np.zeros((4, 1)),
    )
    return FaceObservation(
        confidence=0.99,
        box=(100.0, 80.0, 300.0, 320.0),
        embedding=(1.0, 0.0),
        landmarks=tuple(tuple(map(float, point)) for point in projected.reshape(5, 2)),
        image_size=(width, height),
    )


@pytest.mark.parametrize(
    ("pitch", "yaw", "roll"),
    [
        (0.0, 0.0, 0.0),
        (15.0, 0.0, 0.0),
        (-15.0, 0.0, 0.0),
        (0.0, 25.0, 0.0),
        (0.0, -25.0, 0.0),
        (0.0, 0.0, 20.0),
        (10.0, 20.0, 15.0),
    ],
)
def test_recovers_the_frozen_synthetic_pose_convention(
    pitch: float, yaw: float, roll: float
) -> None:
    measured = estimate_face_geometry(observation(pitch, yaw, roll))

    assert measured.pitch == pytest.approx(pitch, abs=1e-6)
    assert measured.yaw == pytest.approx(yaw, abs=1e-6)
    assert measured.roll == pytest.approx(roll, abs=1e-6)
    assert measured.normalized_reprojection_error < 1e-9


def test_classifies_pose_and_scale_from_measurements() -> None:
    geometry = FaceGeometry(
        yaw=-60.0,
        pitch=20.0,
        roll=-15.0,
        face_area_ratio=0.01,
        normalized_reprojection_error=0.01,
    )

    assert measured_cohorts(geometry) == {
        "yaw": "profile-left",
        "pitch": "up",
        "roll": "tilted-left",
        "faceScale": "full-body",
    }
    assert declared_geometry_matches(
        {
            "yaw": "profile-left",
            "pitch": "up",
            "roll": "tilted-left",
            "faceScale": "full-body",
        },
        geometry,
    )


def test_rejects_a_declared_cohort_that_contradicts_measurements() -> None:
    geometry = FaceGeometry(0.0, 0.0, 0.0, 0.1, 0.01)

    assert not declared_geometry_matches(
        {
            "yaw": "profile-right",
            "pitch": "neutral",
            "roll": "neutral",
            "faceScale": "close-portrait",
        },
        geometry,
    )


def test_requires_image_dimensions_for_replayable_face_scale() -> None:
    value = observation(0.0, 0.0, 0.0)
    without_dimensions = FaceObservation(
        value.confidence,
        value.box,
        value.embedding,
        value.landmarks,
    )

    with pytest.raises(ValueError, match="image size"):
        estimate_face_geometry(without_dimensions)


@pytest.mark.parametrize(
    "landmarks",
    [
        ((1.0, 1.0),) * 5,
        (
            (1.0, 1.0),
            (2.0, 2.0),
            (3.0, 3.0),
            (4.0, 4.0),
            (5.0, 5.0),
        ),
    ],
)
def test_converts_degenerate_landmarks_to_a_fail_closed_value_error(
    landmarks: tuple[tuple[float, float], ...],
) -> None:
    invalid = FaceObservation(
        confidence=0.99,
        box=(0.0, 0.0, 100.0, 100.0),
        embedding=(1.0, 0.0),
        landmarks=landmarks,
        image_size=(200, 200),
    )

    with pytest.raises(ValueError, match="degenerate"):
        estimate_face_geometry(invalid)
