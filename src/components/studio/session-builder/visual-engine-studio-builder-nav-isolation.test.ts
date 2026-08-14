import {
  readFileSync,
} from "node:fs"
import path from "node:path"

import {
  describe,
  expect,
  it,
} from "vitest"

const studio =
  readFileSync(
    path.resolve(
      process.cwd(),
      "src/components/studio/visual-engine-studio.tsx",
    ),
    "utf8",
  )

describe(
  "MIRAVA Session Builder mobile navigation isolation",
  () => {
    it(
      "hides the global mobile dock while a Builder session is active",
      () => {
        expect(
          studio,
        ).toContain(
          `{!sessionBuilderSession ? (
        <BottomNavBar`,
        )

        const navStart =
          studio.indexOf(
            "{!sessionBuilderSession ? (",
          )

        const navEnd =
          studio.indexOf(
            ") : null}",
            navStart,
          )

        expect(
          navStart,
        ).toBeGreaterThan(-1)

        expect(
          navEnd,
        ).toBeGreaterThan(
          navStart,
        )

        const block =
          studio.slice(
            navStart,
            navEnd,
          )

        expect(
          block,
        ).toContain(
          "<BottomNavBar",
        )

        expect(
          block,
        ).toContain(
          'className="fixed inset-x-0 z-30 mx-auto lg:hidden"',
        )
      },
    )

    it(
      "restores the global dock when Builder launch transitions to the gallery",
      () => {
        const launchStart =
          studio.indexOf(
            "const launchSessionBuilderShoot",
          )

        const launchEnd =
          studio.indexOf(
            "const isCreateFlow",
            launchStart,
          )

        expect(
          launchStart,
        ).toBeGreaterThan(-1)

        expect(
          launchEnd,
        ).toBeGreaterThan(
          launchStart,
        )

        const launch =
          studio.slice(
            launchStart,
            launchEnd,
          )

        const clearBuilder =
          launch.indexOf(
            "setSessionBuilderSession(null)",
          )

        const openGallery =
          launch.indexOf(
            "setSessionShootId(builderSession.id)",
          )

        expect(
          clearBuilder,
        ).toBeGreaterThan(-1)

        expect(
          openGallery,
        ).toBeGreaterThan(-1)

        expect(
          clearBuilder,
        ).toBeLessThan(
          openGallery,
        )
      },
    )
  },
)
