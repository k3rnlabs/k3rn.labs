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
  "MIRAVA existing item add-view UI",
  () => {
    it(
      "exposes an add-view action inside the editor",
      () => {
        expect(
          source,
        ).toContain(
          "data-mirava-look-asset-add",
        )

        expect(
          source,
        ).toContain(
          "data-mirava-look-asset-add-trigger",
        )

        expect(
          source,
        ).toContain(
          "uploadMiravaSessionLookAssets",
        )
      },
    )

    it(
      "lets the user classify the new view",
      () => {
        expect(
          source,
        ).toContain(
          "newAssetViewKey",
        )

        expect(
          source,
        ).toContain(
          "MIRAVA_SESSION_LOOK_VIEW_KEYS.map",
        )
      },
    )

    it(
      "enforces the six-view limit in the editor",
      () => {
        expect(
          source,
        ).toContain(
          "editingItem.assets.length >=",
        )

        expect(
          source,
        ).toContain(
          "MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM",
        )

        expect(
          source,
        ).toContain(
          "copy.viewLimit",
        )
      },
    )

    it(
      "rehydrates the open editor after upload",
      () => {
        expect(
          source,
        ).toContain(
          "const refreshedEditingItem =",
        )

        expect(
          source,
        ).toContain(
          "setEditingItem(\n          refreshedEditingItem",
        )

        expect(
          source,
        ).toContain(
          "onSessionChange?.(\n          refreshed",
        )
      },
    )

    it(
      "does not expose private storage paths",
      () => {
        expect(
          source,
        ).not.toContain(
          "storagePath",
        )
      },
    )
  },
)
