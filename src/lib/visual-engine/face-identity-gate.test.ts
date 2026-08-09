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
              JSON.stringify({
                schemaVersion:
                  "mirava-face-identity-gate/v2",
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
                    "sha256:test",
                  preprocessingVersion:
                    "mirava-align-v1",
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
                },
              }),
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
                decision:
                  "PASS",
                embedding:
                  [0.1, 0.2],
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
  },
)
