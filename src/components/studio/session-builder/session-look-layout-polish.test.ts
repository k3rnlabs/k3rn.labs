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
    "src/components/studio/session-builder/session-look-step.tsx",
    "utf8",
  )

describe(
  "MIRAVA Look thumbnail responsive layout",
  () => {
    it(
      "adapts persisted-card columns to the real asset count",
      () => {
        expect(
          source,
        ).toContain(
          'assetCount === 1',
        )

        expect(
          source,
        ).toContain(
          '"grid-cols-1"',
        )

        expect(
          source,
        ).toContain(
          'assetCount === 2',
        )

        expect(
          source,
        ).toContain(
          '"grid-cols-2"',
        )
      },
    )

    it(
      "uses a wider crop for a single persisted image",
      () => {
        expect(
          source,
        ).toContain(
          '"aspect-[16/10]"',
        )
      },
    )

    it(
      "adapts editor thumbnails to one, two, or three columns",
      () => {
        expect(
          source,
        ).toContain(
          "editingItem.assets.length === 1",
        )

        expect(
          source,
        ).toContain(
          "editingItem.assets.length === 2",
        )
      },
    )

    it(
      "prevents Radix from auto-focusing the close button",
      () => {
        expect(
          source,
        ).toContain(
          "onOpenAutoFocus={",
        )

        expect(
          source,
        ).toContain(
          "event.preventDefault()",
        )
      },
    )
  },
)
