import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_SET_PRESETS,
  getMiravaSetPreset,
  isMiravaSetPresetId,
} from "./set-presets"

describe("MIRAVA Session Builder set presets", () => {
  it("ships exactly three essential and three signature sets", () => {
    expect(MIRAVA_SET_PRESETS).toHaveLength(6)

    expect(
      MIRAVA_SET_PRESETS.filter(
        (preset) =>
          preset.category === "ESSENTIAL",
      ),
    ).toHaveLength(3)

    expect(
      MIRAVA_SET_PRESETS.filter(
        (preset) =>
          preset.category === "SIGNATURE",
      ),
    ).toHaveLength(3)
  })

  it("keeps preset ids unique and explicitly versioned", () => {
    const ids = MIRAVA_SET_PRESETS.map(
      (preset) => preset.id,
    )

    expect(new Set(ids).size).toBe(
      ids.length,
    )

    for (const preset of MIRAVA_SET_PRESETS) {
      expect(preset.id).toMatch(
        new RegExp(`-v${preset.version}$`),
      )
      expect(preset.constraints.length).toBeGreaterThan(
        0,
      )
    }
  })

  it("resolves only known set presets", () => {
    expect(
      getMiravaSetPreset(
        "grey-cyclorama-v1",
      )?.name.fr,
    ).toBe("Studio gris")

    expect(
      getMiravaSetPreset("grey-cyclorama"),
    ).toBeUndefined()

    expect(
      isMiravaSetPresetId(
        "grey-cyclorama-v1",
      ),
    ).toBe(true)

    expect(
      isMiravaSetPresetId(
        "grey-cyclorama",
      ),
    ).toBe(false)
  })
})
