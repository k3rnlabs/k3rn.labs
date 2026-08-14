import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf-8",
  )

describe(
  "MIRAVA durable session continuation",
  () => {
    it(
      "persists session and shot lineage",
      () => {
        expect(core).toContain(
          "continueStudioCreation",
        )
        expect(core).toContain(
          "ensureStudioSessionForCreation",
        )
        expect(core).toContain(
          "parentCreationId",
        )
        expect(core).toContain(
          "shotIndex",
        )
        expect(core).toContain(
          "shotIntent",
        )
        expect(core).toContain(
          "sourceResultIndex",
        )
      },
    )

    it(
      "forces every continued shot to consume one image slot",
      () => {
        const start =
          core.indexOf(
            "export async function continueStudioCreation",
          )
        const end =
          core.indexOf(
            "/**\n * Applies client-approved",
            start,
          )
        const block =
          core.slice(start, end)

        expect(block).toMatch(
          /seriesSize:\s+1/,
        )
        expect(block).toContain(
          "queueStudioGeneration",
        )
      },
    )

    it(
      "uses the previous result as continuity input before identity images",
      () => {
        const continuityIndex =
          core.indexOf(
            "`continuity-${continuityInput.id}",
          )
        const identityIndex =
          core.indexOf(
            "`identity-face-${asset.id}",
            continuityIndex,
          )

        expect(continuityIndex).toBeGreaterThan(-1)
        expect(identityIndex).toBeGreaterThan(
          continuityIndex,
        )
        expect(core).toContain(
          '"continuity-primary"',
        )
      },
    )

    it(
      "drops the continuity image on the semantic safety fallback",
      () => {
        expect(core).toContain(
          "hasContinuityImage:\n              false",
        )
        expect(core).toContain(
          '"semantic-fallback",\n      null',
        )
      },
    )
  },
)
