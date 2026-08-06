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
  "MIRAVA analysis provider resilience",
  () => {
    const core = readFileSync(
      path.resolve(
        process.cwd(),
        "src/lib/visual-engine/core.ts",
      ),
      "utf8",
    )

    const config = readFileSync(
      path.resolve(
        process.cwd(),
        "src/lib/mirava/server-config.ts",
      ),
      "utf8",
    )

    it(
      "uses a lower-reasoning request with enough visible-output budget",
      () => {
        expect(core).toContain(
          'reasoning_effort:\n            "low"',
        )
        expect(core).toContain(
          "max_completion_tokens:\n            analysisTokenBudget",
        )
        expect(core).toContain(
          "jobAttempt >= 3\n      ? 9000",
        )
      },
    )

    it(
      "switches to a vision-capable fallback after the first failed attempt",
      () => {
        expect(config).toContain(
          "MIRAVA_ANALYSIS_FALLBACK_MODEL",
        )
        expect(config).toContain(
          '"gpt-5-mini"',
        )
        expect(core).toContain(
          "jobAttempt > 1\n      ? MIRAVA_ANALYSIS_FALLBACK_MODEL",
        )
        expect(core).toContain(
          "job.attempts + 1",
        )
      },
    )

    it(
      "distinguishes refusal, output exhaustion and malformed empty output",
      () => {
        expect(core).toContain(
          "[mirava-analysis-refusal]",
        )
        expect(core).toContain(
          "[mirava-analysis-empty-response]",
        )
        expect(core).toContain(
          '"ANALYSIS_OUTPUT_LIMIT"',
        )
        expect(core).toContain(
          "reasoningTokens:",
        )
        expect(core).toContain(
          "finishReason,",
        )
        expect(core).toContain(
          'response.headers.get(\n        "x-request-id"',
        )
      },
    )
  },
)
