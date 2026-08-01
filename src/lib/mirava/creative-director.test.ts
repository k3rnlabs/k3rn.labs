import { describe, expect, it } from "vitest"
import { getMiravaCreativeDirectorChanges, getMiravaCreativeDirectorStarterActions, limitMiravaCreativeDirectorSuggestions } from "./creative-director"

describe("MIRAVA creative director actions", () => {
  it("offers a reference-first action and contextual creative messages", () => {
    const actions = getMiravaCreativeDirectorStarterActions("fr", "escapade-solaire")

    expect(actions).toHaveLength(4)
    expect(actions[0]).toMatchObject({ id: "reference", kind: "reference", title: "Créer depuis mon inspiration" })
    expect(actions[1].message).toContain("Escapade solaire")
    expect(actions.some((action) => action.title.includes("LinkedIn"))).toBe(false)
  })

  it("keeps at most three server-approved changes for an explicit application", () => {
    expect(limitMiravaCreativeDirectorSuggestions({
      location: "Terrasse minérale",
      styling: "Maillot sculptural",
      energy: "Spontanée",
      framing: "Plein pied",
    })).toEqual({
      location: "Terrasse minérale",
      styling: "Maillot sculptural",
      energy: "Spontanée",
    })
  })

  it("turns structured suggestions into client-readable changes without exposing internal data", () => {
    expect(getMiravaCreativeDirectorChanges("fr", {
      energy: "Spontanée",
      seriesSize: 4,
      seriesStrategy: "varied-settings",
    })).toEqual([
      { label: "Énergie", value: "Spontanée" },
      { label: "Série", value: "4" },
      { label: "Rythme de série", value: "Plusieurs décors cohérents" },
    ])
  })
})
