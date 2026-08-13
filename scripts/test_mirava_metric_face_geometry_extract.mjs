import assert from "node:assert/strict"
import test from "node:test"

import {
  EXPECTED_MEDIAPIPE_VERSION,
  EXPECTED_BUNDLE_SHA256,
  EXPECTED_INSTRUMENTED_BUNDLE_SHA256,
  EXPECTED_MODEL_SHA256,
  SCHEMA_VERSION,
  EXPECTED_LANDMARK_COUNT,
  EXPECTED_VERTEX_COUNT,
  EXPECTED_VERTEX_STRIDE,
  EXPECTED_TRIANGLE_COUNT,
  EXPECTED_VERTEX_VALUE_COUNT,
  EXPECTED_INDEX_COUNT,
  ORIGINAL_LISTENER,
  INSTRUMENTED_LISTENER,
  countOccurrences,
  instrumentBundle,
  validateRawGeometry,
} from "./mirava-metric-face-geometry-extract.mjs"


test(
  "freezes diagnostic contract",
  () => {
    assert.equal(
      SCHEMA_VERSION,
      "metric-face-geometry-observations/v1",
    )

    assert.equal(
      EXPECTED_MEDIAPIPE_VERSION,
      "1.0.1",
    )

    assert.equal(
      EXPECTED_LANDMARK_COUNT,
      478,
    )

    assert.equal(
      EXPECTED_VERTEX_COUNT,
      468,
    )

    assert.equal(
      EXPECTED_VERTEX_STRIDE,
      5,
    )

    assert.equal(
      EXPECTED_TRIANGLE_COUNT,
      898,
    )

    assert.equal(
      EXPECTED_VERTEX_VALUE_COUNT,
      2340,
    )

    assert.equal(
      EXPECTED_INDEX_COUNT,
      2694,
    )
  },
)


test(
  "freezes runtime digests",
  () => {
    assert.equal(
      EXPECTED_BUNDLE_SHA256,
      "sha256:d885630c297c0b20b1fe86096cb06291c4c8080876f27852e724f24ac603713f",
    )

    assert.equal(
      EXPECTED_INSTRUMENTED_BUNDLE_SHA256,
      "sha256:b164e55698dd613ebdb6ac30bde7333e8e58cde67609ea6e11acd6d55242bb77",
    )

    assert.equal(
      EXPECTED_MODEL_SHA256,
      "sha256:64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
    )
  },
)


test(
  "instruments exactly one internal listener",
  () => {
    const source =
      "before" +
      ORIGINAL_LISTENER +
      "after"

    const result =
      instrumentBundle(
        source,
      )

    assert.equal(
      countOccurrences(
        result,
        ORIGINAL_LISTENER,
      ),
      0,
    )

    assert.equal(
      countOccurrences(
        result,
        INSTRUMENTED_LISTENER,
      ),
      1,
    )

    assert.equal(
      result,
      "before" +
      INSTRUMENTED_LISTENER +
      "after",
    )
  },
)


test(
  "fails closed when internal listener is absent",
  () => {
    assert.throws(
      () =>
        instrumentBundle(
          "mediapipe changed",
        ),
      /MEDIAPIPE_INTERNAL_ANCHOR_MISMATCH/,
    )
  },
)


test(
  "fails closed when internal listener is ambiguous",
  () => {
    assert.throws(
      () =>
        instrumentBundle(
          ORIGINAL_LISTENER +
          ORIGINAL_LISTENER,
        ),
      /expected 1 occurrence, found 2/,
    )
  },
)


function validRawGeometry() {
  const vertices =
    Array.from(
      {
        length:
          EXPECTED_VERTEX_VALUE_COUNT,
      },
      (_, index) =>
        index / 1000,
    )

  const indices =
    Array.from(
      {
        length:
          EXPECTED_INDEX_COUNT,
      },
      (_, index) =>
        index %
        EXPECTED_VERTEX_COUNT,
    )

  return [
    [
      null,
      null,
      vertices,
      indices,
    ],
    null,
  ]
}


test(
  "accepts canonical 468 XYZUV / 898 triangle mesh",
  () => {
    const result =
      validateRawGeometry(
        validRawGeometry(),
        "FIXTURE",
      )

    assert.deepEqual(
      result,
      {
        vertexCount: 468,
        vertexStride: 5,
        triangleCount: 898,
      },
    )
  },
)


test(
  "rejects wrong vertex count",
  () => {
    const value =
      validRawGeometry()

    value[0][2].pop()

    assert.throws(
      () =>
        validateRawGeometry(
          value,
          "FIXTURE",
        ),
      /expected 2340 XYZUV values/,
    )
  },
)


test(
  "rejects invalid topology index",
  () => {
    const value =
      validRawGeometry()

    value[0][3][0] =
      EXPECTED_VERTEX_COUNT

    assert.throws(
      () =>
        validateRawGeometry(
          value,
          "FIXTURE",
        ),
      /invalid topology index/,
    )
  },
)


test(
  "rejects non-finite vertex",
  () => {
    const value =
      validRawGeometry()

    value[0][2][100] =
      Number.NaN

    assert.throws(
      () =>
        validateRawGeometry(
          value,
          "FIXTURE",
        ),
      /non-finite vertex value/,
    )
  },
)
