import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const read = (path: string) =>
  readFileSync(
    path,
    "utf8",
  )

const capture = read(
  "src/components/studio/mirava-identity-capture.tsx",
)
const studio = read(
  "src/components/studio/visual-engine-studio.tsx",
)
const core = read(
  "src/lib/visual-engine/core.ts",
)
const uploader = read(
  "src/lib/mirava/identity-profile-upload.client.ts",
)
const schema = read(
  "prisma/schema.prisma",
)

describe(
  "MIRAVA identity view manager",
  () => {
    it(
      "persists semantic view keys instead of relying on gallery order",
      () => {
        expect(schema).toContain(
          "viewKey           String?",
        )
        expect(core).toContain(
          "resolveMiravaIdentityViewKey",
        )
        expect(core).toContain(
          "viewKey: file.viewKey",
        )
        expect(uploader).toContain(
          "viewKeys?.[index]",
        )
      },
    )

    it(
      "hydrates already stored views as validated slots",
      () => {
        expect(capture).toContain(
          'status: "existing"',
        )
        expect(capture).toContain(
          "initialManagedSlotStates",
        )
        expect(capture).toContain(
          "existingAssetId",
        )
      },
    )

    it(
      "keeps add/manage distinct from a full profile rebuild",
      () => {
        expect(studio).toContain(
          '"manage"',
        )
        expect(studio).toContain(
          'openCapture("replace")',
        )
        expect(studio).toContain(
          "saveManagedIdentityView",
        )
        expect(capture).toContain(
          "Remplacer cette vue",
        )
        expect(capture).toContain(
          "Enregistrer cette vue",
        )
      },
    )

    it(
      "prioritizes full body after the three essential views",
      () => {
        expect(capture).toContain(
          "MANAGE_VIEW_PRIORITY",
        )
        expect(capture).toContain(
          '"body"',
        )
        expect(capture).toContain(
          "firstManageSlotIndex",
        )
      },
    )
  },
)
