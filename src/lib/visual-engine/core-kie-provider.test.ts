import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"

const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf8",
  )

const schema =
  readFileSync(
    "prisma/schema.prisma",
    "utf8",
  )

describe(
  "MIRAVA Kie routing contracts",
  () => {
    it(
      "routes campaign-safe work directly to Kie when enabled",
      () => {
        expect(core).toContain(
          "useKieCampaignProvider",
        )
        expect(core).toContain(
          "runKieImageGeneration",
        )
        expect(core).toContain(
          '"campaign-safe-kie-primary"',
        )
        expect(core).toContain(
          '"campaign-safe-kie-fallback"',
        )
      },
    )

    it(
      "persists provider task state for idempotent retries",
      () => {
        expect(schema).toContain(
          "providerTaskId",
        )
        expect(schema).toContain(
          "providerFrameIndex",
        )
        expect(core).toContain(
          "onTaskCreated:",
        )
        expect(core).toContain(
          "const resumeTaskId =",
        )

        expect(core).toContain(
          "resumeTaskId,",
        )
      },
    )

    it(
      "retains the art-direction reference for Kie then purges it",
      () => {
        expect(core).toContain(
          "retainReferenceForKieGeneration",
        )
        expect(core).toContain(
          "purgeMiravaArtisticReferenceAssets",
        )
        expect(core).toContain(
          "[mirava-reference-retained-for-kie-generation]",
        )
      },
    )
  },
)
