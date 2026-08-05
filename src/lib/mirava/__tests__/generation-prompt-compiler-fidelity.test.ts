import {
  describe,
  expect,
  it,
} from "vitest"
import {
  compileGenerationPrompt,
} from "../pipeline/compile-generation-prompt"
import type {
  VisualDirectionBlueprint,
} from "../schemas/visual-direction-blueprint.schema"
import type {
  SceneContextClassification,
} from "../schemas/scene-context.schema"

const blueprint: VisualDirectionBlueprint = {
  id: "bp_fidelity",
  status: "published",
  transferMode: "FIDELITY",
  creativeDirectionSummary:
    "Contemporary minimalist stairwell editorial.",
  baseGenerationPrompt: [
    "Create a vertical portrait inside a contemporary high-end minimalist stairwell.",
    "Use smooth cool-white walls, black monolithic steps, a transparent glass balustrade and cylindrical recessed spotlights.",
    "The torso leans diagonally toward frame left.",
    "The camera-left hand contacts the lower-left railing.",
    "The camera-right arm extends laterally outside the right frame edge.",
    "The head tilts backward with fully closed eyes and restrained kiss-shaped lips.",
    "Hair forms large polished waves around both sides of the face and falls forward over both shoulders.",
    "Use a sculptural black bodysuit with opaque torso panels, sheer sleeves, angular waist openings and narrow side straps.",
    "Use a moderate low-angle perspective while keeping face and upper torso visually dominant.",
  ].join(" "),
  negativeGuardrails:
    "traditional railing, open eyes, generic bodysuit",
  sceneProfile:
    "standard_fashion",
  photographicGenre:
    "fashion_editorial",
  extractionMetadata: {
    extractorVersion:
      "2.4.0",
    classifierVersion:
      "1.0.0",
    model:
      "gpt-4o",
    createdAt:
      new Date().toISOString(),
    referenceAssetId:
      "reference_1",
  },
  qualityFlags: {
    lightingContractPresent:
      true,
    cameraContractPresent:
      true,
    poseContractPresent:
      true,
    wardrobeContractPresent:
      true,
    identityLanguageDetected:
      false,
    requiresHumanReview:
      false,
  },
}

const sceneContext: SceneContextClassification = {
  sceneProfile:
    "standard_fashion" as const,
  photographicGenre:
    "fashion_editorial",
  garmentContext:
    "standard_clothing",
  coverageInstruction:
    "preserve_exact_coverage" as const,
  referenceCharacter:
    "fidelity_sensitive" as const,
  wordingProfile:
    "commercial_fashion_neutral" as const,
  confidence:
    0.98,
  requiresHumanReview:
    false,
}

describe(
  "MIRAVA downstream reference fidelity compiler",
  () => {
    it(
      "locks architecture, pose, expression, hair, wardrobe and perspective",
      () => {
        const compiled =
          compileGenerationPrompt({
            blueprint,
            sceneContext,
            generation: {
              frameIndex: 0,
              imageCount: 1,
            },
          })

        expect(
          compiled.metadata.compilerVersion,
        ).toBe("1.4.0")

        expect(
          compiled.positivePrompt,
        ).toContain(
          "REFERENCE FIDELITY LOCK",
        )

        expect(
          compiled.positivePrompt,
        ).toContain(
          "glass balustrades must not become traditional railings",
        )

        expect(
          compiled.positivePrompt,
        ).toContain(
          "pose skeleton",
        )

        expect(
          compiled.positivePrompt,
        ).toContain(
          "expression, gaze, hairstyle arrangement, wardrobe topology",
        )

        expect(
          compiled.positivePrompt,
        ).toContain(
          "FINAL REFERENCE FIDELITY CHECK",
        )

        expect(
          compiled.negativeGuardrails,
        ).toContain(
          "dated interior replacing contemporary architecture",
        )

        expect(
          compiled.negativeGuardrails,
        ).toContain(
          "open eyes replacing closed eyes",
        )

        expect(
          compiled.negativeGuardrails,
        ).toContain(
          "forward waves moved behind the shoulders",
        )

        expect(
          compiled.negativeGuardrails,
        ).toContain(
          "changed cutout geometry",
        )

        expect(
          compiled.negativeGuardrails,
        ).toContain(
          "extreme low angle replacing a moderate low angle",
        )
      },
    )

    it(
      "does not inject a wide or medium series crop into a single image",
      () => {
        const compiled =
          compileGenerationPrompt({
            blueprint,
            sceneContext,
            generation: {
              frameIndex: 0,
              imageCount: 1,
            },
          })

        expect(
          compiled.positivePrompt,
        ).not.toContain(
          "Wide/Medium environmental shot",
        )

        expect(
          compiled.positivePrompt,
        ).not.toContain(
          "SERIES VARIATION 1",
        )
      },
    )

    it(
      "makes the first multi-image frame the fidelity anchor",
      () => {
        const compiled =
          compileGenerationPrompt({
            blueprint,
            sceneContext,
            generation: {
              frameIndex: 0,
              imageCount: 3,
            },
          })

        expect(
          compiled.positivePrompt,
        ).toContain(
          "REFERENCE HERO FRAME",
        )

        expect(
          compiled.positivePrompt,
        ).toContain(
          "This first image is the fidelity anchor",
        )
      },
    )

    it(
      "keeps later series variation subordinate to the reference",
      () => {
        const compiled =
          compileGenerationPrompt({
            blueprint,
            sceneContext,
            generation: {
              frameIndex: 1,
              imageCount: 3,
            },
          })

        expect(
          compiled.positivePrompt,
        ).toContain(
          "Variation is subordinate to the approved art direction",
        )

        expect(
          compiled.positivePrompt,
        ).toContain(
          "Preserve architectural era and materials",
        )
      },
    )
  },
)
