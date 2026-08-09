from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
from pathlib import Path
from typing import Any

from .benchmark import BENCHMARK_SCHEMA, _canonical_json, _partition_digest
from .calibration_report import benchmark_artifact_digest


SUBJECT_KEY_SCHEME = "hmac-sha256/v1"


def _hmac_key_id(pseudonym_key: bytes) -> str:
    if len(pseudonym_key) < 32:
        raise ValueError("Pseudonym HMAC key must contain at least 32 bytes")
    return "sha256:" + hashlib.sha256(pseudonym_key).hexdigest()


def _subject_key(pseudonym_key: bytes, subject_id: str) -> str:
    normalized = subject_id.strip()
    if not normalized:
        raise ValueError("Private subject IDs must be non-empty strings")
    return hmac.new(
        pseudonym_key,
        normalized.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _private_subject_ids(value: object, expected_split: str) -> list[str]:
    if not isinstance(value, dict) or value.get("datasetSplit") != expected_split:
        raise ValueError(f"Expected the private {expected_split} subject inventory")
    subject_ids = value.get("subjectIds")
    if (
        not isinstance(subject_ids, list)
        or not subject_ids
        or not all(isinstance(subject_id, str) and subject_id.strip() for subject_id in subject_ids)
    ):
        raise ValueError("Private subject inventory is invalid")
    normalized = [subject_id.strip() for subject_id in subject_ids]
    if len(set(normalized)) != len(normalized):
        raise ValueError("Private subject inventory contains duplicates")
    return normalized


def _verified_report(value: object, expected_split: str) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("schemaVersion") != BENCHMARK_SCHEMA:
        raise ValueError("Benchmark report schema is invalid")
    if value.get("datasetSplit") != expected_split:
        raise ValueError(f"Expected the {expected_split} dataset split")
    artifact_digest = value.get("artifactDigest")
    if artifact_digest != benchmark_artifact_digest(value):
        raise ValueError("Benchmark artifact digest does not match")
    scheme = value.get("subjectKeyScheme")
    if not isinstance(scheme, str) or not scheme.strip():
        raise ValueError("subjectKeyScheme is required")
    key_id = value.get("subjectKeyKeyId")
    if not isinstance(key_id, str) or not key_id.strip():
        raise ValueError("subjectKeyKeyId is required")
    rows = value.get("rows")
    if not isinstance(rows, list) or not rows:
        raise ValueError("Benchmark rows are required")
    if any(
        not isinstance(row, dict)
        or any(
            not isinstance(row.get(field), str) or not row[field].strip()
            for field in ("candidateSubjectKey", "referenceSubjectKey")
        )
        for row in rows
    ):
        raise ValueError("Benchmark subject keys are invalid")
    subject_keys = {
        row[field]
        for row in rows
        for field in ("candidateSubjectKey", "referenceSubjectKey")
    }
    expected_partition = "sha256:" + _partition_digest(subject_keys)
    if value.get("subjectPartitionDigest") != expected_partition:
        raise ValueError("Benchmark subject partition digest does not match")
    return value


def verify_split_isolation(
    calibration: object,
    test: object,
    *,
    pseudonym_key: bytes,
    calibration_subject_inventory: object,
    test_subject_inventory: object,
) -> dict[str, Any]:
    calibration_report = _verified_report(calibration, "calibration")
    test_report = _verified_report(test, "test")
    if (
        calibration_report["subjectKeyScheme"] != SUBJECT_KEY_SCHEME
        or test_report["subjectKeyScheme"] != SUBJECT_KEY_SCHEME
    ):
        raise ValueError("Benchmark subject key scheme is not supported")
    if calibration_report["subjectKeyKeyId"] != test_report["subjectKeyKeyId"]:
        raise ValueError("Calibration and test subject HMAC key IDs differ")
    actual_key_id = _hmac_key_id(pseudonym_key)
    if calibration_report["subjectKeyKeyId"] != actual_key_id:
        raise ValueError("Benchmark subject HMAC key ID does not match the supplied key")

    calibration_source_ids = _private_subject_ids(
        calibration_subject_inventory,
        "calibration",
    )
    test_source_ids = _private_subject_ids(test_subject_inventory, "test")
    if set(calibration_source_ids) & set(test_source_ids):
        raise ValueError("Calibration and test private subject inventories overlap")

    calibration_subjects = {
        row[field]
        for row in calibration_report["rows"]
        for field in ("candidateSubjectKey", "referenceSubjectKey")
    }
    test_subjects = {
        row[field]
        for row in test_report["rows"]
        for field in ("candidateSubjectKey", "referenceSubjectKey")
    }
    expected_calibration_subjects = {
        _subject_key(pseudonym_key, subject_id)
        for subject_id in calibration_source_ids
    }
    expected_test_subjects = {
        _subject_key(pseudonym_key, subject_id)
        for subject_id in test_source_ids
    }
    if calibration_subjects != expected_calibration_subjects:
        raise ValueError("Calibration subject keys do not match the private inventory")
    if test_subjects != expected_test_subjects:
        raise ValueError("Test subject keys do not match the private inventory")
    overlap = calibration_subjects & test_subjects
    if overlap:
        raise ValueError("Calibration and test subject partitions overlap")

    evidence = {
        "schemaVersion": "mirava-face-identity-split-isolation/v1",
        "subjectKeyScheme": calibration_report["subjectKeyScheme"],
        "subjectKeyKeyId": calibration_report["subjectKeyKeyId"],
        "calibrationArtifactDigest": "sha256:" + calibration_report["artifactDigest"],
        "testArtifactDigest": "sha256:" + test_report["artifactDigest"],
        "calibrationPartitionDigest": calibration_report["subjectPartitionDigest"],
        "testPartitionDigest": test_report["subjectPartitionDigest"],
        "calibrationSubjectCount": len(calibration_subjects),
        "testSubjectCount": len(test_subjects),
        "status": "PASS",
    }
    evidence["artifactDigest"] = hashlib.sha256(
        _canonical_json(evidence).encode("utf-8")
    ).hexdigest()
    return evidence


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verify MIRAVA calibration/test subject isolation"
    )
    parser.add_argument("--calibration", required=True)
    parser.add_argument("--test", required=True)
    parser.add_argument("--calibration-subjects", required=True)
    parser.add_argument("--test-subjects", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    pseudonym_key = os.environ.get("MIRAVA_BENCHMARK_PSEUDONYM_KEY", "").encode(
        "utf-8"
    )
    if not pseudonym_key:
        raise RuntimeError("MIRAVA_BENCHMARK_PSEUDONYM_KEY is required")
    calibration = json.loads(Path(args.calibration).read_text(encoding="utf-8"))
    test = json.loads(Path(args.test).read_text(encoding="utf-8"))
    calibration_subject_inventory = json.loads(
        Path(args.calibration_subjects).read_text(encoding="utf-8")
    )
    test_subject_inventory = json.loads(
        Path(args.test_subjects).read_text(encoding="utf-8")
    )
    evidence = verify_split_isolation(
        calibration,
        test,
        pseudonym_key=pseudonym_key,
        calibration_subject_inventory=calibration_subject_inventory,
        test_subject_inventory=test_subject_inventory,
    )
    Path(args.output).write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
