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
    "utf8",
  )

describe(
  "MIRAVA image provider failover",
  () => {
    it(
      "keeps OpenAI as the first provider for ordinary universes",
      () => {
        expect(core).toContain(
          "jobAttempt > 1",
        )

        expect(core).toContain(
          "useKieProviderRecovery",
        )

        const recovery =
          core.indexOf(
            "if (useKieProviderRecovery)",
          )

        const openAi =
          core.indexOf(
            "return await executeCall(",
            recovery,
          )

        expect(recovery)
          .toBeGreaterThan(-1)
        expect(openAi)
          .toBeGreaterThan(recovery)
      },
    )

    it(
      "fails over a retry attempt to Kie instead of repeating OpenAI",
      () => {
        expect(core).toContain(
          '"provider-recovery-kie"',
        )

        expect(core).toContain(
          "[mirava-image-provider-failover]",
        )

        expect(core).toContain(
          'from:\n          "openai"',
        )

        expect(core).toContain(
          'to:\n          "kie"',
        )
      },
    )

    it(
      "keeps failover behind the existing Kie privacy/configuration gate",
      () => {
        expect(core).toContain(
          "const kieProviderEnabled =\n    isMiravaKieImageProviderEnabled()",
        )

        expect(core).toContain(
          "kieProviderEnabled &&\n    !useKieCampaignProvider &&\n    jobAttempt > 1",
        )
      },
    )

    it(
      "records provider request diagnostics for HTTP failures",
      () => {
        expect(core).toContain(
          'response.headers.get(\n              "x-request-id"',
        )

        expect(core).toContain(
          'response.headers.get(\n              "content-type"',
        )
      },
    )

    it(
      "only retries OpenAI rate limits and server failures",
      () => {
        expect(core).toContain(
          "response.status === 429 ||\n        response.status >= 500",
        )

        expect(core).toContain(
          '"SAFETY_REFUSAL"',
        )
      },
    )
  },
)
