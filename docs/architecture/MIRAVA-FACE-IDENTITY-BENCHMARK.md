# MIRAVA Face Identity Benchmark

Status: REQUIRED BEFORE PRODUCTION GATE
Version: 1.0-draft
Date: 2026-08-09

## Purpose

This benchmark measures whether MIRAVA preserves a consented person's identity
while changing expression, view, pose, scene and lighting. It must distinguish
generator quality, restoration gain and verifier reliability.

## Dataset contract

- Only adult participants with explicit identity-generation and benchmark
  consent.
- Train/calibration/test identities are disjoint.
- At least three enrollment views: front, angle and profile-right.
- Raw photographs and embeddings remain private and deletable.
- Every asset has a content hash, capture role and provenance record.
- Synthetic images never become enrollment truth.

The initial Amy case is a regression fixture for visual diagnosis, not enough to
calibrate a population-wide threshold.

## Scenario matrix

Each identity is evaluated across these independent axes:

| Axis | Required cohorts |
| --- | --- |
| Yaw | frontal, three-quarter left/right, profile left/right |
| Pitch | down, neutral, up |
| Roll | neutral, tilted left/right |
| Expression | neutral, closed-mouth smile, open smile, serious, surprised |
| Gaze | camera, left, right, up, down |
| Face scale | close portrait, half-body, full-body |
| Light | soft frontal, side light, hard light, low light, warm/cool mixed |
| Occlusion | none, hair partial, glasses, hand near face |
| Styling | natural, makeup, wet look, hairstyle change |
| Context | studio, interior, exterior, night, campaign reference transfer |

Unsupported or unsafe combinations are recorded as `UNSCORABLE`; they are not
removed from the denominator silently.

## Measurements

For each candidate and each restoration attempt, store:

- generator/provider/model/version and prompt hash;
- seed or provider task ID when available;
- enrollment manifest version;
- detected face count, face box and usable face pixels;
- measured yaw/pitch/roll angles, face-area ratio, normalized five-point
  reprojection error, estimator version and derived cohorts;
- per-reference and aggregate evaluator scores;
- stable landmark-ratio residuals;
- gate decision and reason code;
- latency and provider cost class;
- restoration region and attempt number;
- blinded human identity rating and reviewer disagreement.

## Calibration

1. Build genuine pairs from held-out real photographs of the same participant.
2. Build impostor pairs from different consenting participants.
3. Split results by pose/quality cohort.
4. Select operating thresholds against the required false-accept ceiling and
   report the corresponding false-reject rate.
5. Freeze evaluator weight digests, preprocessing and thresholds together.
6. Recalibrate whenever any of those components changes.

A recognition benchmark accuracy is not a MIRAVA delivery threshold. No single
number is translated into an invented “identity percentage”.

## Acceptance gates

The system can be called end-to-end only when replayable evidence proves:

1. every provider route passes through the same gate;
2. a known lookalike/impostor candidate is rejected;
3. an unscorable or multi-face candidate is withheld;
4. Pass B improves the calibrated identity measurement without changing the
   protected scene outside its restoration region;
5. retry/resume does not regenerate durable Pass A;
6. budget exhaustion withholds the result instead of bypassing the gate;
7. profile deletion removes manifests, embeddings and temporary crops;
8. score distributions and false rejects are reviewed across demographic and
   pose cohorts;
9. production configuration, authenticated service calls and real RESULT
   persistence are verified in a real session.

## Required evidence artifact

Each benchmark run produces an immutable manifest containing command, commit,
configuration hashes, evaluator digests, dataset version, scenario rows,
aggregate metrics and failures. A PASS without that artifact is invalid.

A thresholded run must additionally declare a calibration version and explicit
ceilings for false accepts, false rejects and unscorable delivery, plus minimum
genuine and impostor cohort sizes. The runner computes `acceptanceStatus`; the
private gate re-verifies this report and cannot emit `PASS` when that status is
`FAIL`.

Schema v4 encodes the table above as the immutable `canonical-v1` coverage
profile. Omitting a cohort or using an undeclared value invalidates calibration;
a custom diagnostic profile can never receive an accepted PASS. Candidate and
reference subjects use separate HMAC-derived pseudonyms so impostor pairs do
not hide a second identity. Calibration/test isolation is verified with the
same private HMAC key, whose non-secret SHA-256 key ID is recomputed by the
trusted verifier rather than accepted from report metadata. The verifier also
re-derives the complete expected pseudonym set from private per-split subject
inventories and refuses missing, additional or differently keyed subjects.
The inference service independently replays both reports and the resulting
isolation artifact at startup. It refuses readiness unless calibration and
held-out test both PASS under the same threshold version, evaluator,
acceptance contract and canonical coverage contract, and unless every report
and partition digest matches the isolation artifact pinned in runtime
configuration.

