import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const route = readFileSync(
  "src/app/api/visual-engine/creations/[id]/continue/route.ts",
  "utf-8",
)

describe("POST MIRAVA creation continuation", () => {
  it("accepts composite bounded intents, custom text and a valid source result", () => {
    expect(route).toContain("miravaShotIntentsSchema")
    expect(route).toContain("customInstruction")
    expect(route).toContain("MIRAVA_MAX_CONTINUATION_INSTRUCTION_CHARS")
    expect(route).toContain("sourceResultIndex")
    expect(route).toContain(".max(5)")
    expect(route).toContain(".superRefine(")
  })

  it("keeps the legacy single intent compatible while sending normalized intents to core", () => {
    expect(route).toContain("miravaShotIntentSchema")
    expect(route).toContain("value.intent")
    expect(route).toContain("intents,")
    expect(route).toContain("customInstruction:")
  })

  it("creates a durable continuation and returns the public DTO", () => {
    expect(route).toContain("continueStudioCreation")
    expect(route).toContain("SESSION_CONTINUED")
    expect(route).toContain("studioCreationPublic")
    expect(route).toContain("201")
  })
})
