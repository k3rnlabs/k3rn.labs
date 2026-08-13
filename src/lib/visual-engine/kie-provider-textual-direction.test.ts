import {
  describe,
  expect,
  it,
} from "vitest"

import {
  buildMiravaKieReferencePrompt,
  fitMiravaKiePromptForModel,
} from "./kie-provider"

import {
  resolveMiravaOfficialUniverseRuntimePrompt,
} from "@/lib/mirava/official-universe-runtime"


describe(
  "MIRAVA KIE textual visual-direction authority",
  () => {
    it(
      "does not invent an ART_DIRECTION authority when only FACE_ID images exist",
      () => {
        const visual =
          resolveMiravaOfficialUniverseRuntimePrompt({
            universeId:
              "beauty-close-up",
            creativeOptions: {
              makeupMode:
                "none",
            },
          })!

        const wrapped =
          buildMiravaKieReferencePrompt({
            prompt:
              visual,
            roles: [
              "IDENTITY",
              "IDENTITY",
              "IDENTITY",
            ],
            bodyIdentity:
              "",
          })

        expect(
          wrapped,
        ).toContain(
          "FIDELITY PRIORITY — TEXTUAL VISUAL DIRECTION",
        )

        expect(
          wrapped,
        ).toContain(
          "The textual VISUAL DIRECTION below controls",
        )

        expect(
          wrapped,
        ).not.toContain(
          "Transfer ART_DIRECTION",
        )

        expect(
          wrapped,
        ).not.toContain(
          "first preserve ART_DIRECTION",
        )
      },
    )


    it(
      "forbids FACE_ID from donating expression, hairstyle or makeup",
      () => {
        const wrapped =
          buildMiravaKieReferencePrompt({
            prompt:
              "VISUAL DIRECTION TEST",
            roles: [
              "IDENTITY",
              "IDENTITY",
              "IDENTITY",
            ],
          })

        for (
          const signal of [
            "expression",
            "gaze",
            "eyelid state",
            "mouth pose",
            "hairstyle arrangement",
            "makeup",
          ]
        ) {
          expect(
            wrapped,
          ).toContain(
            signal,
          )
        }
      },
    )


    it(
      "keeps the image ART_DIRECTION contract when an actual art image exists",
      () => {
        const wrapped =
          buildMiravaKieReferencePrompt({
            prompt:
              "Create approved frame.",
            roles: [
              "ART_DIRECTION",
              "IDENTITY",
              "IDENTITY",
              "IDENTITY",
            ],
          })

        expect(
          wrapped,
        ).toContain(
          "ART DIRECTION ONLY",
        )

        expect(
          wrapped,
        ).toContain(
          "Transfer ART_DIRECTION",
        )

        expect(
          wrapped,
        ).toContain(
          "FIDELITY PRIORITY — IMAGE ART DIRECTION",
        )
      },
    )


    it(
      "keeps all critical Beauty text signals after actual Seedream compaction",
      () => {
        const visual =
          resolveMiravaOfficialUniverseRuntimePrompt({
            universeId:
              "beauty-close-up",
            creativeOptions: {
              makeupMode:
                "none",
            },
          })!

        const wrapped =
          buildMiravaKieReferencePrompt({
            prompt:
              visual,
            roles: [
              "IDENTITY",
              "IDENTITY",
              "IDENTITY",
            ],
            bodyIdentity:
              "",
          })

        /*
         * The complete certified textual Visual DNA must
         * fit before Seedream compaction is needed.
         */
        expect(
          wrapped.length,
        ).toBeLessThanOrEqual(
          3000,
        )

        const fitted =
          fitMiravaKiePromptForModel(
            "seedream/4.5-edit",
            wrapped,
          )

        expect(
          fitted.length,
        ).toBeLessThanOrEqual(
          3000,
        )

        expect(
          fitted,
        ).toBe(
          wrapped,
        )

        for (
          const signal of [
            "MAKEUP — NONE",
            "near-black",
            "slicked-back",
            "yellow-gold",
            "EARRING",
            "exposed ear",
            "high-neck garment",
            "not macro",
            "full EARRING",
            "precious-metal",
            "painted/plastic/costume",
            "protected highlights",
            "precise gold reflections",
            "no blunt flash/rim",
            "no blown highlights",
            "camera-left",
            "no smile",
            "NO lip gloss",
            "NO blush",
            "85–105",
            "FRAMING —",
            "BACKGROUND —",
            "POSE —",
            "EXPRESSION —",
            "HAIR —",
            "STYLING —",
            "LIGHTING —",
            "FINISH —",
            "PRECEDENCE —",
          ]
        ) {
          expect(
            fitted,
          ).toContain(
            signal,
          )
        }

        expect(
          fitted,
        ).not.toContain(
          "Transfer ART_DIRECTION",
        )

        expect(
          fitted,
        ).not.toContain(
          "first preserve ART_DIRECTION",
        )
      },
    )
  },
)
