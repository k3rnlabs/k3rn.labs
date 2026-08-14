import {
  readFileSync,
} from "node:fs"
import {
  resolve,
} from "node:path"

import {
  describe,
  expect,
  it,
} from "vitest"

const direction =
  readFileSync(
    resolve(
      process.cwd(),
      "src/components/studio/session-builder/session-direction-step.tsx",
    ),
    "utf8",
  )

describe(
  "MIRAVA Direction atomic step persistence",
  () => {
    it(
      "keeps option changes local instead of PATCHing once per click",
      () => {
        const start =
          direction.indexOf(
            "const select =",
          )

        const end =
          direction.indexOf(
            "const fullPatch =",
            start,
          )

        const block =
          direction.slice(
            start,
            end,
          )

        expect(
          block,
        ).toContain(
          "setDraft(",
        )

        expect(
          block,
        ).not.toContain(
          "onChange(",
        )
      },
    )

    it(
      "does not issue a separate network autosave when the instruction field blurs",
      () => {
        expect(
          direction,
        ).not.toContain(
          "onBlur={() => {",
        )
      },
    )

    it(
      "sends the complete current Direction state when continuing",
      () => {
        expect(
          direction,
        ).toContain(
          `onContinue(
                fullPatch(),
              )`,
        )
      },
    )

    it(
      "also persists the complete Direction state when going back",
      () => {
        expect(
          direction,
        ).toContain(
          `onBack(
                fullPatch(),
              )`,
        )
      },
    )
  },
)
