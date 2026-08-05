import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const route =
  readFileSync(
    "src/app/api/visual-engine/creations/[id]/continue/route.ts",
    "utf-8",
  )

describe(
  "POST MIRAVA creation continuation",
  () => {
    it(
      "accepts only bounded shot intents and a valid source result",
      () => {
        expect(route).toContain(
          "miravaShotIntentSchema",
        )
        expect(route).toContain(
          "sourceResultIndex",
        )
        expect(route).toContain(
          ".max(5)",
        )
      },
    )

    it(
      "creates a durable continuation and returns the public DTO",
      () => {
        expect(route).toContain(
          "continueStudioCreation",
        )
        expect(route).toContain(
          "SESSION_CONTINUED",
        )
        expect(route).toContain(
          "studioCreationPublic",
        )
        expect(route).toContain(
          "201",
        )
      },
    )
  },
)