Schema v4 also pins `mirava-face-measurement/v1`. Its pose convention is
`Rz(roll) @ Ry(yaw) @ Rx(pitch)`: negative yaw/roll mean left in the image and
positive pitch means up in the image. The candidate geometry is computed from
the five detector landmarks and image dimensions by
`mirava-five-point-sqpnp-v1`. Face scale is the clamped face-box area divided by
image area. Fixed angle and area tolerances handle boundary noise; both the
boundaries and tolerances are covered by the configuration and artifact
digests. A declared pose or scale that contradicts the measurements is
`UNSCORABLE`, so scenario labels cannot manufacture coverage.

This five-point weak-camera estimate is only a reproducible operational
instrument. It is sensitive to lens and facial-proportion bias, especially at
extreme pose. Its boundaries require population calibration and held-out
validation; synthetic projection recovery proves the convention, not real-world
accuracy.

Schema v4 additionally binds `mirava-face-cohort-thresholds/v1` to calibration
and held-out test artifacts. It covers every measured yaw, pitch, roll and
face-scale value. Runtime applies `strictest-applicable/v1`: the effective
similarity floor is the maximum and the landmark-residual ceiling is the
minimum among the global baseline and four measured cohorts. Every row stores
the resolved values and the verifier recomputes them. The values remain inputs
from population calibration, never defaults inferred from synthetic tests.
Coverage for these four axes is counted from measured candidate cohorts, not
from scenario labels, including inside boundary-tolerance bands.

Minimum cohort sizes count only `SCORABLE` genuine and impostor rows. An
unscorable genuine delivery remains a false reject; an unscorable impostor is
excluded from the false-accept denominator and cannot satisfy the minimum
impostor cohort. All unscorable rows remain covered by the separate unscorable
rate ceiling.

## Executable runner

The private service exposes a deterministic runner:

```bash
python -m app.benchmark \
  --manifest benchmark.private.json \
  --output benchmark-report.private.json
```

It requires every scenario axis, retains unscorable rows in the denominator,
separates genuine and impostor cases, emits configuration and artifact digests,
and never emits paths or embeddings. The example manifest is
`services/mirava-face-identity/benchmark.example.json`.

An unthresholded calibration report can be passed to
`python -m app.threshold_calibration`. This offline step enumerates observed
similarity/residual pairs and emits a versioned policy only when its explicit
FAR/FRR and minimum-count limits are satisfied globally and in every measured
geometry cohort. It contains aggregate counts, rates and digests—not image paths,
embeddings, subject IDs or row-level evidence. It is a proposal: MIRAVA still
requires a thresholded calibration rerun, an independent held-out rerun and split
isolation before a service can become ready. The runner requires a separately
pinned expected source digest and rejects every unscorable source row, so it
cannot hide delivery failures or calibrate from a self-rehashed report.

## 2026-08-09 two-reference diagnostic — not a gate calibration

The supplied Amy fixture contains two real identity photographs, not the three
canonical views required by the production contract. An ephemeral diagnostic
used OpenCV SFace 2021dec with YuNet 2023mar and therefore cannot produce a
MIRAVA PASS. Raw cosine similarities were:

| Pair | SFace cosine |
| --- | ---: |
| `id1` ↔ `id2` | 0.766840 |
| generated full frame ↔ `id1` | 0.838531 |
| generated full frame ↔ `id2` | 0.809144 |
| generated zoom ↔ `id1` | 0.857241 |
| generated zoom ↔ `id2` | 0.825967 |

Observation: this evaluator ranks the generated face closer to each reference
than the two real photographs are to one another, despite the visible anatomical
drift documented in the review.

Inference: a single face-recognition embedding is not sufficient evidence for
MIRAVA's fine-grained identity promise. Production calibration must add
independent facial-geometry/landmark residuals and blinded human review, and
must contain genuine and impostor pairs across pose cohorts. These values must
not be converted into an invented identity percentage or production threshold.

## 2026-08-09 pinned AuraFace execution smoke — not a benchmark PASS

The private service was provisioned and executed locally with the committed
AuraFace source manifest. Replayable technical facts:

- repository revision:
  `af6d057c9b0ec4071d4c49c80e3539258798b609`;
- verified canonical model manifest digest:
  `sha256:3b1c57976178fabcb3a3b156587cb1a98dc1ebfd2d6fd64afd1c41128accbef4`;
- the pinned SCRFD detector, AuraFace recognizer and Apache-2.0 license all
  matched their committed byte counts and SHA-256 values;
- the CPU service reached `/health/ready`, rejected an unauthenticated
  evaluation request, detected exactly one candidate face and returned no
  embedding field;
- the generated Amy candidate produced an aggregate AuraFace similarity of
  `0.7704018090488813` and a five-landmark residual of
  `0.10318363629412187` in that smoke request.

This is deliberately **not** acceptance evidence. Only two genuine enrollment
views were available, so `id1` was duplicated solely to exercise the three-file
HTTP contract. The smoke used an explicitly labelled
`non-production-smoke-only-v1` threshold configuration. Its `PASS` decision is
therefore invalid for delivery, calibration or product claims. The useful proof
is limited to pinned artifact loading, authenticated transport, real ONNX
inference and trace metadata propagation.
