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
MIRAVA_FACE_SERVICE_TOKEN=<private random token>
```

The threshold has no default. The service refuses to become ready until a
calibrated value is supplied.

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
