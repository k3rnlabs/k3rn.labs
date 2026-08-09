from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path

import pytest

from app.benchmark import _canonical_json, _partition_digest
from app.calibration_report import benchmark_artifact_digest
from app.split_isolation import (
    _hmac_key_id,
    _subject_key,
    load_and_verify_split_isolation_report,
    verify_split_isolation,
)


PSEUDONYM_KEY = b"mirava-test-pseudonym-key-32-bytes-minimum"


def inventory(split: str, subjects: list[str]) -> dict:
    return {"datasetSplit": split, "subjectIds": subjects}


def report(split: str, subject_ids: list[str]) -> dict:
    subjects = [_subject_key(PSEUDONYM_KEY, subject_id) for subject_id in subject_ids]
    value = {
        "schemaVersion": "mirava-face-identity-benchmark/v4",
        "datasetSplit": split,
        "subjectKeyScheme": "hmac-sha256/v1",
        "subjectKeyKeyId": _hmac_key_id(PSEUDONYM_KEY),
        "subjectPartitionDigest": "sha256:" + _partition_digest(set(subjects)),
        "rows": [
            {
                "candidateSubjectKey": subject,
                "referenceSubjectKey": subject,
            }
            for subject in subjects
        ],
    }
    value["artifactDigest"] = benchmark_artifact_digest(value)
    return value


def verified_metadata(value: dict) -> dict:
    subject_keys = {
        row[field]
        for row in value["rows"]
        for field in ("candidateSubjectKey", "referenceSubjectKey")
    }
    return {
        "datasetSplit": value["datasetSplit"],
        "datasetVersion": f"private-{value['datasetSplit']}-v1",
        "commit": "test-commit",
        "calibrationVersion": "calibration-v1",
        "artifactDigest": "sha256:" + value["artifactDigest"],
        "status": "PASS",
        "subjectKeyScheme": value["subjectKeyScheme"],
        "subjectKeyKeyId": value["subjectKeyKeyId"],
        "subjectPartitionDigest": value["subjectPartitionDigest"],
        "subjectCount": len(subject_keys),
        "subjectKeys": frozenset(subject_keys),
        "acceptanceContractDigest": "sha256:" + "a" * 64,
        "coverageContractDigest": "sha256:" + "b" * 64,
        "measurementContractDigest": "sha256:" + "c" * 64,
        "cohortThresholdsDigest": "sha256:" + "d" * 64,
    }


def test_emits_digest_only_evidence_for_disjoint_subjects() -> None:
    evidence = verify_split_isolation(
        report("calibration", ["subject-a", "subject-b"]),
        report("test", ["subject-c"]),
        pseudonym_key=PSEUDONYM_KEY,
        calibration_subject_inventory=inventory(
            "calibration", ["subject-a", "subject-b"]
        ),
        test_subject_inventory=inventory("test", ["subject-c"]),
    )

    assert evidence["status"] == "PASS"
    assert evidence["calibrationSubjectCount"] == 2
    assert evidence["testSubjectCount"] == 1
    assert "subject-a" not in _canonical_json(evidence)


def test_rejects_subject_leakage_between_calibration_and_test() -> None:
    with pytest.raises(ValueError, match="overlap"):
        verify_split_isolation(
            report("calibration", ["subject-a"]),
            report("test", ["subject-a"]),
            pseudonym_key=PSEUDONYM_KEY,
            calibration_subject_inventory=inventory("calibration", ["subject-a"]),
            test_subject_inventory=inventory("test", ["subject-a"]),
        )


def test_detects_a_subject_key_injected_into_the_wrong_split() -> None:
    calibration = report("calibration", ["subject-a"])
    test = report("test", ["subject-c"])
    subject_a_key = _subject_key(PSEUDONYM_KEY, "subject-a")
    subject_c_key = _subject_key(PSEUDONYM_KEY, "subject-c")
    test["rows"][0]["candidateSubjectKey"] = subject_a_key
    test["subjectPartitionDigest"] = "sha256:" + _partition_digest(
        {subject_a_key, subject_c_key}
    )
    test["artifactDigest"] = benchmark_artifact_digest(test)

    with pytest.raises(ValueError, match="do not match the private inventory"):
        verify_split_isolation(
            calibration,
            test,
            pseudonym_key=PSEUDONYM_KEY,
            calibration_subject_inventory=inventory("calibration", ["subject-a"]),
            test_subject_inventory=inventory("test", ["subject-c"]),
        )


