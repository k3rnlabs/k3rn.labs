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
  "MIRAVA failed creation locale",
  () => {
    const studio =
      readFileSync(
        path.resolve(
          process.cwd(),
          "src/components/studio/visual-engine-studio.tsx",
        ),
        "utf8",
      )

    it(
      "does not surface a persisted French failure message in Spanish",
      () => {
        const start =
          studio.indexOf(
            "if (newlyFailed)",
          )

        const end =
          studio.indexOf(
            "creationStatusesRef.current",
            start,
          )

        expect(start)
          .toBeGreaterThanOrEqual(0)
        expect(end)
          .toBeGreaterThan(start)

        const block =
          studio.slice(
            start,
            end,
          )

        expect(block).toContain(
          'locale === "fr"',
        )

        expect(block).toContain(
          "newlyFailed.failureMessage",
        )

        expect(block).toContain(
          "La generación no se completó.",
        )

        expect(
          block.indexOf(
            'locale === "fr"',
          ),
        ).toBeLessThan(
          block.indexOf(
            "newlyFailed.failureMessage",
          ),
        )

        expect(
          block.match(
            /newlyFailed\.failureMessage/g,
          )?.length,
        ).toBe(
          1,
        )
      },
    )
  },
)
