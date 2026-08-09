import {
  readFileSync,
} from "node:fs"

import {
  describe,
  expect,
  it,
} from "vitest"

const privacy =
  readFileSync(
    "src/lib/visual-engine/privacy.ts",
    "utf8",
  )

const route =
  readFileSync(
    "src/app/api/visual-engine/privacy/route.ts",
    "utf8",
  )

describe(
  "MIRAVA OpenAI identity-analysis consent evidence",
  () => {
    it(
      "keeps OpenAI identity analysis separate from general identity processing",
      () => {
        expect(privacy).toContain(
          '"openai_identity_analysis"',
        )

        expect(privacy).toContain(
          "MIRAVA_OPENAI_IDENTITY_ANALYSIS_CONSENT_VERSION",
        )

        expect(privacy).toContain(
          "openaiIdentityAnalysisAccepted",
        )
      },
    )

    it(
      "provides explicit accept, withdraw and require server primitives",
      () => {
        expect(privacy).toContain(
          "acceptMiravaOpenAiIdentityAnalysisConsent",
        )

        expect(privacy).toContain(
          "withdrawMiravaOpenAiIdentityAnalysisConsent",
        )

        expect(privacy).toContain(
          "requireMiravaOpenAiIdentityAnalysisConsent",
        )
      },
    )

    it(
      "accepts the provider disclosure through a dedicated API action",
      () => {
        expect(route).toContain(
          '"accept_openai_identity_analysis"',
        )

        expect(route).toContain(
          "disclosureAccepted:",
        )

        expect(route).toContain(
          "z.literal(true)",
        )

        expect(route).toContain(
          "acceptMiravaOpenAiIdentityAnalysisConsent",
        )
      },
    )
  },
)
