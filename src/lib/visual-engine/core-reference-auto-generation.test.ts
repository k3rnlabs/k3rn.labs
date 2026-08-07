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
  "MIRAVA personal-reference state machine",
  () => {
    const core = readFileSync(
      path.resolve(
        process.cwd(),
        "src/lib/visual-engine/core.ts",
      ),
      "utf8",
    )

    const studio = readFileSync(
      path.resolve(
        process.cwd(),
        "src/components/studio/visual-engine-studio.tsx",
      ),
      "utf8",
    )

    it(
      "moves a ready identity directly from analysis to the generation queue",
      () => {
        const analysisStart =
          core.indexOf(
            'if (job.kind === "ANALYZE")',
          )

        const generationQueue =
          core.indexOf(
            '"GENERATION_QUEUED"',
            analysisStart,
          )

        const masterReady =
          core.indexOf(
            '"MASTER_PROMPT_READY"',
            generationQueue + 1,
          )

        expect(analysisStart)
          .toBeGreaterThan(-1)
        expect(generationQueue)
          .toBeGreaterThan(
            analysisStart,
          )
        expect(masterReady)
          .toBeGreaterThan(
            generationQueue,
          )

        expect(core).toContain(
          'kind: "GENERATE",\n              status: "PENDING"',
        )
        expect(core).toContain(
          "await db.$transaction([",
        )
      },
    )

    it(
      "does not regress a durable analysis after a late worker failure",
      () => {
        expect(core).toContain(
          "[mirava-analysis-durable-state-preserved]",
        )
        expect(core).toContain(
          "isMiravaGenerationAlreadyDurable(\n          failureCreation.status",
        )
        expect(core).toContain(
          "[mirava-reference-purge-deferred]",
        )
      },
    )

    it(
      "never turns an unknown client status into a clickable ready state",
      () => {
        expect(studio).toContain(
          ': "ANALYSIS_QUEUED"',
        )
        expect(studio).not.toContain(
          "MASTER_PROMPT",
        )
        expect(studio).not.toContain(
          '? rawStatus : "IDENTITY_READY"',
        )
      },
    )
  },
)
