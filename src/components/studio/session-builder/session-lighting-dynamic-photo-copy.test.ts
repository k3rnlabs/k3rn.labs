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
  SESSION_LIGHTING_COPY,
} from "./session-lighting-step"

const lightingSource =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/session-builder/session-lighting-step.tsx",
    ),
    "utf8",
  )

const flowSource =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/session-builder/session-builder-flow.tsx",
    ),
    "utf8",
  )

describe(
  "MIRAVA Lighting dynamic photo copy",
  () => {
    it(
      "formats French continuity from shotCount",
      () => {
        expect(
          SESSION_LIGHTING_COPY
            .fr.continuity(
              1,
            ),
        ).toBe(
          "Même plateau · 1 photo",
        )

        expect(
          SESSION_LIGHTING_COPY
            .fr.continuity(
              8,
            ),
        ).toBe(
          "Même plateau · 8 photos",
        )
      },
    )

    it(
      "formats Spanish continuity from shotCount",
      () => {
        expect(
          SESSION_LIGHTING_COPY
            .es.continuity(
              1,
            ),
        ).toBe(
          "Mismo plató · 1 foto",
        )

        expect(
          SESSION_LIGHTING_COPY
            .es.continuity(
              5,
            ),
        ).toBe(
          "Mismo plató · 5 fotos",
        )
      },
    )

    it(
      "passes persisted shotCount through Lighting and its preview",
      () => {
        expect(
          flowSource,
        ).toContain(
          `<SessionLightingStep
          locale={
            locale
          }
          shotCount={
            session.config
              .shotCount
          }`,
        )

        expect(
          lightingSource,
        ).toContain(
          `copy.continuity(
              shotCount,
            )`,
        )

        expect(
          lightingSource,
        ).toContain(
          `shotCount={
                  shotCount
                }`,
        )
      },
    )

    it(
      "keeps no literal six-photo Lighting continuity copy",
      () => {
        expect(
          lightingSource,
        ).not.toContain(
          "Même plateau · 6 photos",
        )

        expect(
          lightingSource,
        ).not.toContain(
          "Mismo plató · 6 fotos",
        )
      },
    )
  },
)