def test_rejects_tampered_partition_evidence() -> None:
    test = deepcopy(report("test", ["subject-c"]))
    test["subjectPartitionDigest"] = "sha256:" + "0" * 64
    test["artifactDigest"] = benchmark_artifact_digest(test)

    with pytest.raises(ValueError, match="partition digest"):
        verify_split_isolation(
            report("calibration", ["subject-a"]),
            test,
            pseudonym_key=PSEUDONYM_KEY,
            calibration_subject_inventory=inventory("calibration", ["subject-a"]),
            test_subject_inventory=inventory("test", ["subject-c"]),
        )


def test_rejects_different_hmac_keys_even_when_scheme_labels_match() -> None:
    calibration = report("calibration", ["key-one-person-a"])
    test = report("test", ["key-two-person-a"])
    test["subjectKeyKeyId"] = "sha256:different-pseudonym-key-fingerprint"
    test["artifactDigest"] = benchmark_artifact_digest(test)

    with pytest.raises(ValueError, match="HMAC key IDs differ"):
        verify_split_isolation(
            calibration,
            test,
            pseudonym_key=PSEUDONYM_KEY,
            calibration_subject_inventory=inventory(
                "calibration", ["key-one-person-a"]
            ),
            test_subject_inventory=inventory("test", ["key-two-person-a"]),
        )


def test_rejects_a_reused_key_id_when_the_actual_hmac_key_changed() -> None:
    with pytest.raises(ValueError, match="does not match the supplied key"):
        verify_split_isolation(
            report("calibration", ["key-one-person-a"]),
            report("test", ["key-two-person-a"]),
            pseudonym_key=b"a-different-valid-pseudonym-key-32-bytes",
            calibration_subject_inventory=inventory(
                "calibration", ["key-one-person-a"]
            ),
            test_subject_inventory=inventory("test", ["key-two-person-a"]),
        )


def test_rejects_arbitrary_subject_keys_not_derived_from_private_inventory() -> None:
    calibration = report("calibration", ["subject-a"])
    calibration["rows"][0]["candidateSubjectKey"] = "arbitrary-key"
    calibration["rows"][0]["referenceSubjectKey"] = "arbitrary-key"
    calibration["subjectPartitionDigest"] = "sha256:" + _partition_digest(
        {"arbitrary-key"}
    )
    calibration["artifactDigest"] = benchmark_artifact_digest(calibration)

    with pytest.raises(ValueError, match="do not match the private inventory"):
        verify_split_isolation(
            calibration,
            report("test", ["subject-c"]),
            pseudonym_key=PSEUDONYM_KEY,
            calibration_subject_inventory=inventory("calibration", ["subject-a"]),
            test_subject_inventory=inventory("test", ["subject-c"]),
        )


def test_runtime_verifies_isolation_evidence_against_both_reports(
    tmp_path: Path,
) -> None:
    calibration = report("calibration", ["subject-a"])
    test = report("test", ["subject-c"])
    evidence = verify_split_isolation(
        calibration,
        test,
        pseudonym_key=PSEUDONYM_KEY,
        calibration_subject_inventory=inventory("calibration", ["subject-a"]),
        test_subject_inventory=inventory("test", ["subject-c"]),
    )
    path = tmp_path / "split-isolation.json"
    path.write_text(json.dumps(evidence), encoding="utf-8")

    result = load_and_verify_split_isolation_report(
        path,
        expected_digest="sha256:" + evidence["artifactDigest"],
        calibration_report=verified_metadata(calibration),
        test_report=verified_metadata(test),
    )

    assert result["splitIsolationStatus"] == "PASS"


