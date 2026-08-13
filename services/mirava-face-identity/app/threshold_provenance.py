from __future__ import annotations

import math
import re
from typing import Any


THRESHOLD_PROVENANCE_SCHEMA = "mirava-face-threshold-provenance/v1"
_SHA256_DIGEST = re.compile(r"^sha256:[0-9a-f]{64}$")


def _digest(value: object, field: str) -> str:
    if not isinstance(value, str) or not _SHA256_DIGEST.fullmatch(value):
        raise ValueError(f"{field} must be a sha256 digest")
    return value


def validate_threshold_provenance(value: object) -> dict[str, str]:
    if not isinstance(value, dict) or set(value) != {
        "schemaVersion",
        "proposalArtifactDigest",
        "sourceBenchmarkArtifactDigest",
    }:
        raise ValueError("thresholdProvenance fields are invalid")
    if value.get("schemaVersion") != THRESHOLD_PROVENANCE_SCHEMA:
        raise ValueError("thresholdProvenance schema is invalid")
    return {
        "schemaVersion": THRESHOLD_PROVENANCE_SCHEMA,
        "proposalArtifactDigest": _digest(
            value.get("proposalArtifactDigest"),
            "thresholdProvenance.proposalArtifactDigest",
        ),
        "sourceBenchmarkArtifactDigest": _digest(
            value.get("sourceBenchmarkArtifactDigest"),
            "thresholdProvenance.sourceBenchmarkArtifactDigest",
        ),
    }
