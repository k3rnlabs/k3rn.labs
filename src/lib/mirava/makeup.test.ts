import { describe, expect, it } from "vitest"

import {
  applyMiravaMakeupDirection,
  buildMiravaMakeupDirection,
  resolveMiravaMakeupConfig,
} from "@/lib/mirava/makeup"
import { miravaCreativeOptionsSchema } from "@/lib/mirava/creative-options"
import {
  MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA,
  MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
} from "@/lib/mirava/prompts/visual-direction-extractor-v2"

describe("MIRAVA makeup V1", () => {
  it("defaults legacy sessions to reference-aware makeup", () => {
    expect(resolveMiravaMakeupConfig({})).toEqual({
      mode: "auto_reference",
      intensity: "medium",
    })

    const direction = buildMiravaMakeupDirection({
      mode: "auto_reference",
      intensity: "medium",
    })

    expect(direction.positivePrompt).toContain("Use the makeup description already encoded")
    expect(direction.positivePrompt).toContain("refined camera-ready natural makeup")
  })

  it("lets an explicit no-makeup choice override the reference", () => {
    const direction = buildMiravaMakeupDirection({ mode: "none", intensity: "strong" })
    expect(direction.positivePrompt).toContain("NO MAKEUP")
    expect(direction.positivePrompt).not.toContain("INTENSITY: STRONG")
  })

  it("keeps cosmetic styling separate from identity", () => {
    const direction = buildMiravaMakeupDirection({ mode: "soft_glam", intensity: "medium" })
    expect(direction.positivePrompt).toContain("COSMETIC IDENTITY LOCK")
    expect(direction.positivePrompt).toContain("Preserve real skin micro-texture")
    expect(direction.negativeGuardrails).toContain("makeup changing facial identity")
  })

  it("preserves and extends an existing Avoid section", () => {
    const output = applyMiravaMakeupDirection(
      "Approved editorial direction.\n\nAvoid: identity drift, malformed hands",
      { makeupMode: "glam", makeupIntensity: "strong" },
    )
    expect(output).toContain("GLAM MAKEUP")
    expect(output).toContain("identity drift, malformed hands")
    expect(output).toContain("plastic skin")
    expect(output.match(/\n\nAvoid:/g)).toHaveLength(1)
  })

  it("validates makeup controls through creativeOptions", () => {
    expect(miravaCreativeOptionsSchema.safeParse({
      makeupMode: "editorial",
      makeupIntensity: "strong",
    }).success).toBe(true)
    expect(miravaCreativeOptionsSchema.safeParse({ makeupMode: "random" }).success).toBe(false)
  })

  it("forces the extractor to encode cosmetic details", () => {
    expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA.version).toBe("2.6.0")
    expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT).toContain("MAKEUP TRANSFER CONTRACT")
    expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT).toContain("complexion finish")
    expect(MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT).toContain("REFERENCE MAKEUP: NONE OR NOT DISCERNIBLE")
  })
})
