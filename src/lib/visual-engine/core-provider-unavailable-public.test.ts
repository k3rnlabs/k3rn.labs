import {
  readFileSync,
} from "node:fs"
import path from "node:path"
import {
  describe,
  expect,
  it,
} from "vitest"

describe(
  "MIRAVA provider unavailable public contract",
  () => {
    const core =
      readFileSync(
        path.resolve(
          process.cwd(),
          "src/lib/visual-engine/core.ts",
        ),
        "utf8",
      )

    it(
      "normalizes provider billing without exposing provider account state",
      () => {
        expect(core).toContain(
          'error.kind ===\n              "billing"',
        )

        expect(core).toContain(
          '"PROVIDER_UNAVAILABLE"',
        )

        expect(core).toContain(
          '"KIE_CREATE_REJECTED_402"',
        )
      },
    )

    it(
      "keeps technical compensation active for provider failures",
      () => {
        const start =
          core.indexOf(
            "const requiresTechnicalCompensation",
          )

        const end =
          core.indexOf(
            "await db.studioJob.update",
            start,
          )

        const block =
          core.slice(
            start,
            end,
          )

        expect(block).not.toContain(
          'studioError.code !== "PROVIDER_UNAVAILABLE"',
        )

        expect(block).toContain(
          "missingCount",
        )

        expect(block).toContain(
          "grantMiravaCredits",
        )
      },
    )
  },
)
