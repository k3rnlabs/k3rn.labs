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
  SESSION_SET_COPY,
} from "./session-set-step"

const setSource =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/session-builder/session-set-step.tsx",
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
  "MIRAVA Set dynamic photo copy",
  () => {
    it(
      "formats French singular and plural from shotCount",
      () => {
        expect(
          SESSION_SET_COPY
            .fr.intro(
              1,
            ),
        ).toContain(
          "sur la photo.",
        )

        expect(
          SESSION_SET_COPY
            .fr.intro(
              8,
            ),
        ).toContain(
          "sur les 8 photos.",
        )

        expect(
          SESSION_SET_COPY
            .fr.continuity(
              3,
            ),
        ).toBe(
          "Conservé sur les 3 photos",
        )
      },
    )

    it(
      "formats Spanish singular and plural from shotCount",
      () => {
        expect(
          SESSION_SET_COPY
            .es.intro(
              1,
            ),
        ).toContain(
          "en la foto.",
        )

        expect(
          SESSION_SET_COPY
            .es.continuity(
              5,
            ),
        ).toBe(
          "Conservado en las 5 fotos",
        )
      },
    )

    it(
      "passes the persisted shotCount through Set and its preview",
      () => {
        expect(
          flowSource,
        ).toContain(
          "session.config\n              .shotCount",
        )

        expect(
          setSource,
        ).toContain(
          "copy\n              .continuity(\n                shotCount,",
        )

        expect(
          setSource,
        ).toContain(
          "copy\n                  .intro(\n                    shotCount,",
        )
      },
    )

    it(
      "keeps no literal six-photo session copy in Set",
      () => {
        for (
          const value
          of [
            "six photos",
            "6 photos",
            "seis fotos",
          ]
        ) {
          expect(
            setSource,
          ).not.toContain(
            value,
          )
        }
      },
    )
  },
)
