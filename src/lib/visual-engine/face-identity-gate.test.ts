import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest"

import {
  MiravaFaceIdentityGateError,
  evaluateMiravaFaceIdentity,
} from "./face-identity-gate"

const originalUrl =
  process.env
    .MIRAVA_FACE_IDENTITY_GATE_URL
const originalToken =
  process.env
    .MIRAVA_FACE_IDENTITY_GATE_TOKEN

const image = {
  buffer:
    Buffer.from("image"),
  mimeType:
    "image/png",
  fileName:
    "face.png",
}

function validGateResponse() {
  return {
    schemaVersion:
      "mirava-face-identity-gate/v5",
    decision:
      "PASS",
    reasonCode:
      "CALIBRATED_PASS",
    aggregateSimilarity:
      0.84,
    threshold:
      0.8,
    landmarkResidual:
      0.08,
    landmarkThreshold:
      0.12,
    perReferenceSimilarity:
      [0.82, 0.84, 0.86],
    evaluator: {
      name:
        "auraface",
      version:
        "1.0",
      weightsDigest:
        `sha256:${"b".repeat(64)}`,
      preprocessingVersion:
        "mirava-align-v1",
      calibrationVersion:
        "consented-cohorts-v1",
      calibrationDigest:
        `sha256:${"a".repeat(64)}`,
      calibrationStatus:
        "PASS",
      testDatasetVersion:
        "held-out-consented-v1",
      testDigest:
        `sha256:${"c".repeat(64)}`,
      testStatus:
        "PASS",
      splitIsolationDigest:
        `sha256:${"d".repeat(64)}`,
      splitIsolationStatus:
        "PASS",
      poseEstimatorVersion:
        "mirava-five-point-sqpnp-v1",
      measurementContractDigest:
        "sha256:f4749d3adf7af528627a0a54f18100f7f331c06aee7cd05841180d7db32bb9d4",
    },
    candidateFace: {
      count: 1,
      confidence: 0.99,
      box: {
        left: 100,
        top: 120,
        width: 200,
        height: 240,
      },
      yaw: 4,
      pitch: -2,
      roll: 1,
      faceAreaRatio: 0.12,
      normalizedReprojectionError: 0.01,
      poseEstimatorVersion:
        "mirava-five-point-sqpnp-v1",
      measuredCohorts: {
        yaw: "frontal",
        pitch: "neutral",
        roll: "neutral",
        faceScale: "close-portrait",
      },
    },
  }
}

afterEach(() => {
  process.env
    .MIRAVA_FACE_IDENTITY_GATE_URL =
    originalUrl
  process.env
    .MIRAVA_FACE_IDENTITY_GATE_TOKEN =
    originalToken
})

