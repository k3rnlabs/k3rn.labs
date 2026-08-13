from __future__ import annotations

import cv2
import numpy as np
import pytest

from app.engine import FaceObservation
from app.identity_scoring import (
    IDENTITY_AGGREGATION_STRATEGY,
    IDENTITY_REFERENCE_SCALE_POLICY,
    IDENTITY_SCORING_SCHEMA,
    identity_scoring_contract,
    score_identity_pose_aware,
)
from app.reference_selection import (
    REFERENCE_SELECTION_STRATEGY,
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


def observation(
    embedding: tuple[float, ...],
    *,
    pitch: float,
    yaw: float,
    roll: float,
) -> FaceObservation:
    width = height = 400

    pitch_radians, yaw_radians, roll_radians = np.radians(
        [pitch, yaw, roll]
    )

    rx = np.asarray(
        [
            [1, 0, 0],
            [
                0,
                np.cos(pitch_radians),
                -np.sin(pitch_radians),
            ],
            [
                0,
                np.sin(pitch_radians),
                np.cos(pitch_radians),
            ],
        ]
    )

    ry = np.asarray(
        [
            [
                np.cos(yaw_radians),
                0,
                np.sin(yaw_radians),
            ],
            [0, 1, 0],
            [
                -np.sin(yaw_radians),
                0,
                np.cos(yaw_radians),
            ],
        ]
    )

    rz = np.asarray(
        [
            [
                np.cos(roll_radians),
                -np.sin(roll_radians),
                0,
            ],
            [
                np.sin(roll_radians),
                np.cos(roll_radians),
                0,
            ],
            [0, 0, 1],
        ]
    )

    rotation_vector, _ = cv2.Rodrigues(
        rz @ ry @ rx
    )

    camera = np.asarray(
        [
            [width, 0, width / 2],
            [0, width, height / 2],
            [0, 0, 1],
        ],
        dtype=np.float64,
    )

    projected, _ = cv2.projectPoints(
        MODEL_POINTS,
        rotation_vector,
        np.asarray(
            [[0.0], [0.0], [700.0]]
        ),
        camera,
        np.zeros(
            (4, 1),
            dtype=np.float64,
        ),
    )

    return FaceObservation(
        confidence=0.99,
        box=(100.0, 80.0, 300.0, 320.0),
        embedding=embedding,
        landmarks=tuple(
            tuple(map(float, point))
            for point in projected.reshape(5, 2)
        ),
        image_size=(width, height),
    )


def test_pose_aware_scoring_uses_the_matching_reference() -> None:
    candidate = observation(
        (1.0, 0.0),
        pitch=0.0,
        yaw=0.0,
        roll=0.0,
    )

    references = [
        observation(
            (1.0, 0.0),
            pitch=0.0,
            yaw=0.0,
            roll=0.0,
        ),
        observation(
            (0.6, 0.8),
            pitch=0.0,
            yaw=35.0,
            roll=0.0,
        ),
        observation(
            (0.2, 0.9797958971),
            pitch=0.0,
            yaw=-70.0,
            roll=0.0,
        ),
    ]

    score = score_identity_pose_aware(
        candidate,
        references,
    )

    assert score.selection_strategy == (
        REFERENCE_SELECTION_STRATEGY
    )

    assert score.selected_reference_indices == (
        0,
    )

    assert score.per_reference_similarity == pytest.approx(
        (
            1.0,
            0.6,
            0.2,
        ),
        abs=1e-9,
    )

    assert score.aggregate_similarity == pytest.approx(
        1.0,
        abs=1e-9,
    )

    assert score.aggregate_landmark_residual == pytest.approx(
        0.0,
        abs=1e-9,
    )


def test_pose_aware_scoring_keeps_median_for_multiple_compatible_refs() -> None:
    candidate = observation(
        (1.0, 0.0),
        pitch=0.0,
        yaw=0.0,
        roll=0.0,
    )

    references = [
        observation(
            (1.0, 0.0),
            pitch=0.0,
            yaw=-5.0,
            roll=0.0,
        ),
        observation(
            (0.8, 0.6),
            pitch=0.0,
            yaw=5.0,
            roll=0.0,
        ),
        observation(
            (0.0, 1.0),
            pitch=0.0,
            yaw=50.0,
            roll=0.0,
        ),
    ]

    score = score_identity_pose_aware(
        candidate,
        references,
    )

    assert score.selected_reference_indices == (
        0,
        1,
    )

    assert score.aggregate_similarity == pytest.approx(
        0.9,
        abs=1e-9,
    )


def test_pose_aware_scoring_rejects_empty_references() -> None:
    candidate = observation(
        (1.0, 0.0),
        pitch=0.0,
        yaw=0.0,
        roll=0.0,
    )

    with pytest.raises(
        ValueError,
        match="At least one reference observation",
    ):
        score_identity_pose_aware(
            candidate,
            [],
        )



def test_identity_scoring_contract_is_frozen_and_versioned() -> None:
    contract = identity_scoring_contract()

    assert contract == {
        "schemaVersion": IDENTITY_SCORING_SCHEMA,
        "referenceSelectionStrategy": (
            REFERENCE_SELECTION_STRATEGY
        ),
        "aggregationStrategy": (
            IDENTITY_AGGREGATION_STRATEGY
        ),
        "poseEstimatorVersion": (
            "mirava-five-point-sqpnp-v1"
        ),
        "referenceScalePolicy": (
            IDENTITY_REFERENCE_SCALE_POLICY
        ),
    }

    assert contract["schemaVersion"] == (
        "mirava-face-identity-scoring/v1"
    )

    assert contract["referenceSelectionStrategy"] == (
        "pose-compatible-cohort/v1"
    )

    assert contract["aggregationStrategy"] == (
        "median-selected-references/v1"
    )

    assert contract["referenceScalePolicy"] == (
        "ignore-face-scale-for-selection/v1"
    )


def test_identity_scoring_contract_returns_fresh_evidence() -> None:
    first = identity_scoring_contract()
    second = identity_scoring_contract()

    first["schemaVersion"] = "tampered"

    assert second["schemaVersion"] == (
        "mirava-face-identity-scoring/v1"
    )
