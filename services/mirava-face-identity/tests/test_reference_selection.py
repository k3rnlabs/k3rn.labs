from __future__ import annotations

import pytest

from app.face_geometry import FaceGeometry
from app.reference_selection import (
    REFERENCE_SELECTION_STRATEGY,
    select_pose_compatible_references,
)


def geometry(
    *,
    yaw: float,
    pitch: float = 0.0,
    roll: float = 0.0,
    face_area_ratio: float = 0.1,
) -> FaceGeometry:
    return FaceGeometry(
        yaw=yaw,
        pitch=pitch,
        roll=roll,
        face_area_ratio=face_area_ratio,
        normalized_reprojection_error=0.01,
    )


def test_prefers_matching_yaw_pitch_and_roll_cohorts() -> None:
    candidate = geometry(
        yaw=0.0,
        pitch=0.0,
        roll=0.0,
        face_area_ratio=0.01,
    )

    references = [
        geometry(
            yaw=-2.0,
            pitch=0.0,
            roll=0.0,
        ),
        geometry(
            yaw=35.0,
            pitch=0.0,
            roll=0.0,
        ),
        geometry(
            yaw=-70.0,
            pitch=0.0,
            roll=0.0,
        ),
    ]

    selection = select_pose_compatible_references(
        candidate,
        references,
    )

    assert selection.strategy == (
        REFERENCE_SELECTION_STRATEGY
    )

    assert selection.selected_indices == (0,)


def test_keeps_multiple_references_when_all_are_pose_compatible() -> None:
    candidate = geometry(
        yaw=2.0,
        pitch=1.0,
        roll=0.0,
    )

    references = [
        geometry(
            yaw=-4.0,
            pitch=3.0,
            roll=1.0,
        ),
        geometry(
            yaw=8.0,
            pitch=-2.0,
            roll=-2.0,
        ),
        geometry(
            yaw=40.0,
            pitch=0.0,
            roll=0.0,
        ),
    ]

    selection = select_pose_compatible_references(
        candidate,
        references,
    )

    assert selection.selected_indices == (0, 1)


def test_pitch_refines_the_matching_yaw_pool_when_available() -> None:
    candidate = geometry(
        yaw=0.0,
        pitch=20.0,
        roll=0.0,
    )

    references = [
        geometry(
            yaw=0.0,
            pitch=0.0,
            roll=0.0,
        ),
        geometry(
            yaw=5.0,
            pitch=18.0,
            roll=0.0,
        ),
    ]

    selection = select_pose_compatible_references(
        candidate,
        references,
    )

    assert selection.selected_indices == (1,)


def test_roll_refines_yaw_and_pitch_when_available() -> None:
    candidate = geometry(
        yaw=0.0,
        pitch=0.0,
        roll=15.0,
    )

    references = [
        geometry(
            yaw=0.0,
            pitch=0.0,
            roll=0.0,
        ),
        geometry(
            yaw=5.0,
            pitch=0.0,
            roll=14.0,
        ),
    ]

    selection = select_pose_compatible_references(
        candidate,
        references,
    )

    assert selection.selected_indices == (1,)


def test_face_scale_does_not_exclude_close_portrait_identity_authority() -> None:
    candidate = geometry(
        yaw=0.0,
        face_area_ratio=0.01,
    )

    reference = geometry(
        yaw=0.0,
        face_area_ratio=0.12,
    )

    selection = select_pose_compatible_references(
        candidate,
        [reference],
    )

    assert selection.selected_indices == (0,)


def test_falls_back_to_nearest_angle_when_yaw_cohort_is_missing() -> None:
    candidate = geometry(
        yaw=0.0,
        pitch=0.0,
        roll=0.0,
    )

    references = [
        geometry(
            yaw=30.0,
            pitch=0.0,
            roll=0.0,
        ),
        geometry(
            yaw=-70.0,
            pitch=0.0,
            roll=0.0,
        ),
    ]

    selection = select_pose_compatible_references(
        candidate,
        references,
    )

    assert selection.selected_indices == (0,)

    assert selection.angular_distances[0] == pytest.approx(
        30.0
    )

    assert selection.angular_distances[1] == pytest.approx(
        70.0
    )


def test_rejects_an_empty_reference_set() -> None:
    with pytest.raises(
        ValueError,
        match="At least one reference geometry",
    ):
        select_pose_compatible_references(
            geometry(yaw=0.0),
            [],
        )
