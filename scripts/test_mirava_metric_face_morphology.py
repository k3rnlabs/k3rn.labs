from __future__ import annotations

import importlib.util
import math
from pathlib import Path

import numpy as np


SCRIPT = (
    Path(__file__).resolve().parent
    / "mirava-metric-face-morphology.py"
)

SPEC = importlib.util.spec_from_file_location(
    "mirava_metric_face_morphology",
    SCRIPT,
)

if SPEC is None or SPEC.loader is None:
    raise RuntimeError(
        "Unable to load metric morphology tool"
    )

module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


def synthetic_mesh() -> np.ndarray:
    rng = np.random.default_rng(20260813)

    mesh = rng.normal(
        size=(
            module.VERTEX_COUNT,
            3,
        )
    )

    # Make the fixture strongly non-symmetric so a
    # reflection cannot accidentally look equivalent.
    mesh[:, 0] += np.linspace(
        -0.75,
        1.25,
        module.VERTEX_COUNT,
    )

    mesh[:, 1] += np.sin(
        np.linspace(
            0.0,
            4.0 * math.pi,
            module.VERTEX_COUNT,
        )
    )

    return mesh


def test_contract_is_diagnostic_only() -> None:
    assert (
        module.SCHEMA_VERSION
        == "metric-face-morphology/v1"
    )

    assert (
        module.REGION_ALIGNMENT_POLICY
        == "single-global-468-alignment/v1"
    )

    assert (
        module.REGION_SOURCE_PACKAGE
        == "@mediapipe/tasks-vision"
    )

    assert (
        module.REGION_SOURCE_VERSION
        == "1.0.1"
    )


def test_canonical_region_counts_are_frozen() -> None:
    assert {
        name: len(indices)
        for name, indices
        in module.REGIONS.items()
    } == {
        "stableCore": 376,
        "faceOval": 36,
        "eyebrows": 20,
        "eyes": 32,
        "lips": 40,
    }


def test_stable_core_excludes_expression_regions() -> None:
    excluded = (
        set(module.LIPS)
        | set(module.EYES)
        | set(module.EYEBROWS)
    )

    assert not (
        set(module.STABLE_CORE)
        & excluded
    )

    assert (
        len(module.STABLE_CORE)
        + len(excluded)
        == module.VERTEX_COUNT
    )


def test_global_alignment_removes_similarity_transform() -> None:
    source = synthetic_mesh()

    theta = math.radians(37.0)

    rotation = np.array(
        [
            [
                math.cos(theta),
                -math.sin(theta),
                0.0,
            ],
            [
                math.sin(theta),
                math.cos(theta),
                0.0,
            ],
            [0.0, 0.0, 1.0],
        ],
        dtype=np.float64,
    )

    transformed = (
        source @ rotation
        * 4.25
        + np.array(
            [9.0, -13.0, 4.5]
        )
    )

    result = module.proper_procrustes(
        source,
        transformed,
    )

    assert result["rms"] < 1e-10

    for region in module.REGIONS:
        assert (
            result["regions"][region]["rms"]
            < 1e-10
        )


def test_proper_alignment_does_not_accept_reflection() -> None:
    source = synthetic_mesh()

    reflected = source.copy()
    reflected[:, 0] *= -1.0

    result = module.proper_procrustes(
        source,
        reflected,
    )

    assert result["rms"] > 1e-3


def test_region_metrics_use_same_global_alignment() -> None:
    source = synthetic_mesh()
    target = source.copy()

    # Modify only the lips in target space.
    target[
        np.asarray(
            module.LIPS,
            dtype=np.int64,
        ),
        0,
    ] += 0.5

    global_residuals = (
        module.globally_aligned_residuals(
            source,
            target,
        )
    )

    result = module.proper_procrustes(
        source,
        target,
    )

    for region, indices in (
        module.REGIONS.items()
    ):
        expected = module.residual_summary(
            global_residuals[
                np.asarray(
                    indices,
                    dtype=np.int64,
                )
            ]
        )

        assert (
            result["regions"][region]
            == expected
        )


def test_direction_semantics_are_distance_only() -> None:
    assert (
        module.direction_label(
            0.05,
            0.08,
        )
        == "USER_IDENTITY"
    )

    assert (
        module.direction_label(
            0.08,
            0.05,
        )
        == "ART_REFERENCE"
    )

    assert (
        module.direction_label(
            0.05,
            0.05,
        )
        == "TIE"
    )

def test_artifact_digest_uses_sha256_uri_form() -> None:
    digest = module.artifact_digest(
        {
            "schemaVersion":
                "metric-face-morphology/v1",
            "artifactDigest":
                "ignored",
        }
    )

    assert digest.startswith(
        "sha256:"
    )

    assert len(digest) == (
        len("sha256:")
        + 64
    )

    assert all(
        character in "0123456789abcdef"
        for character
        in digest[len("sha256:"):]
    )
