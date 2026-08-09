import {
  describe,
  expect,
  it,
} from "vitest"

import {
  buildKieImageTaskInput,
  buildMiravaKieIdentityRestorationPrompt,
  buildMiravaKieReferencePrompt,
} from "./kie-provider"

const BODY_ID = [
  "INTRINSIC BODY IDENTITY — Preserve only observed natural morphology. Do not treat clothing, pose, camera perspective or styling as body identity.",
  "- neck length: balanced",
  "- shoulder width: broad",
  "- shoulder slope: balanced",
  "- collarbone definition: moderate",
  "- torso length: balanced",
  "- torso frame: balanced",
  "- natural bust volume: moderate",
  "- waist definition: defined",
  "- hip width: balanced",
].join("\n")

const LONG_ART_DIRECTION =
  Array.from(
    {
      length: 42,
    },
    (_, index) =>
      [
        `CAMERA AND COMPOSITION ${index + 1} —`,
        "Preserve the exact approved camera height, lens perspective, crop, framing, subject scale, negative space and architectural alignment.",
        "Preserve the approved pose skeleton, head orientation, gaze, expression state, garment topology, environment, lighting architecture, shadows, palette, contrast and photographic finish.",
      ].join(" "),
  ).join("\n\n")

function seedreamPrompt(
  prompt: string,
): string {
  const input =
    buildKieImageTaskInput({
      model:
        "seedream/4.5-edit",
      prompt,
      inputUrls: [
        "https://example.invalid/input.jpg",
      ],
    })

  return (
    input as {
      prompt: string
    }
  ).prompt
}

describe(
  "MIRAVA V6 Seedream prompt budget",
  () => {
    it(
      "keeps FACE_ID and the complete BODY_ID through Pass A fitting",
      () => {
        const raw =
          buildMiravaKieReferencePrompt({
            prompt:
              LONG_ART_DIRECTION,
            roles: [
              "ART_DIRECTION",
              "IDENTITY",
              "IDENTITY",
              "IDENTITY",
              "IDENTITY",
            ],
            bodyIdentity:
              BODY_ID,
          })

        /*
         * This deliberately proves that the fitter is
         * exercised rather than testing an already-short
         * prompt.
         */
        expect(
          raw.length,
        ).toBeGreaterThan(
          3000,
        )

        const fitted =
          seedreamPrompt(
            raw,
          )

        console.info(
          `[mirava-v6-pass-a-budget] raw=${raw.length} fitted=${fitted.length}`,
        )

        expect(
          fitted.length,
        ).toBeLessThanOrEqual(
          3000,
        )

        expect(fitted).toContain(
          "FACE IDENTITY AUTHORITY",
        )

        expect(fitted).toContain(
          "BODY_ID below is the sole authority",
        )

        expect(fitted).toContain(
          "INTRINSIC BODY IDENTITY",
        )

        /*
         * Checking the last structured field proves that
         * BODY_ID was not merely preserved at its start.
         */
        expect(fitted).toContain(
          "hip width: balanced",
        )

        expect(fitted).toContain(
          "VISUAL DIRECTION",
        )

        expect(fitted).not.toContain(
          "body identity and natural proportions",
        )
      },
    )

    it(
      "keeps identity, BODY_ID and scene freeze through Pass B fitting",
      () => {
        const raw =
          buildMiravaKieIdentityRestorationPrompt({
            identityCount:
              4,
            bodyIdentity:
              BODY_ID,
          })

        const fitted =
          seedreamPrompt(
            raw,
          )

        console.info(
          `[mirava-v6-pass-b-budget] raw=${raw.length} fitted=${fitted.length}`,
        )

        expect(
          fitted.length,
        ).toBeLessThanOrEqual(
          3000,
        )

        expect(fitted).toContain(
          "FACE IDENTITY AUTHORITY",
        )

        expect(fitted).toContain(
          "BODY_ID below is the sole authority",
        )

        expect(fitted).toContain(
          "INTRINSIC BODY IDENTITY",
        )

        expect(fitted).toContain(
          "hip width: balanced",
        )

        expect(fitted).toContain(
          "EDIT SCOPE",
        )

        expect(fitted).toContain(
          "BODY CONSERVATION",
        )

        expect(fitted).toContain(
          "ABSOLUTE SCENE FREEZE",
        )

        expect(fitted).toContain(
          "OUTPUT —",
        )

        expect(fitted).not.toContain(
          "supported by the IDENTITY images",
        )
      },
    )
  },
)
