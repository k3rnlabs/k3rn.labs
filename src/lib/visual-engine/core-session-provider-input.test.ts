import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const core = readFileSync("src/lib/visual-engine/core.ts", "utf8")

describe("MIRAVA Session Builder visual provider boundary", () => {
  it("loads persisted custom look asset IDs and storage paths into provider image inputs", () => {
    expect(core).toContain("async function getMiravaSessionProviderVisualReferences")
    expect(core).toContain("include: {")
    expect(core).toContain("storagePath: string")
    expect(core).toContain("selectMiravaCustomLookProviderReferences")
    expect(core).toContain("const sessionProviderInputs")
    expect(core).toContain("buildMiravaSessionProviderImageInputs")
    expect(core).toContain("for (const reference of sessionProviderInputs)")
    expect(core).toMatch(
      /sourceUrl:\s*await createMiravaKieSignedInputUrl\(\s*reference,?\s*\)/,
    )
    expect(core).toContain("form.append(\n        \"image[]\"")
  })

  it("routes the durable reference asset as art direction at the same private provider boundary", () => {
    expect(core).toContain("selectMiravaReferenceLookProviderReferences")
    expect(core).toMatch(
      /role:\s*reference\.role/,
    )
    expect(core).toContain("sessionProviderInputRoles")
    expect(core).toContain("images:\n              references")
  })
})
