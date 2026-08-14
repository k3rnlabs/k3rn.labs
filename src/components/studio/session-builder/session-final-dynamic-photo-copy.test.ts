import {
  readFileSync,
} from "node:fs"
import path from "node:path"

import {
  describe,
  expect,
  it,
} from "vitest"

const gallery =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/session-builder/session-gallery.tsx",
    ),
    "utf8",
  )

const studio =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/visual-engine-studio.tsx",
    ),
    "utf8",
  )

describe(
  "MIRAVA final dynamic photo copy",
  () => {
    it(
      "uses the server shotCount in Gallery with the active Builder default as loading fallback",
      () => {
        expect(
          gallery,
        ).toContain(
          "session?.shotCount ??",
        )

        expect(
          gallery,
        ).toContain(
          "MIRAVA_SESSION_SHOT_COUNT",
        )

        expect(
          gallery,
        ).toContain(
          "copy.preparing(",
        )

        expect(
          gallery,
        ).not.toContain(
          "session?.shotCount ?? 6",
        )
      },
    )

    it(
      "has dynamic singular/plural Gallery preparation copy",
      () => {
        expect(
          gallery,
        ).toContain(
          'total === 1',
        )

        expect(
          gallery,
        ).toContain(
          'Préparation de la prise…',
        )

        expect(
          gallery,
        ).toContain(
          'Preparando la imagen…',
        )

        expect(
          gallery,
        ).not.toContain(
          'Préparation des six prises…',
        )

        expect(
          gallery,
        ).not.toContain(
          'Preparando las seis imágenes…',
        )
      },
    )

    it(
      "uses the active Builder default in the Studio entry card",
      () => {
        expect(
          studio,
        ).toContain(
          "MIRAVA_SESSION_SHOT_COUNT",
        )

        expect(
          studio,
        ).toContain(
          "la direction et le look",
        )

        expect(
          studio,
        ).toContain(
          "la dirección y el look",
        )

        expect(
          studio,
        ).not.toContain(
          "plan cohérent de 6 photos",
        )

        expect(
          studio,
        ).not.toContain(
          "plan coherente de 6 fotos",
        )
      },
    )
  },
)
