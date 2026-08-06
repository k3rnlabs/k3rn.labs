import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const studio =
  readFileSync(
    "src/components/studio/visual-engine-studio.tsx",
    "utf-8",
  )

const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf-8",
  )

describe(
  "MIRAVA framing integrity",
  () => {
    it(
      "never crops delivered result images to a forced 4:5 cover",
      () => {
        const completedStart =
          studio.indexOf(
            'status === "COMPLETED"',
          )

        const completedEnd =
          studio.indexOf(
            "function UniversesView",
            completedStart,
          )

        const completed =
          studio.slice(
            completedStart,
            completedEnd,
          )

        expect(completed).toContain(
          "object-contain",
        )

        expect(completed).not.toContain(
          'aspect-[4/5] w-full object-cover',
        )
      },
    )

    it(
      "keeps the provider output in its native vertical format",
      () => {
        expect(core).toContain(
          'form.append("size", "1024x1536")',
        )
      },
    )

    it(
      "preserves the native aspect ratio of delivered results",
      () => {
        const start =
          core.indexOf(
            "export async function cropMiravaResult",
          )

        const end =
          core.indexOf(
            "async function storeResultAsset",
            start,
          )

        expect(start).toBeGreaterThanOrEqual(0)
        expect(end).toBeGreaterThan(start)

        const cropFunction =
          core.slice(start, end)

        expect(cropFunction).toContain(
          "width: 1024",
        )

        expect(cropFunction).toContain(
          "withoutEnlargement: true",
        )

        expect(cropFunction).not.toContain(
          "height:",
        )

        expect(cropFunction).not.toContain(
          'fit: "cover"',
        )
      },
    )

    it(
      "does not use a destructive 360 by 450 result preview crop",
      () => {
        expect(core).not.toMatch(
          /width:\s*360[\s\S]{0,160}height:\s*450[\s\S]{0,160}fit:\s*["']cover["']/,
        )
      },
    )
  },
)
