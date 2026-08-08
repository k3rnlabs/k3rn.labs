import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_LIGHTING_PRESETS,
} from "@/lib/mirava/session-builder/lighting-presets"

import {
  MIRAVA_LIGHTING_VISUAL_PROFILE,
  SESSION_LIGHTING_COPY,
  getMiravaSessionLightingOptions,
} from "./session-lighting-step"

describe(
  "MIRAVA Session Builder lighting step",
  () => {
    it("uses the canonical four lighting presets", () => {
      const options =
        getMiravaSessionLightingOptions()

      expect(
        options,
      ).toBe(
        MIRAVA_LIGHTING_PRESETS,
      )

      expect(
        options.map(
          (preset) =>
            preset.id,
        ),
      ).toEqual([
        "soft-v1",
        "clean-v1",
        "direct-flash-v1",
        "dramatic-v1",
      ])
    })

    it("defines one visual treatment for every canonical lighting preset", () => {
      expect(
        Object.keys(
          MIRAVA_LIGHTING_VISUAL_PROFILE,
        ),
      ).toEqual(
        MIRAVA_LIGHTING_PRESETS.map(
          (preset) =>
            preset.id,
        ),
      )
    })

    it("keeps direct flash visually harder than soft light", () => {
      expect(
        MIRAVA_LIGHTING_VISUAL_PROFILE[
          "direct-flash-v1"
        ].shadowOpacity,
      ).toBe(
        "bg-black/30",
      )

      expect(
        MIRAVA_LIGHTING_VISUAL_PROFILE[
          "soft-v1"
        ].shadowOpacity,
      ).toBe(
        "bg-black/10",
      )
    })

    it("exposes localized FR and ES navigation copy", () => {
      expect(
        SESSION_LIGHTING_COPY
          .fr.continue,
      ).toBe(
        "Composer le look",
      )

      expect(
        SESSION_LIGHTING_COPY
          .es.continue,
      ).toBe(
        "Componer el look",
      )

      expect(
        MIRAVA_LIGHTING_PRESETS[
          0
        ].name.fr,
      ).toBe(
        "Douce",
      )

      expect(
        MIRAVA_LIGHTING_PRESETS[
          0
        ].name.es,
      ).toBe(
        "Suave",
      )
    })
  },
)
