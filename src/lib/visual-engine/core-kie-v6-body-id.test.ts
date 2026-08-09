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
      "has exactly one active Kie BODY_ID provider contract",
      () => {
        const matches =
          core.match(
            /bodyIdentity:\s*bodyIdentityPrompt/g,
          ) ?? []

        expect(matches).toHaveLength(
          1,
        )
      },
    )

    it(
      "contains no retained provider restoration contract",
      () => {
        expect(core).not.toContain(
          "buildMiravaKieIdentityRestorationPrompt",
        )
        expect(core).not.toContain(
          '"identity-restoration"',
        )
      },
    )
  },
)
