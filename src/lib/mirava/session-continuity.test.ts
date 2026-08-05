import {
  describe,
  expect,
  it,
} from "vitest"

import {
  buildMiravaSessionContinuationPrompt,
  miravaShotIntentSchema,
} from "./session-continuity"

describe(
  "MIRAVA session continuity",
  () => {
    it(
      "accepts the four bounded continuation intents",
      () => {
        expect(
          miravaShotIntentSchema.options,
        ).toEqual([
          "pose",
          "framing",
          "sub_location",
          "candid",
        ])
      },
    )

    it(
      "locks wardrobe, jewelry, environment and lighting",
      () => {
        const prompt =
          buildMiravaSessionContinuationPrompt({
            masterPrompt:
              "Approved premium editorial.",
            negativePrompt:
              "watermarks",
            intent:
              "pose",
            shotIndex: 1,
            hasContinuityImage:
              true,
          })

        expect(prompt.positivePrompt).toContain(
          "exact same real photographic session",
        )
        expect(prompt.positivePrompt).toContain(
          "same wardrobe construction",
        )
        expect(prompt.positivePrompt).toContain(
          "same jewelry",
        )
        expect(prompt.positivePrompt).toContain(
          "same architectural environment",
        )
        expect(prompt.positivePrompt).toContain(
          "same time of day",
        )
      },
    )

    it(
      "keeps lingerie-style continuations commercial and coverage-stable",
      () => {
        const prompt =
          buildMiravaSessionContinuationPrompt({
            masterPrompt:
              "Premium lingerie campaign.",
            intent:
              "candid",
            shotIndex: 2,
            hasContinuityImage:
              true,
          })

        expect(prompt.positivePrompt).toContain(
          "Keep the exact approved garment coverage",
        )
        expect(prompt.positivePrompt).toContain(
          "Do not undress the subject",
        )
        expect(prompt.positivePrompt).toContain(
          "premium commercial fashion, beauty or lingerie campaign",
        )
      },
    )

    it(
      "supports a text-only safety fallback",
      () => {
        const prompt =
          buildMiravaSessionContinuationPrompt({
            masterPrompt:
              "Approved editorial.",
            intent:
              "framing",
            shotIndex: 3,
            hasContinuityImage:
              false,
          })

        expect(prompt.positivePrompt).toContain(
          "TEXT-ONLY CONTINUITY FALLBACK",
        )
        expect(prompt.positivePrompt).not.toContain(
          "first attached image is the previous approved result",
        )
      },
    )
  },
)
