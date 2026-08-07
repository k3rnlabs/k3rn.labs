import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_LIGHTING_PRESETS,
  getMiravaLightingPreset,
  isMiravaLightingPresetId,
} from "./lighting-presets"

describe("MIRAVA Session Builder lighting presets", () => {
  it("ships the four V1 lighting authorities", () => {
    expect(
      MIRAVA_LIGHTING_PRESETS.map(
        (preset) => preset.id,
      ),
    ).toEqual([
      "soft-v1",
      "clean-v1",
      "direct-flash-v1",
      "dramatic-v1",
    ])
  })

  it("keeps lighting ids unique and versioned", () => {
    const ids =
      MIRAVA_LIGHTING_PRESETS.map(
        (preset) => preset.id,
      )

    expect(new Set(ids).size).toBe(
      ids.length,
    )

    for (
      const preset of MIRAVA_LIGHTING_PRESETS
    ) {
      expect(preset.id).toMatch(
        new RegExp(`-v${preset.version}$`),
      )
      expect(
        preset.constraints.length,
      ).toBeGreaterThan(0)
    }
  })

  it("resolves only known lighting presets", () => {
    expect(
      getMiravaLightingPreset(
        "direct-flash-v1",
      )?.name.fr,
    ).toBe("Flash direct")

    expect(
      getMiravaLightingPreset(
        "direct-flash",
      ),
    ).toBeUndefined()

    expect(
      isMiravaLightingPresetId(
        "direct-flash-v1",
      ),
    ).toBe(true)

    expect(
      isMiravaLightingPresetId(
        "direct-flash",
      ),
    ).toBe(false)
  })
})
