import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_OFFICIAL_VISUAL_DIRECTION_BUDGET,
  getMiravaOfficialVisualDna,
  resolveMiravaOfficialUniverseRuntimePrompt,
} from "./official-universe-runtime"


describe(
  "MIRAVA Beauty certified semantic runtime signature",
  () => {
    it(
      "certifies the extracted Beauty artifact",
      () => {
        const artifact =
          getMiravaOfficialVisualDna(
            "beauty-close-up",
          )

        expect(
          artifact
            ?.runtimeSignatureCertification
            .status,
        ).toBe(
          "certified",
        )

        expect(
          artifact
            ?.runtimeSignatureCertification
            .signatureVersion,
        ).toBe(
          "1.2.0",
        )
      },
    )


    it(
      "keeps all distinctive Beauty DNA in the default prompt",
      () => {
        const prompt =
          resolveMiravaOfficialUniverseRuntimePrompt({
            universeId:
              "beauty-close-up",

            creativeOptions:
              {},
          })!

        expect(
          prompt.length,
        ).toBeLessThanOrEqual(
          MIRAVA_OFFICIAL_VISUAL_DIRECTION_BUDGET,
        )

        for (
          const invariant of [
            "Tight 4:5",
            "85–105",
            "near-black",
            "no smile",
            "slicked-back",
            "matte-black",
            "yellow-gold",
            "not macro",
            "full EARRING",
            "precious-metal",
            "painted/plastic/costume",
            "protected highlights",
            "precise gold reflections",
            "no blunt flash/rim",
            "no blown highlights",
            "camera-left",
            "Real pores",
          ]
        ) {
          expect(
            prompt,
          ).toContain(
            invariant,
          )
        }
      },
    )


    it(
      "keeps the complete Beauty signature with no makeup",
      () => {
        const prompt =
          resolveMiravaOfficialUniverseRuntimePrompt({
            universeId:
              "beauty-close-up",

            creativeOptions: {
              makeupMode:
                "none",
            },
          })!

        expect(
          prompt,
        ).toContain(
          "MAKEUP — NONE",
        )

        expect(
          prompt,
        ).not.toContain(
          "rose-brown",
        )

        for (
          const invariant of [
            "near-black",
            "slicked-back",
            "matte-black",
            "yellow-gold",
            "camera-left",
          ]
        ) {
          expect(
            prompt,
          ).toContain(
            invariant,
          )
        }

        expect(
          prompt.length,
        ).toBeLessThanOrEqual(
          MIRAVA_OFFICIAL_VISUAL_DIRECTION_BUDGET,
        )
      },
    )


    it(
      "scopes a location override",
      () => {
        const prompt =
          resolveMiravaOfficialUniverseRuntimePrompt({
            universeId:
              "beauty-close-up",

            creativeOptions: {
              location:
                "Minimal ivory studio",
            },
          })!

        expect(
          prompt,
        ).toContain(
          "location=Minimal ivory studio",
        )

        expect(
          prompt,
        ).not.toContain(
          "near-black",
        )

        expect(
          prompt,
        ).toContain(
          "slicked-back",
        )

        expect(
          prompt,
        ).toContain(
          "yellow-gold",
        )

        expect(
          prompt,
        ).toContain(
          "camera-left",
        )
      },
    )


    it(
      "scopes a styling override",
      () => {
        const prompt =
          resolveMiravaOfficialUniverseRuntimePrompt({
            universeId:
              "beauty-close-up",

            creativeOptions: {
              styling:
                "White minimal high-neck look without jewelry",
            },
          })!

        expect(
          prompt,
        ).toContain(
          "styling=White minimal high-neck look without jewelry",
        )

        expect(
          prompt,
        ).not.toContain(
          "matte-black",
        )

        expect(
          prompt,
        ).not.toContain(
          "yellow-gold",
        )

        expect(
          prompt,
        ).toContain(
          "slicked-back",
        )

        expect(
          prompt,
        ).toContain(
          "camera-left",
        )
      },
    )


    it(
      "scopes an energy override",
      () => {
        const prompt =
          resolveMiravaOfficialUniverseRuntimePrompt({
            universeId:
              "beauty-close-up",

            creativeOptions: {
              energy:
                "Sourire lumineux",
            },
          })!

        expect(
          prompt,
        ).toContain(
          "energy=Sourire lumineux",
        )

        expect(
          prompt,
        ).not.toContain(
          "no smile",
        )

        expect(
          prompt,
        ).toContain(
          "chin subtly raised",
        )

        expect(
          prompt,
        ).toContain(
          "near-black",
        )

        expect(
          prompt,
        ).toContain(
          "yellow-gold",
        )
      },
    )


    it(
      "preserves free text and canonical hair authority",
      () => {
        const prompt =
          resolveMiravaOfficialUniverseRuntimePrompt({
            universeId:
              "beauty-close-up",

            creativeOptions: {
              note:
                "Cheveux encore plus plaqués derrière les oreilles.",
            },
          })!

        expect(
          prompt,
        ).toContain(
          "slicked-back",
        )

        expect(
          prompt,
        ).toContain(
          "note=Cheveux encore plus plaqués derrière les oreilles",
        )

        expect(
          prompt.length,
        ).toBeLessThanOrEqual(
          MIRAVA_OFFICIAL_VISUAL_DIRECTION_BUDGET,
        )
      },
    )


    it(
      "fits a maximum-length note while retaining all default signature invariants",
      () => {
        const prompt =
          resolveMiravaOfficialUniverseRuntimePrompt({
            universeId:
              "beauty-close-up",

            creativeOptions: {
              note:
                "Y".repeat(
                  180,
                ),
            },
          })!

        expect(
          prompt.length,
        ).toBeLessThanOrEqual(
          MIRAVA_OFFICIAL_VISUAL_DIRECTION_BUDGET,
        )

        expect(
          prompt,
        ).toContain(
          "note=",
        )

        for (
          const invariant of [
            "near-black",
            "slicked-back",
            "matte-black",
            "yellow-gold",
            "camera-left",
          ]
        ) {
          expect(
            prompt,
          ).toContain(
            invariant,
          )
        }
      },
    )


    it(
      "fits maximum creative options without dropping active fields",
      () => {
        const long =
          "X".repeat(
            80,
          )

        const prompt =
          resolveMiravaOfficialUniverseRuntimePrompt({
            universeId:
              "beauty-close-up",

            creativeOptions: {
              location:
                long,

              styling:
                long,

              energy:
                long,

              framing:
                long,

              photoStyle:
                long,

              beauty:
                long,

              audacity:
                long,

              note:
                "Y".repeat(
                  180,
                ),

              makeupMode:
                "editorial",

              makeupIntensity:
                "strong",
            },
          })!

        expect(
          prompt.length,
        ).toBeLessThanOrEqual(
          MIRAVA_OFFICIAL_VISUAL_DIRECTION_BUDGET,
        )

        for (
          const key of [
            "location=",
            "styling=",
            "energy=",
            "framing=",
            "photo=",
            "beauty=",
            "audacity=",
            "note=",
          ]
        ) {
          expect(
            prompt,
          ).toContain(
            key,
          )
        }

        expect(
          prompt,
        ).toContain(
          "CAMERA —",
        )

        expect(
          prompt,
        ).toContain(
          "POSE —",
        )

        expect(
          prompt,
        ).toContain(
          "HAIR —",
        )

        expect(
          prompt,
        ).toContain(
          "LIGHTING —",
        )

        expect(
          prompt,
        ).toContain(
          "MAKEUP — EDITORIAL STRONG",
        )

        expect(
          prompt,
        ).toContain(
          "IDENTITY —",
        )

        expect(
          prompt,
        ).toContain(
          "PRECEDENCE —",
        )
      },
    )
  },
)
