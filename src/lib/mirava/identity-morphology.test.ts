import {
  describe,
  expect,
  it,
} from "vitest"

import {
  formatIdentityMorphologyForPrompt,
  parseIdentityMorphology,
} from "./identity-morphology"

describe(
  "MIRAVA intrinsic identity morphology",
  () => {
    it(
      "keeps only supported intrinsic observations",
      () => {
        const parsed =
          parseIdentityMorphology({
            version:
              1,
            shoulderWidth: {
              value:
                "broad",
              confidence:
                "high",
            },
            bustVolume: {
              value:
                "full",
              confidence:
                "medium",
            },

            // Styling must never become part
            // of the domain contract.
            clothing:
              "black bra",
            jewellery:
              "gold earrings",
          })

        expect(parsed).not.toBeNull()

        expect(
          parsed?.shoulderWidth,
        ).toEqual({
          value:
            "broad",
          confidence:
            "high",
        })

        expect(
          parsed?.bustVolume,
        ).toEqual({
          value:
            "full",
          confidence:
            "medium",
        })

        expect(
          parsed as unknown as
            Record<string, unknown>,
        ).not.toHaveProperty(
          "clothing",
        )

        expect(
          parsed as unknown as
            Record<string, unknown>,
        ).not.toHaveProperty(
          "jewellery",
        )
      },
    )

    it(
      "rejects unsupported morphology values",
      () => {
        const parsed =
          parseIdentityMorphology({
            version:
              1,
            shoulderWidth: {
              value:
                "gigantic",
              confidence:
                "high",
            },
          })

        expect(
          parsed?.shoulderWidth,
        ).toBeUndefined()
      },
    )

    it(
      "omits low-confidence body guesses from generation",
      () => {
        const prompt =
          formatIdentityMorphologyForPrompt({
            version:
              1,
            shoulderWidth: {
              value:
                "balanced",
              confidence:
                "high",
            },
            bustVolume: {
              value:
                "full",
              confidence:
                "low",
            },
          })

        expect(prompt).toContain(
          "shoulder width: balanced",
        )

        expect(prompt).not.toContain(
          "natural bust volume: full",
        )
      },
    )

    it(
      "explicitly separates intrinsic body identity from styling",
      () => {
        const prompt =
          formatIdentityMorphologyForPrompt({
            version:
              1,
            collarboneDefinition: {
              value:
                "defined",
              confidence:
                "medium",
            },
          })

        expect(prompt).toContain(
          "INTRINSIC BODY IDENTITY",
        )

        expect(prompt).toContain(
          "not her styling",
        )

        expect(prompt).toContain(
          "Never infer or preserve clothing",
        )

        expect(prompt).toContain(
          "jewellery",
        )

        expect(prompt).toContain(
          "ART DIRECTION controls wardrobe",
        )
      },
    )
  },
)


describe(
  "MIRAVA morphology extraction policy",
  () => {
    it(
      "forbids styling from entering morphology",
      async () => {
        const morphologyModule =
          await import(
            "./identity-morphology"
          )

        const prompt =
          morphologyModule
            .MIRAVA_IDENTITY_MORPHOLOGY_EXTRACTOR_PROMPT

        expect(prompt).toContain(
          "Never record:",
        )

        expect(prompt).toContain(
          "clothing",
        )

        expect(prompt).toContain(
          "lingerie",
        )

        expect(prompt).toContain(
          "removable jewellery",
        )

        expect(prompt).toContain(
          "makeup",
        )

        expect(prompt).toContain(
          "Never guess",
        )
      },
    )

    it(
      "does not infer bust morphology from garment construction",
      async () => {
        const morphologyModule =
          await import(
            "./identity-morphology"
          )

        const prompt =
          morphologyModule
            .MIRAVA_IDENTITY_MORPHOLOGY_EXTRACTOR_PROMPT

        expect(prompt).toContain(
          "Do not infer bust volume from padding or bra construction.",
        )

        expect(prompt).toContain(
          "Do not estimate cup size",
        )
      },
    )
  },
)
