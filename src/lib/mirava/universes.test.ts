import { describe, expect, it } from "vitest"
import { MIRAVA_UNIVERSES } from "@/lib/mirava/universes"

describe("MIRAVA contextual creative directions", () => {
  it("gives every universe a complete bilingual direction and contextual refinements", () => {
    expect(MIRAVA_UNIVERSES).toHaveLength(11)

    for (const universe of MIRAVA_UNIVERSES) {
      expect(universe.creativeDirection.location.fr).toBeTruthy()
      expect(universe.creativeDirection.location.es).toBeTruthy()
      expect(universe.creativeDirection.photoStyle.fr).toBeTruthy()
      expect(universe.creativeDirection.refinements.locations.fr.length).toBeGreaterThanOrEqual(3)
      expect(universe.creativeDirection.refinements.stylings.fr.length).toBeGreaterThanOrEqual(3)
      expect(universe.creativeDirection.refinements.energies.fr.length).toBeGreaterThanOrEqual(3)
      expect(universe.creativeDirection.refinements.lights.fr.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("keeps Glamour nocturne inside its own nocturnal setting family", () => {
    const glamour = MIRAVA_UNIVERSES.find((universe) => universe.id === "night-glamour")

    expect(glamour?.creativeDirection.refinements.locations.fr).toEqual([
      "Entrée d’hôtel",
      "Lounge feutré",
      "Rue nocturne",
      "Ascenseur miroir",
    ])
    expect(glamour?.creativeDirection.refinements.locations.fr).not.toContain("Bord de mer")
  })
})
