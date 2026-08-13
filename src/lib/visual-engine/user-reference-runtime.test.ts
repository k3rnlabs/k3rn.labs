import {
  readFileSync,
} from "node:fs"

import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_USER_REFERENCE_SUMMARY_MAX_CHARS,
  resolveMiravaUserReferenceRuntimePrompt,
} from "@/lib/mirava/user-reference-runtime"

import {
  applyMiravaMakeupDirection,
} from "@/lib/mirava/makeup"

import {
  buildMiravaKieReferencePrompt,
  fitMiravaKiePromptForModel,
} from "./kie-provider"


const BEAUTY_REFERENCE_SUMMARY =
  "Luxury beauty-editorial close-up against a seamless black background, composed as a tight 4:5 head-and-shoulders portrait. The consenting adult model wears a matte black, softly draped high-neck garment and one prominent sculptural polished-gold earring on the visible ear. Her head is held upright with a slight turn toward frame left, chin subtly elevated, shoulders nearly square, and gaze directed calmly into the camera. Slicked-back wet-look hair, restrained warm neutral makeup, realistic luminous skin texture, and hard warm three-quarter frontal light create sculptural facial definition, dense shadows, crisp metallic highlights, deep blacks, and a refined high-contrast editorial finish."


function finalPrompt(
  summary: string,
): {
  runtime: string
  wrapped: string
  fitted: string
} {
  const runtime =
    resolveMiravaUserReferenceRuntimePrompt(
      summary,
    )!

  const withMakeup =
    applyMiravaMakeupDirection(
      runtime,
      {
        makeupMode:
          "none",
      },
    )

  const wrapped =
    buildMiravaKieReferencePrompt({
      prompt:
        withMakeup,
      roles: [
        "ART_DIRECTION",
        "IDENTITY",
        "IDENTITY",
        "IDENTITY",
      ],
      bodyIdentity:
        "",
    })

  const fitted =
    fitMiravaKiePromptForModel(
      "seedream/4.5-edit",
      wrapped,
    )

  return {
    runtime,
    wrapped,
    fitted,
  }
}


describe(
  "MIRAVA user-reference compact runtime",
  () => {
    it(
      "uses the extracted summary as runtime Visual DNA",
      () => {
        const {
          runtime,
        } =
          finalPrompt(
            BEAUTY_REFERENCE_SUMMARY,
          )

        expect(
          runtime.length,
        ).toBeLessThan(
          800,
        )

        const lower =
          runtime.toLowerCase()

        for (
          const signal of [
            "seamless black background",
            "tight 4:5",
            "high-neck garment",
            "polished-gold earring",
            "slicked-back wet-look hair",
            "hard warm",
            "dense shadows",
            "deep blacks",
            "high-contrast editorial finish",
          ]
        ) {
          expect(
            lower,
          ).toContain(
            signal.toLowerCase(),
          )
        }
      },
    )


    it(
      "reaches Seedream intact without compaction",
      () => {
        const {
          runtime,
          wrapped,
          fitted,
        } =
          finalPrompt(
            BEAUTY_REFERENCE_SUMMARY,
          )

        console.info(
          `[mirava-user-reference-budget] runtime=${runtime.length} wrapped=${wrapped.length} fitted=${fitted.length}`,
        )

        expect(
          wrapped.length,
        ).toBeLessThanOrEqual(
          3000,
        )

        expect(
          fitted,
        ).toBe(
          wrapped,
        )

        const lower =
          fitted.toLowerCase()

        for (
          const signal of [
            "art direction only",
            "face identity authority",
            "wall/room/background",
            "sole authority for all non-identity dimensions",
            "seamless black background",
            "polished-gold earring",
            "hard warm",
            "dense shadows",
            "crisp metallic highlights",
            "deep blacks",
            "high-contrast editorial finish",
          ]
        ) {
          expect(
            lower,
          ).toContain(
            signal.toLowerCase(),
          )
        }
      },
    )


    it(
      "keeps maximum summary length under Seedream budget",
      () => {
        const longSummary =
          (
            "Black studio background. " +
            "Hard warm sculptural light. " +
            "Luxury gold accessories. " +
            "Deep shadows and high contrast. "
          ).repeat(
            20,
          )

        const runtime =
          resolveMiravaUserReferenceRuntimePrompt(
            longSummary,
          )!

        const {
          wrapped,
          fitted,
        } =
          finalPrompt(
            longSummary,
          )

        expect(
          runtime.length,
        ).toBeLessThanOrEqual(
          MIRAVA_USER_REFERENCE_SUMMARY_MAX_CHARS +
            60,
        )

        expect(
          wrapped.length,
        ).toBeLessThanOrEqual(
          3000,
        )

        expect(
          fitted,
        ).toBe(
          wrapped,
        )
      },
    )


    it(
      "keeps full prompt safety evaluation before compact runtime selection",
      () => {
        const core =
          readFileSync(
            "src/lib/visual-engine/core.ts",
            "utf8",
          )

        const risk =
          core.indexOf(
            "const campaignRisk",
          )

        const compact =
          core.indexOf(
            "const userReferenceRuntimeBase",
          )

        expect(
          risk,
        ).toBeGreaterThan(
          -1,
        )

        expect(
          compact,
        ).toBeGreaterThan(
          risk,
        )

        const section =
          core.slice(
            compact,
            compact + 2000,
          )

        expect(
          section,
        ).toContain(
          "!campaignRisk",
        )

        expect(
          section,
        ).toContain(
          "requiresCampaignSafeTransfer",
        )

        expect(
          section,
        ).toContain(
          "resolvedPrimaryPrompt",
        )
      },
    )


    it(
      "uses compact prompt for exactly two primary KIE calls",
      () => {
        const core =
          readFileSync(
            "src/lib/visual-engine/core.ts",
            "utf8",
          )

        const matches =
          core.match(
            /resolvedKiePrimaryPrompt,/g,
          ) ?? []

        expect(
          matches,
        ).toHaveLength(
          2,
        )
      },
    )


    it(
      "does not activate compact branch for generic ART_DIRECTION prompts",
      () => {
        const generic =
          buildMiravaKieReferencePrompt({
            prompt:
              "Create approved fashion frame.",
            roles: [
              "ART_DIRECTION",
              "IDENTITY",
              "IDENTITY",
              "IDENTITY",
            ],
          })

        expect(
          generic,
        ).toContain(
          "REFERENCE ROLES — Follow these roles exactly."
        )

        expect(
          generic,
        ).not.toContain(
          "sole authority for all non-identity dimensions"
        )
      },
    )
  },
)
