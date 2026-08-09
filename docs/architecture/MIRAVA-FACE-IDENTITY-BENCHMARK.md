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
- yaw/pitch/roll cohort and image-quality flags;
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
