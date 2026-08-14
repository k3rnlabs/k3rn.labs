import {
  readFileSync,
} from "node:fs"

import {
  describe,
  expect,
  it,
} from "vitest"

const step =
  readFileSync(
    "src/components/studio/session-builder/session-look-step.tsx",
    "utf8",
  )

const uploadClient =
  readFileSync(
    "src/lib/mirava/session-builder/session-look-upload.client.ts",
    "utf8",
  )

describe(
  "MIRAVA persisted look thumbnails",
  () => {
    it(
      "renders every persisted asset rather than only an item count",
      () => {
        expect(
          step,
        ).toContain(
          "item.assets.map(",
        )

        expect(
          step,
        ).toContain(
          "asset.url",
        )

        expect(
          step,
        ).toContain(
          "data-mirava-look-thumbnails",
        )

        expect(
          step,
        ).toContain(
          "SESSION_LOOK_VIEW_LABELS",
        )
      },
    )

    it(
      "keeps a visible fallback when a temporary signed preview is unavailable",
      () => {
        expect(
          step,
        ).toContain(
          "data-mirava-look-thumbnail-unavailable",
        )

        expect(
          step,
        ).toContain(
          "ImageIcon",
        )
      },
    )

    it(
      "hydrates the immediate post-upload UI from the fresh public session",
      () => {
        expect(
          uploadClient,
        ).toContain(
          "lookItems?:",
        )

        expect(
          step,
        ).toContain(
          "receipt.session.lookItems",
        )
      },
    )

    it(
      "does not introduce private storage paths into the Look component",
      () => {
        expect(
          step,
        ).not.toContain(
          "storagePath",
        )
      },
    )
  },
)
