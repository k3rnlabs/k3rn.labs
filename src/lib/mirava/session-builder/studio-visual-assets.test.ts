import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_LIGHTING_PRESETS,
} from "./lighting-presets"

import {
  MIRAVA_SET_PRESETS,
} from "./set-presets"

import {
  MIRAVA_LIGHTING_VISUAL_ASSETS,
  MIRAVA_SET_VISUAL_ASSETS,
} from "./studio-visual-assets"

describe(
  "MIRAVA canonical Studio visual asset contract",
  () => {
    it(
      "declares one canonical asset for every set preset",
      () => {
        expect(
          Object.keys(
            MIRAVA_SET_VISUAL_ASSETS,
          ),
        ).toEqual(
          MIRAVA_SET_PRESETS.map(
            (preset) =>
              preset.id,
          ),
        )
      },
    )

    it(
      "declares one canonical asset for every lighting preset",
      () => {
        expect(
          Object.keys(
            MIRAVA_LIGHTING_VISUAL_ASSETS,
          ),
        ).toEqual(
          MIRAVA_LIGHTING_PRESETS.map(
            (preset) =>
              preset.id,
          ),
        )
      },
    )

    it(
      "uses versioned webp paths under the dedicated Session Builder namespace",
      () => {
        for (
          const asset of Object.values(
            MIRAVA_SET_VISUAL_ASSETS,
          )
        ) {
          expect(
            asset.previewPath,
          ).toMatch(
            /^\/visual-engine\/session-builder\/sets\/.+-v1\.webp$/,
          )
        }

        for (
          const asset of Object.values(
            MIRAVA_LIGHTING_VISUAL_ASSETS,
          )
        ) {
          expect(
            asset.previewPath,
          ).toMatch(
            /^\/visual-engine\/session-builder\/lighting\/.+-v1\.webp$/,
          )
        }
      },
    )
  },
)
