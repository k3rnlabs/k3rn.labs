import { describe, expect, it } from "vitest"

import { buildMiravaSessionShotGenerationContext } from "./shot-generation-context"

describe("buildMiravaSessionShotGenerationContext", () => {
  it("uses the canonical preset and shot-plan sources", () => {
    const context = buildMiravaSessionShotGenerationContext({
      config: { version: 1, mode: "CUSTOM_SHOOT", setPresetId: "white-cyclorama-v1", lightingPresetId: "direct-flash-v1", shotCount: 6, lookMode: "CUSTOM" },
      shotIndex: 3,
      lookItems: [{ category: "DRESS", label: "Robe noire", brand: "Atelier", description: "satin", viewKeys: ["FRONT", "BACK"] }],
    })

    expect(context.shot.shotIntent).toBe("CLOSE_PORTRAIT")
    expect(context.masterPrompt).toContain("continuous pure white seamless cyclorama")
    expect(context.masterPrompt).toContain("direct frontal flash")
    expect(context.masterPrompt).toContain("Robe noire")
    expect(context.negativePrompt).toContain("no wardrobe change")
  })
})
