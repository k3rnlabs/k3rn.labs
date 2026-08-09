# MIRAVA Face Identity Service

Private inference service for the MIRAVA identity gate. It detects exactly one
candidate face, compares it with canonical consented references and returns a
calibrated decision without returning embeddings.

## Production model policy

The initial production candidate is `fal/AuraFace-v1`. Its model card and model
repository declare Apache-2.0 and commercial use. The model directory must be
mounted at runtime; it is deliberately not downloaded implicitly by the
application or committed to Git.

Required files are the AuraFace detection and recognition ONNX artifacts. The
deployment must pin their repository revision and SHA-256 digests. Set:

```text
MIRAVA_FACE_MODEL_ROOT=/models
MIRAVA_FACE_MODEL_NAME=auraface
MIRAVA_FACE_MODEL_VERSION=1.0
MIRAVA_FACE_MODEL_DIGEST=sha256:<verified-manifest-digest>
MIRAVA_FACE_PREPROCESSING_VERSION=mirava-auraface-align-v1
MIRAVA_FACE_GATE_THRESHOLD=<calibrated cohort threshold>
MIRAVA_FACE_LANDMARK_RESIDUAL_MAX=<calibrated five-landmark residual ceiling>
MIRAVA_FACE_CALIBRATION_REPORT=/private/calibration/benchmark-report.json
MIRAVA_FACE_CALIBRATION_DIGEST=sha256:<benchmark artifact digest>
MIRAVA_FACE_TEST_REPORT=/private/test/benchmark-report.json
MIRAVA_FACE_TEST_DIGEST=sha256:<held-out benchmark artifact digest>
MIRAVA_FACE_SPLIT_ISOLATION_REPORT=/private/evidence/split-isolation.json
MIRAVA_FACE_SPLIT_ISOLATION_DIGEST=sha256:<isolation artifact digest>
MIRAVA_FACE_SERVICE_TOKEN=<private random token>
```

Neither threshold has a default. The service refuses to become ready until both
calibrated values, an accepted calibration report, an accepted held-out test
report and their accepted split-isolation evidence are supplied. Both reports
must use the same frozen threshold version, evaluator, acceptance contract and
canonical coverage contract. Their subject partitions and artifact digests must
match the isolation evidence exactly. A numeric smoke-test threshold cannot
silently masquerade as production evidence because all three SHA-256 digests
are pinned in configuration and returned with every evaluation. The service
fails startup instead of exposing `/health/ready` when any evidence is missing,
tampered, rejected or mutually inconsistent.

Once ready, a candidate PASS still requires both the embedding threshold and
the normalized landmark-shape residual ceiling. The Node client accepts the v4
response only when calibration, held-out test and isolation statuses are all
`PASS`.

Provision the exact licensed artifacts into the mounted model volume:

```bash
.venv/bin/python provision_model.py \
  --destination /models/models/auraface
```

The command reads the committed `model-source-manifest.json`, downloads the
fixed repository revision, verifies every byte count and SHA-256, includes the
Apache-2.0 license, and prints the canonical digest to use as
`MIRAVA_FACE_MODEL_DIGEST`. The destination must initially be absent; the
provisioner stores immutable verified versions beside it and exposes the active
version through a provisioner-managed symbolic link. Reprovisioning changes
that link with one atomic filesystem operation, so interruption cannot remove
the previously active model. Service startup recomputes the manifest digest and
every artifact digest before initializing ONNX Runtime. Floating revisions and
implicit InsightFace downloads are not accepted.

## API

`POST /v1/evaluate` accepts multipart fields:

- `candidate`: one generated image;
- `references`: three or more canonical identity views;
- `identityManifestVersion`: server-owned manifest version;
- `requestId`: opaque trace ID.

All calls require `Authorization: Bearer ...`. Images are decoded in memory and
are never written to disk. Logs must contain request IDs and reason codes only.

## Local verification

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest
```

Unit tests inject a deterministic fake engine and do not require biometric
weights. A separate gated integration suite must exercise the pinned ONNX files
before production activation.

## Private benchmark

The benchmark runner evaluates genuine and impostor cases with the same pinned
engine while keeping image paths and embeddings out of its report:

```bash
.venv/bin/python -m app.benchmark \
  --manifest benchmark.private.json \
  --output benchmark-report.private.json
```

Start from `benchmark.example.json`. Every row must declare all scenario axes,
including rows expected to be unscorable. `threshold` may be `null` for raw
measurement; a thresholded acceptance report must use a separately calibrated,
versioned threshold and a complete `acceptance` object. Both the input manifest
and output report are private biometric evidence and must not be committed.

Schema v2 also requires the canonical v1 coverage contract. A thresholded run
cannot PASS unless every cohort documented in the architecture matrix has the
configured minimum number of scorable genuine and impostor cases. Custom
diagnostic matrices always produce a non-accepted report.

Use stable HMAC-derived pseudonyms for `candidateSubjectKey` and
`referenceSubjectKey` (never names, emails or user IDs). Genuine rows require
the same key; impostor rows require different keys. `subjectPartitionDigest` is
the SHA-256 of the canonical sorted union of both key fields. Calibration and
final test populations must be disjoint and use the same pseudonym scheme.
`subjectKeyKeyId` must be a non-secret identifier or fingerprint of the HMAC
key; both splits must use the same value so a changed secret cannot hide a
shared person. Verify this before accepting production thresholds:

```bash
export MIRAVA_BENCHMARK_PSEUDONYM_KEY='<private high-entropy key>'
.venv/bin/python -m app.split_isolation \
  --calibration benchmark-calibration.private.json \
  --test benchmark-test.private.json \
  --calibration-subjects subjects-calibration.private.json \
  --test-subjects subjects-test.private.json \
  --output split-isolation.private.json
```

Each private subject inventory has the shape
`{"datasetSplit":"calibration|test","subjectIds":["private-stable-id"]}`.
The verifier derives every expected pseudonym itself with the supplied HMAC key,
requires an exact match with each report, and checks both raw and pseudonymous
partitions for overlap. The isolation evidence contains only counts and
digests, not source IDs or subject keys. Keep all inventories, manifests and
reports in private evidence storage; do not commit biometric dataset paths or
pseudonymous row-level evidence.