def test_runtime_rejects_different_acceptance_contracts(tmp_path: Path) -> None:
    calibration = report("calibration", ["subject-a"])
    test = report("test", ["subject-c"])
    evidence = verify_split_isolation(
        calibration,
        test,
        pseudonym_key=PSEUDONYM_KEY,
        calibration_subject_inventory=inventory("calibration", ["subject-a"]),
        test_subject_inventory=inventory("test", ["subject-c"]),
    )
    path = tmp_path / "split-isolation.json"
    path.write_text(json.dumps(evidence), encoding="utf-8")
    test_metadata = verified_metadata(test)
    test_metadata["acceptanceContractDigest"] = "sha256:" + "c" * 64

    with pytest.raises(RuntimeError, match="acceptance contracts differ"):
        load_and_verify_split_isolation_report(
            path,
            expected_digest="sha256:" + evidence["artifactDigest"],
            calibration_report=verified_metadata(calibration),
            test_report=test_metadata,
        )


def test_runtime_rejects_different_measurement_contracts(tmp_path: Path) -> None:
    calibration = report("calibration", ["subject-a"])
    test = report("test", ["subject-c"])
    evidence = verify_split_isolation(
        calibration,
        test,
        pseudonym_key=PSEUDONYM_KEY,
        calibration_subject_inventory=inventory("calibration", ["subject-a"]),
        test_subject_inventory=inventory("test", ["subject-c"]),
    )
    path = tmp_path / "split-isolation.json"
    path.write_text(json.dumps(evidence), encoding="utf-8")
    test_metadata = verified_metadata(test)
    test_metadata["measurementContractDigest"] = "sha256:" + "d" * 64

    with pytest.raises(RuntimeError, match="measurement contracts differ"):
        load_and_verify_split_isolation_report(
            path,
            expected_digest="sha256:" + evidence["artifactDigest"],
            calibration_report=verified_metadata(calibration),
            test_report=test_metadata,
        )


def test_runtime_rejects_different_cohort_threshold_contracts(
    tmp_path: Path,
) -> None:
    calibration = report("calibration", ["subject-a"])
    test = report("test", ["subject-c"])
    evidence = verify_split_isolation(
        calibration,
        test,
        pseudonym_key=PSEUDONYM_KEY,
        calibration_subject_inventory=inventory("calibration", ["subject-a"]),
        test_subject_inventory=inventory("test", ["subject-c"]),
    )
    path = tmp_path / "split-isolation.json"
    path.write_text(json.dumps(evidence), encoding="utf-8")
    test_metadata = verified_metadata(test)
    test_metadata["cohortThresholdsDigest"] = "sha256:" + "e" * 64

    with pytest.raises(RuntimeError, match="cohort threshold contracts differ"):
        load_and_verify_split_isolation_report(
            path,
            expected_digest="sha256:" + evidence["artifactDigest"],
            calibration_report=verified_metadata(calibration),
            test_report=test_metadata,
        )


def test_runtime_replays_subject_overlap_instead_of_trusting_pass_status(
    tmp_path: Path,
) -> None:
    calibration = report("calibration", ["subject-a"])
    test = report("test", ["subject-c"])
    evidence = verify_split_isolation(
        calibration,
        test,
        pseudonym_key=PSEUDONYM_KEY,
        calibration_subject_inventory=inventory("calibration", ["subject-a"]),
        test_subject_inventory=inventory("test", ["subject-c"]),
    )
    path = tmp_path / "split-isolation.json"
    path.write_text(json.dumps(evidence), encoding="utf-8")
    calibration_metadata = verified_metadata(calibration)
    test_metadata = verified_metadata(test)
    test_metadata["subjectKeys"] = calibration_metadata["subjectKeys"]

    with pytest.raises(RuntimeError, match="subject partitions overlap"):
        load_and_verify_split_isolation_report(
            path,
            expected_digest="sha256:" + evidence["artifactDigest"],
            calibration_report=calibration_metadata,
            test_report=test_metadata,
        )
