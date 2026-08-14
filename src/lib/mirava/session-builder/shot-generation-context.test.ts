import { describe, expect, it } from "vitest"

import { buildMiravaSessionShotGenerationContext } from "./shot-generation-context"

describe("buildMiravaSessionShotGenerationContext", () => {
  it("uses the canonical preset and shot-plan sources", () => {
    const context = buildMiravaSessionShotGenerationContext({
      config: { version: 1, mode: "CUSTOM_SHOOT", setPresetId: "white-cyclorama-v1", lightingPresetId: "direct-flash-v1", shotCount: 6, lookMode: "CUSTOM", framing: "FREE", pose: "FREE", expression: "FREE", gaze: "FREE", makeup: "NATURAL", skinFinish: "NATURAL", hair: "PROFILE", userInstruction: "" },
      shotIndex: 3,
      lookItems: [{ category: "DRESS", label: "Robe noire", brand: "Atelier", description: "satin", viewKeys: ["FRONT", "BACK"] }],
    })

    expect(context.shot.shotIntent).toBe("CLOSE_PORTRAIT")
    expect(context.masterPrompt).toContain("continuous pure white seamless cyclorama")
    expect(context.masterPrompt).toContain("direct frontal flash")
    expect(context.masterPrompt).toContain("Robe noire")
    expect(context.negativePrompt).toContain("no wardrobe change")
  })

  it("keeps a reference look out of the identity authority", () => {
    const context = buildMiravaSessionShotGenerationContext({
      config: { version: 1, mode: "CUSTOM_SHOOT", setPresetId: "black-cyclorama-v1", lightingPresetId: "dramatic-v1", shotCount: 6, lookMode: "REFERENCE", framing: "FREE", pose: "FREE", expression: "FREE", gaze: "FREE", makeup: "NATURAL", skinFinish: "NATURAL", hair: "PROFILE", userInstruction: "" },
      shotIndex: 0,
      lookItems: [],
      artisticReferenceDirection: "Reference wardrobe: tailored ivory suit; photographic character: polished editorial flash.",
    })
    expect(context.masterPrompt).toContain("tailored ivory suit")
    expect(context.masterPrompt).toContain("never an identity authority")
    expect(context.masterPrompt).toContain("Do not transfer its face")
  })
  it(
    "propagates structured Builder V2 controls into the provider prompt",
    () => {
      const context =
        buildMiravaSessionShotGenerationContext({
          config: {
            version: 1,
            mode:
              "CUSTOM_SHOOT",
            setPresetId:
              "white-cyclorama-v1",
            lightingPresetId:
              "clean-v1",
            shotCount: 6,
            lookMode:
              "CUSTOM",
            framing:
              "FULL_BODY",
            pose:
              "STANDING",
            expression:
              "SMILE",
            gaze:
              "CAMERA",
            makeup:
              "NONE",
            skinFinish:
              "NATURAL",
            hair:
              "LOOSE",
            userInstruction:
              "Ambiance très minimaliste.",
          },
          shotIndex: 3,
          lookItems: [],
        })

      expect(
        context.masterPrompt,
      ).toContain(
        "full-body framing with the entire body and footwear visible",
      )

      expect(
        context.masterPrompt,
      ).toContain(
        "standing pose with natural believable weight distribution",
      )

      expect(
        context.masterPrompt,
      ).toContain(
        "natural visible smile",
      )

      expect(
        context.masterPrompt,
      ).toContain(
        "gaze directed toward the camera",
      )

      expect(
        context.masterPrompt,
      ).toContain(
        "no makeup and no artificial cosmetic enhancement",
      )

      expect(
        context.masterPrompt,
      ).toContain(
        "preserve natural skin texture, pores",
      )

      expect(
        context.masterPrompt,
      ).toContain(
        "wear the hair loose",
      )

      expect(
        context.masterPrompt,
      ).toContain(
        "Ambiance très minimaliste.",
      )

      expect(
        context.masterPrompt,
      ).toContain(
        "This detail is subordinate to identity, safety and all structured Builder controls.",
      )

      expect(
        context.negativePrompt,
      ).toContain(
        "no hairline change",
      )

      expect(
        context.negativePrompt,
      ).toContain(
        "no plastic skin",
      )
    },
  )

  it(
    "keeps FREE framing and pose delegated to the shot plan",
    () => {
      const context =
        buildMiravaSessionShotGenerationContext({
          config: {
            version: 1,
            mode:
              "CUSTOM_SHOOT",
            setPresetId:
              "white-cyclorama-v1",
            lightingPresetId:
              "clean-v1",
            shotCount: 6,
            lookMode:
              "CUSTOM",
            framing:
              "FREE",
            pose:
              "FREE",
            expression:
              "FREE",
            gaze:
              "FREE",
            makeup:
              "NATURAL",
            skinFinish:
              "NATURAL",
            hair:
              "PROFILE",
            userInstruction:
              "",
          },
          shotIndex: 2,
          lookItems: [],
        })

      expect(
        context.masterPrompt,
      ).toContain(
        "full or three-quarter seated editorial composition",
      )

      expect(
        context.masterPrompt,
      ).toContain(
        "controlled seated fashion pose",
      )
    },
  )

})
