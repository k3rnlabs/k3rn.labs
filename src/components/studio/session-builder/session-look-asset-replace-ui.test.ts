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
  "MIRAVA replace persisted look view UI",
  () => {
    it(
      "offers replacement on every persisted thumbnail",
      () => {
        expect(
          source,
        ).toContain(
          "data-mirava-look-asset-replace",
        )

        expect(
          source,
        ).toContain(
          "data-mirava-look-asset-replace-input",
        )

        expect(
          source,
        ).toContain(
          "replaceMiravaSessionLookAssetClient",
        )
      },
    )

    it(
      "targets the exact persisted asset id",
      () => {
        expect(
          source,
        ).toContain(
          "replacingAssetId",
        )

        expect(
          source,
        ).toContain(
          "assetId:\n              currentAsset.id",
        )
      },
    )

    it(
      "preserves the current semantic view key",
      () => {
        expect(
          source,
        ).toContain(
          "viewKey:\n                currentAsset.viewKey",
        )
      },
    )

    it(
      "rehydrates the open editor after replacement",
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