describe(
  "MIRAVA face identity gate client",
  () => {
    it(
      "sends candidate and canonical references without exposing the token in the body",
      async () => {
        process.env
          .MIRAVA_FACE_IDENTITY_GATE_URL =
          "https://identity.internal.example"
        process.env
          .MIRAVA_FACE_IDENTITY_GATE_TOKEN =
          "private-token"

        const fetchImpl:
          typeof fetch =
          async (input, init) => {
            expect(
              input.toString(),
            ).toBe(
              "https://identity.internal.example/v1/evaluate",
            )
            expect(
              init?.headers,
            ).toEqual({
              Authorization:
                "Bearer private-token",
            })

            const form =
              init?.body as FormData

            expect(
              form.getAll(
                "references",
              ),
            ).toHaveLength(3)
            expect(
              form.get(
                "identityManifestVersion",
              ),
            ).toBe("manifest-7")

            return new Response(
              JSON.stringify(
                validGateResponse(),
              ),
              {
                status: 200,
                headers: {
                  "Content-Type":
                    "application/json",
                },
              },
            )
          }

        const result =
          await evaluateMiravaFaceIdentity({
            candidate: image,
            references: [
              image,
              image,
              image,
            ],
            identityManifestVersion:
              "manifest-7",
            requestId:
              "request-1",
            fetchImpl,
          })

        expect(result.decision)
          .toBe("PASS")
      },
    )

    it(
      "fails closed when the service is not configured",
      async () => {
        delete process.env
          .MIRAVA_FACE_IDENTITY_GATE_URL
        delete process.env
          .MIRAVA_FACE_IDENTITY_GATE_TOKEN

        await expect(
          evaluateMiravaFaceIdentity({
            candidate: image,
            references: [
              image,
              image,
              image,
            ],
            identityManifestVersion:
              "manifest-7",
            requestId:
              "request-1",
          }),
        ).rejects.toMatchObject({
          code:
            "FACE_IDENTITY_GATE_CONFIGURATION",
          retryable:
            false,
        })
      },
    )

    it(
      "rejects a malformed or embedding-bearing response contract",
      async () => {
        process.env
          .MIRAVA_FACE_IDENTITY_GATE_URL =
          "http://127.0.0.1:9000"
        process.env
          .MIRAVA_FACE_IDENTITY_GATE_TOKEN =
          "private-token"

        const fetchImpl:
          typeof fetch =
          async () =>
            new Response(
              JSON.stringify({
                ...validGateResponse(),
                candidateFace: {
                  ...validGateResponse()
                    .candidateFace,
                  embedding:
                    [0.1, 0.2],
                },
              }),
              {
                status: 200,
              },
            )

        try {
          await evaluateMiravaFaceIdentity({
            candidate: image,
            references: [
              image,
              image,
              image,
            ],
            identityManifestVersion:
              "manifest-7",
            requestId:
              "request-1",
            fetchImpl,
          })

          throw new Error(
            "Expected invalid gate response",
          )
        } catch (error) {
          expect(error)
            .toBeInstanceOf(
              MiravaFaceIdentityGateError,
            )
          expect(error)
            .toMatchObject({
              code:
                "FACE_IDENTITY_GATE_INVALID_RESPONSE",
            })
        }
      },
    )

    it.each([
      "testStatus",
      "splitIsolationStatus",
    ] as const)(
      "rejects a PASS response when %s is not accepted",
      async (statusField) => {
        process.env
          .MIRAVA_FACE_IDENTITY_GATE_URL =
          "http://127.0.0.1:9000"
        process.env
          .MIRAVA_FACE_IDENTITY_GATE_TOKEN =
          "private-token"
        const response =
          validGateResponse()
        response.evaluator[statusField] =
          "FAIL"

        await expect(
          evaluateMiravaFaceIdentity({
            candidate: image,
            references: [
              image,
              image,
              image,
            ],
            identityManifestVersion:
              "manifest-7",
            requestId:
              "request-1",
            fetchImpl:
              async () =>
                new Response(
                  JSON.stringify(
                    response,
                  ),
                  { status: 200 },
                ),
          }),
        ).rejects.toMatchObject({
          code:
            "FACE_IDENTITY_GATE_INVALID_RESPONSE",
        })
      },
    )

    it(
      "rejects a scorable response without versioned geometry evidence",
      async () => {
        process.env
          .MIRAVA_FACE_IDENTITY_GATE_URL =
          "http://127.0.0.1:9000"
        process.env
          .MIRAVA_FACE_IDENTITY_GATE_TOKEN =
          "private-token"
        const response =
          validGateResponse()
        response.candidateFace
          .poseEstimatorVersion =
          null as unknown as string

        await expect(
          evaluateMiravaFaceIdentity({
            candidate: image,
            references: [
              image,
              image,
              image,
            ],
            identityManifestVersion:
              "manifest-7",
            requestId:
              "request-1",
            fetchImpl:
              async () =>
                new Response(
                  JSON.stringify(
                    response,
                  ),
                  { status: 200 },
                ),
          }),
        ).rejects.toMatchObject({
          code:
            "FACE_IDENTITY_GATE_INVALID_RESPONSE",
        })
      },
    )

    it(
      "rejects measured cohorts that contradict the raw geometry",
      async () => {
        process.env
          .MIRAVA_FACE_IDENTITY_GATE_URL =
          "http://127.0.0.1:9000"
        process.env
          .MIRAVA_FACE_IDENTITY_GATE_TOKEN =
          "private-token"
        const response =
          validGateResponse()
        response.candidateFace
          .measuredCohorts.yaw =
          "profile-right"

        await expect(
          evaluateMiravaFaceIdentity({
            candidate: image,
            references: [
              image,
              image,
              image,
            ],
            identityManifestVersion:
              "manifest-7",
            requestId:
              "request-1",
            fetchImpl:
              async () =>
                new Response(
                  JSON.stringify(
                    response,
                  ),
                  { status: 200 },
                ),
          }),
        ).rejects.toMatchObject({
          code:
            "FACE_IDENTITY_GATE_INVALID_RESPONSE",
        })
      },
    )
  },
)
