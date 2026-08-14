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
  SESSION_LOOK_COPY,
} from "./session-look-step"

const lookSource =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/session-builder/session-look-step.tsx",
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
  "MIRAVA Look dynamic photo copy",
  () => {
    it(
      "formats French singular and plural from shotCount",
      () => {
        expect(
          SESSION_LOOK_COPY
            .fr.intro(
              1,
            ),
        ).toContain(
          "sur la photo.",
        )

        expect(
          SESSION_LOOK_COPY
            .fr.intro(
              8,
            ),
        ).toContain(
          "sur les 8 photos.",
        )
      },
    )

    it(
      "formats Spanish singular and plural from shotCount",
      () => {
        expect(
          SESSION_LOOK_COPY
            .es.intro(
              1,
            ),
        ).toContain(
          "en la foto.",
        )

        expect(
          SESSION_LOOK_COPY
            .es.intro(
              5,
            ),
        ).toContain(
          "en las 5 fotos.",
        )
      },
    )

    it(
      "passes persisted shotCount from Builder flow to Look",
      () => {
        expect(
          flowSource,
        ).toContain(
          `<SessionLookStep
          locale={
            locale
          }
          shotCount={
            session.config
              .shotCount
          }`,
        )

        expect(
          lookSource,
        ).toContain(
          `copy.intro(
                  shotCount,
                )`,
        )
      },
    )

    it(
      "keeps no literal six-photo Look session copy",
      () => {
        expect(
          lookSource,
        ).not.toContain(
          "six photos",
        )

        expect(
          lookSource,
        ).not.toContain(
          "seis fotos",
        )
      },
    )
  },
)
