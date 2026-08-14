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

describe(
  "MIRAVA persisted look item editor UI",
  () => {
    it(
      "makes every persisted clothing card an edit trigger",
      () => {
        expect(
          step,
        ).toContain(
          "data-mirava-look-item-edit-trigger",
        )

        expect(
          step,
        ).toContain(
          "onEdit={() =>",
        )

        expect(
          step,
        ).toContain(
          "<Pencil",
        )
      },
    )

    it(
      "uses an accessible Radix dialog for article editing",
      () => {
        expect(
          step,
        ).toContain(
          'import * as DialogPrimitive from "@radix-ui/react-dialog"',
        )

        expect(
          step,
        ).toContain(
          "data-mirava-look-editor",
        )

        expect(
          step,
        ).toContain(
          "<DialogPrimitive.Title",
        )

        expect(
          step,
        ).toContain(
          "<DialogPrimitive.Description",
        )
      },
    )

    it(
      "supports metadata save and explicit delete confirmation",
      () => {
        expect(
          step,
        ).toContain(
          "updateMiravaSessionLookItemClient",
        )

        expect(
          step,
        ).toContain(
          "deleteMiravaSessionLookItemClient",
        )

        expect(
          step,
        ).toContain(
          "data-mirava-look-editor-save",
        )

        expect(
          step,
        ).toContain(
          "data-mirava-look-delete-confirm",
        )

        expect(
          step,
        ).toContain(
          "data-mirava-look-delete-confirm-button",
        )
      },
    )

    it(
      "rehydrates local and parent session state after mutations",
      () => {
        expect(
          step,
        ).toContain(
          "refreshed.lookItems",
        )

        expect(
          step,
        ).toContain(
          "onSessionChange?.(",
        )
      },
    )

    it(
      "keeps FR and ES article management copy",
      () => {
        expect(
          step,
        ).toContain(
          '"Modifier l’article"',
        )

        expect(
          step,
        ).toContain(
          '"Modificar la prenda"',
        )

        expect(
          step,
        ).toContain(
          '"Supprimer l’article"',
        )

        expect(
          step,
        ).toContain(
          '"Eliminar la prenda"',
        )
      },
    )

    it(
      "does not expose private storage paths",
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
