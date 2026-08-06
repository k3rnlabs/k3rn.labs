import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const selector = readFileSync(join(root, "src/components/studio/mirava-makeup-selector.tsx"), "utf8")
const studio = readFileSync(join(root, "src/components/studio/visual-engine-studio.tsx"), "utf8")
const core = readFileSync(join(root, "src/lib/visual-engine/core.ts"), "utf8")

describe("MIRAVA makeup session UX", () => {
  it("offers a reference-aware recommended default and five explicit alternatives", () => {
    for (const mode of ["auto_reference", "none", "natural", "soft_glam", "glam", "editorial"]) {
      expect(selector).toContain(`"${mode}"`)
    }
    expect(selector).toContain("Recommandé")
    expect(selector).toContain("ne modifie jamais votre visage")
  })

  it("places the selector in session configuration and persists it through creativeOptions", () => {
    expect(studio).toContain('import { MiravaMakeupSelector }')
    expect(studio).toContain("<MiravaMakeupSelector")
    expect(studio).toContain("creativeOptions: options")
  })

  it("applies makeup before campaign-risk adaptation", () => {
    const application = core.indexOf("applyMiravaMakeupDirection(")
    const campaignRisk = core.indexOf("const campaignRisk", application)
    expect(application).toBeGreaterThan(-1)
    expect(campaignRisk).toBeGreaterThan(application)
  })
})
