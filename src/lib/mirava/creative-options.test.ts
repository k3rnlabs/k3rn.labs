import { describe, expect, it } from "vitest"
import { miravaCreativeOptionsSchema } from "./creative-options"

describe("MIRAVA public creative options", () => {
  it("keeps only the bounded choices accepted by the public creation contract", () => {
    expect(miravaCreativeOptionsSchema.parse({
      location: "Terrasse minérale",
      note: "Une présence plus spontanée",
      internalPrompt: "must never persist from the client",
    })).toEqual({
      location: "Terrasse minérale",
      note: "Une présence plus spontanée",
    })
  })
})
