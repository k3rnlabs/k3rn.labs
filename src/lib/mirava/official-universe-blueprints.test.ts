import {
  describe,
  expect,
  it,
} from "vitest"
import {
  MIRAVA_STUDIO_PRESETS,
} from "@/lib/mirava/brand"
import {
  MIRAVA_OFFICIAL_UNIVERSE_BLUEPRINTS,
  buildMiravaOfficialUniversePrimaryPrompt,
  getMiravaOfficialUniverseBlueprint,
  renderMiravaOfficialUniverseMasterPrompt,
} from "./official-universe-blueprints"
import {
  readFileSync,
} from "node:fs"

describe(
  "MIRAVA official universe blueprints",
  () => {
    it(
      "publishes one canonical blueprint for every official preset",
      () => {
        expect(
          Object.keys(
            MIRAVA_OFFICIAL_UNIVERSE_BLUEPRINTS,
          ),
        ).toHaveLength(
          MIRAVA_STUDIO_PRESETS.length,
        )

        for (
          const preset of
          MIRAVA_STUDIO_PRESETS
        ) {
          const blueprint =
            getMiravaOfficialUniverseBlueprint(
              preset.id,
            )

          expect(blueprint).toBeDefined()
          expect(blueprint?.status).toBe(
            "published",
          )
          expect(
            blueprint?.version,
          ).toMatch(
            /^\d+\.\d+\.\d+$/,
          )
          expect(
            blueprint?.allowedVariations.length,
          ).toBeGreaterThanOrEqual(6)
        }
      },
    )

    it(
      "renders complete generation-ready master prompts",
      () => {
        for (
          const blueprint of
          Object.values(
            MIRAVA_OFFICIAL_UNIVERSE_BLUEPRINTS,
          )
        ) {
          const prompt =
            renderMiravaOfficialUniverseMasterPrompt(
              blueprint,
            )

          expect(prompt.length).toBeGreaterThan(
            1_500,
          )
          expect(prompt).toContain(
            "IDENTITY CONTRACT",
          )
          expect(prompt).toContain(
            "ENVIRONMENT CONTRACT",
          )
          expect(prompt).toContain(
            "WARDROBE CONTRACT",
          )
          expect(prompt).toContain(
            "POSE CONTRACT",
          )
          expect(prompt).toContain(
            "LIGHTING CONTRACT",
          )
          expect(prompt).toContain(
            "CAMERA AND COMPOSITION CONTRACT",
          )
          expect(prompt).toContain(
            "NEGATIVE GUARDRAILS",
          )
        }
      },
    )

    it(
      "adds approved session choices to an official first frame",
      () => {
        const prompt =
          buildMiravaOfficialUniversePrimaryPrompt({
            masterPrompt:
              "CANONICAL MASTER PROMPT",
            creativeOptions: {
              location:
                "Private pool terrace",
              energy:
                "Contemplative",
              seriesSize:
                1,
              note:
                "A quiet seated portrait",
            },
          })

        expect(prompt).toContain(
          "CANONICAL MASTER PROMPT",
        )
        expect(prompt).toContain(
          "Location: Private pool terrace",
        )
        expect(prompt).toContain(
          "Energy and attitude: Contemplative",
        )
        expect(prompt).toContain(
          "Client intention: A quiet seated portrait",
        )
        expect(prompt).toContain(
          "OFFICIAL UNIVERSE PRECEDENCE",
        )
      },
    )

    it(
      "keeps custom-reference parity separate from official universes",
      () => {
        const core =
          readFileSync(
            "src/lib/visual-engine/core.ts",
            "utf-8",
          )

        expect(core).not.toContain(
          "PRESET_DIRECTIONS",
        )
        expect(core).toContain(
          "getMiravaOfficialUniverseBlueprint",
        )
        expect(core).toContain(
          "buildMiravaResolvedPrimaryGenerationPrompt",
        )
        expect(core).toContain(
          'return creation.masterPrompt?.trim() ?? ""',
        )
      },
    )
  },
)
