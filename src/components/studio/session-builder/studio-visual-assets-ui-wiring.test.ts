import {
  readFileSync,
} from "node:fs"
import path from "node:path"

import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_LIGHTING_PRESETS,
} from "@/lib/mirava/session-builder/lighting-presets"
import {
  MIRAVA_SET_PRESETS,
} from "@/lib/mirava/session-builder/set-presets"
import {
  MIRAVA_LIGHTING_PREVIEW_IMAGES,
  MIRAVA_LIGHTING_VISUAL_ASSETS,
  MIRAVA_SET_PREVIEW_IMAGES,
  MIRAVA_SET_VISUAL_ASSETS,
} from "@/lib/mirava/session-builder/studio-visual-assets"

const studioSource =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/visual-engine-studio.tsx",
    ),
    "utf8",
  )

const lightingSource =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/session-builder/session-lighting-step.tsx",
    ),
    "utf8",
  )

describe(
  "MIRAVA canonical Studio visual assets UI wiring",
  () => {
    it(
      "exposes one canonical preview for every Set preset",
      () => {
        expect(
          Object.keys(
            MIRAVA_SET_PREVIEW_IMAGES,
          ),
        ).toEqual(
          MIRAVA_SET_PRESETS.map(
            (preset) =>
              preset.id,
          ),
        )

        for (
          const preset
          of MIRAVA_SET_PRESETS
        ) {
          expect(
            MIRAVA_SET_PREVIEW_IMAGES[
              preset.id
            ],
          ).toBe(
            MIRAVA_SET_VISUAL_ASSETS[
              preset.id
            ].previewPath,
          )
        }
      },
    )

    it(
      "exposes one canonical preview for every Lighting preset",
      () => {
        expect(
          Object.keys(
            MIRAVA_LIGHTING_PREVIEW_IMAGES,
          ),
        ).toEqual(
          MIRAVA_LIGHTING_PRESETS.map(
            (preset) =>
              preset.id,
          ),
        )

        for (
          const preset
          of MIRAVA_LIGHTING_PRESETS
        ) {
          expect(
            MIRAVA_LIGHTING_PREVIEW_IMAGES[
              preset.id
            ],
          ).toBe(
            MIRAVA_LIGHTING_VISUAL_ASSETS[
              preset.id
            ].previewPath,
          )
        }
      },
    )

    it(
      "wires both canonical maps from Studio root into SessionBuilderFlow",
      () => {
        expect(
          studioSource,
        ).toContain(
          "MIRAVA_SET_PREVIEW_IMAGES",
        )

        expect(
          studioSource,
        ).toContain(
          "MIRAVA_LIGHTING_PREVIEW_IMAGES",
        )

        expect(
          studioSource,
        ).toContain(
          `setPreviewImages={
                MIRAVA_SET_PREVIEW_IMAGES
              }`,
        )

        expect(
          studioSource,
        ).toContain(
          `lightingPreviewImages={
                MIRAVA_LIGHTING_PREVIEW_IMAGES
              }`,
        )
      },
    )

    it(
      "renders a canonical Lighting asset without synthetic relighting overlays",
      () => {
        const canonicalStart =
          lightingSource.indexOf(
            "if (image) {",
          )

        const profileStart =
          lightingSource.indexOf(
            "const profile =",
            canonicalStart,
          )

        expect(
          canonicalStart,
        ).toBeGreaterThan(-1)

        expect(
          lightingSource,
        ).toContain(
          "data-mirava-canonical-lighting-preview",
        )

        expect(
          profileStart,
        ).toBeGreaterThan(
          canonicalStart,
        )
      },
    )
  },
)
