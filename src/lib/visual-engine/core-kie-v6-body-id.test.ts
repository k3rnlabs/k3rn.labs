import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"

const core = readFileSync(
  "src/lib/visual-engine/core.ts",
  "utf8",
)

describe(
  "MIRAVA Kie V6 BODY_ID wiring",
  () => {
    it(
      "derives BODY_ID only from persisted morphology",
      () => {
        expect(core).toContain(
          "parseIdentityMorphology(",
        )
        expect(core).toContain(
          "formatIdentityMorphologyForPrompt(",
        )
      },
    )

    it(
      "passes BODY_ID explicitly into generation",
      () => {
        expect(core).toContain(
          "bodyIdentityPrompt,",
        )
        expect(core).toMatch(
          /bodyIdentity:\s*bodyIdentityPrompt/,
        )
      },
    )

    it(
      "passes BODY_ID to both full-frame and local identity contracts",
      () => {
        const matches =
          core.match(
            /bodyIdentity:\s*bodyIdentityPrompt/g,
          ) ?? []

        expect(matches).toHaveLength(
          2,
        )
      },
    )

    it(
      "keeps BODY_ID explicit in the localized restoration contract",
      () => {
        expect(core).toContain(
          "buildMiravaKieIdentityRestorationPrompt",
        )
        expect(core).toContain(
          "compositeMiravaIdentityRestoration({",
        )
      },
    )
  },
)
