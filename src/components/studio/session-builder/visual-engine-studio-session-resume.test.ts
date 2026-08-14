import {
  readFileSync,
} from "node:fs"

import {
  describe,
  expect,
  it,
} from "vitest"

const source =
  readFileSync(
    "src/components/studio/visual-engine-studio.tsx",
    "utf8",
  )

describe(
  "MIRAVA Session Builder resume UI",
  () => {
    it(
      "loads durable builder drafts",
      () => {
        expect(
          source,
        ).toContain(
          "listMiravaSessionBuilderClientSessions",
        )

        expect(
          source,
        ).toContain(
          "setSessionBuilderDrafts",
        )
      },
    )

    it(
      "separates resume from new session creation",
      () => {
        expect(
          source,
        ).toContain(
          "data-mirava-session-builder-resume",
        )

        expect(
          source,
        ).toContain(
          "Reprendre ma séance",
        )

        expect(
          source,
        ).toContain(
          "data-mirava-session-builder-entry",
        )

        expect(
          source,
        ).toContain(
          "Construire une séance",
        )
      },
    )

    it(
      "removes the resumable draft only after launch succeeds",
      () => {
        const launchStart =
          source.indexOf(
            "const launchSessionBuilderShoot =",
          )

        const shootCall =
          source.indexOf(
            "/shoot",
            launchStart,
          )

        const draftRemoval =
          source.indexOf(
            "setSessionBuilderDrafts(",
            shootCall,
          )

        expect(
          launchStart,
        ).toBeGreaterThan(
          -1,
        )

        expect(
          shootCall,
        ).toBeGreaterThan(
          launchStart,
        )

        expect(
          draftRemoval,
        ).toBeGreaterThan(
          shootCall,
        )
      },
    )
  },
)
