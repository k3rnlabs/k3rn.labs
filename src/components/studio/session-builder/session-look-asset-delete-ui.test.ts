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
  "MIRAVA individual look view deletion UI",
  () => {
    it(
      "provides a delete action on persisted editor thumbnails",
      () => {
        expect(
          source,
        ).toContain(
          "data-mirava-look-asset-delete",
        )

        expect(
          source,
        ).toContain(
          "deleteMiravaSessionLookAssetClient",
        )

        expect(
          source,
        ).toContain(
          'setItemMutationBusy(\n        "asset-delete"',
        )
      },
    )

    it(
      "blocks deletion of the final remaining view",
      () => {
        expect(
          source,
        ).toContain(
          "editingItem.assets.length <=\n          1",
        )

        expect(
          source,
        ).toContain(
          "copy.lastViewRequired",
        )
      },
    )

    it(
      "rehydrates the open editor from the refreshed server session",
      () => {
        expect(
          source,
        ).toContain(
          "refreshedItems.find",
        )

        expect(
          source,
        ).toContain(
          "setEditingItem(\n              refreshedEditingItem",
        )

        expect(
          source,
        ).toContain(
          "onSessionChange?.(\n          refreshed",
        )
      },
    )

    it(
      "never consumes a private storage path in the UI",
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
