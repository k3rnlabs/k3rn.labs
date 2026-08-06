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
  "MIRAVA generation timeout and retry policy",
  () => {
    it(
      "uses a longer provider timeout for session continuations",
      () => {
        expect(core).toContain(
          "MIRAVA_IMAGE_PROVIDER_TIMEOUT_MS = 120_000",
        )

        expect(core).toContain(
          "MIRAVA_CONTINUITY_IMAGE_PROVIDER_TIMEOUT_MS = 240_000",
        )

        expect(core).toMatch(
          /const providerTimeoutMs =\s+isContinuation\s+\? MIRAVA_CONTINUITY_IMAGE_PROVIDER_TIMEOUT_MS\s+: MIRAVA_IMAGE_PROVIDER_TIMEOUT_MS/,
        )

        expect(core).toContain(
          "AbortSignal.timeout(\n              providerTimeoutMs",
        )
      },
    )

    it(
      "records provider attempt, timeout and elapsed duration",
      () => {
        expect(core).toContain(
          "[mirava-image-attempt]",
        )

        expect(core).toContain(
          "[mirava-image-success]",
        )

        expect(core).toContain(
          "[Studio image provider transport error]",
        )

        expect(core).toContain(
          "jobAttempt",
        )

        expect(core).toContain(
          "timeoutMs:",
        )

        expect(core).toContain(
          "elapsedMs:",
        )
      },
    )

    it(
      "retries generation timeouts once without retrying analysis timeouts",
      () => {
        const start =
          core.indexOf(
            "async function failJob",
          )

        const end =
          core.indexOf(
            "function publicFailureMessage",
            start,
          )

        const block =
          core.slice(
            start,
            end,
          )

        expect(block).toContain(
          'job.kind === "GENERATE"',
        )

        expect(block).toContain(
          '"GENERATION_TIMEOUT"',
        )

        expect(block).toContain(
          "MIRAVA_GENERATION_TIMEOUT_MAX_ATTEMPTS",
        )

        expect(core).toContain(
          "MIRAVA_GENERATION_TIMEOUT_MAX_ATTEMPTS = 2",
        )
      },
    )

    it(
      "keeps the same durable creation while a retry is pending",
      () => {
        const start =
          core.indexOf(
            "async function failJob",
          )

        const end =
          core.indexOf(
            "function publicFailureMessage",
            start,
          )

        const block =
          core.slice(
            start,
            end,
          )

        expect(block).toContain(
          'status: "PENDING"',
        )

        expect(block).toContain(
          'status: job.kind === "ANALYZE" ? "ANALYSIS_QUEUED" : "GENERATION_QUEUED"',
        )

        expect(block).not.toContain(
          "studioCreation.delete",
        )
      },
    )
  },
)
