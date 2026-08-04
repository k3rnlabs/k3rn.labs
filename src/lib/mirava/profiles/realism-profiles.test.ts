import { describe, expect, it } from "vitest"
import {
  buildAdaptiveRealismLayer,
  buildAdaptiveRealismNegativeGuardrails,
} from "./realism-profiles"
import type { SceneContextClassification } from "../schemas/scene-context.schema"

function context(
  overrides: Partial<SceneContextClassification> = {},
): SceneContextClassification {
  return {
    sceneProfile: "standard_fashion",
    photographicGenre: "commercial_campaign",
    garmentContext: "standard_clothing",
    coverageInstruction: "not_applicable",
    referenceCharacter: "fidelity_sensitive",
    wordingProfile: "standard",
    confidence: 1,
    requiresHumanReview: false,
    ...overrides,
  }
}

describe("MIRAVA adaptive photographic realism", () => {
  it("adds identity-safe realism without inventing physical traits", () => {
    const positive = buildAdaptiveRealismLayer(context())
    const negative =
      buildAdaptiveRealismNegativeGuardrails(context())

    expect(positive).toContain(
      "ADAPTIVE PHOTOGRAPHIC REALISM",
    )
    expect(positive).toContain(
      "supported by the validated identity photographs",
    )
    expect(negative).toContain("invented freckles")
    expect(negative).toContain("invented tattoos")
    expect(negative).toContain("waxy skin")
  })

  it("uses authentic smartphone behavior for phone photography", () => {
    const positive = buildAdaptiveRealismLayer(
      context({
        sceneProfile: "lifestyle",
        photographicGenre: "phone_photo",
      }),
    )

    expect(positive).toContain(
      "AUTHENTIC SMARTPHONE CAMERA BEHAVIOR",
    )
    expect(positive).toContain(
      "natural wide-angle perspective falloff",
    )
  })

  it("uses restrained facial microdetail for beauty close-ups", () => {
    const positive = buildAdaptiveRealismLayer(
      context({
        sceneProfile: "beauty_closeup",
        photographicGenre: "beauty_campaign",
      }),
    )

    expect(positive).toContain(
      "visible but restrained pore structure",
    )
    expect(positive).toContain(
      "real eye moisture and catchlights",
    )
    expect(positive).toContain("natural lip texture")
  })

  it("preserves direct-flash behavior for nightlife scenes", () => {
    const positive = buildAdaptiveRealismLayer(
      context({
        sceneProfile: "nightlife_direct_flash",
        photographicGenre: "nightlife_flash",
      }),
    )

    expect(positive).toContain(
      "DIRECT-FLASH CAMERA REALISM",
    )
    expect(positive).toContain(
      "dark ambient background exposure",
    )
  })
})
