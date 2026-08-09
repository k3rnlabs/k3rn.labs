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
MIRAVA_FACE_SERVICE_TOKEN=<private random token>
```

Neither threshold has a default. The service refuses to become ready until both
calibrated values and their verified benchmark report are supplied. A PASS
requires both the embedding threshold and the normalized landmark-shape
residual ceiling. A numeric smoke-test threshold cannot silently masquerade as
a production calibration because its version and SHA-256 are part of every
evaluation result. The service recomputes the report artifact digest, matches
its evaluator and thresholds to the active runtime, and requires non-empty
genuine/impostor cohorts. A report whose acceptance status is `FAIL` forces
every otherwise successful comparison to `CALIBRATION_NOT_ACCEPTED`.

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
