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
  "MIRAVA Kie continuation priority",
  () => {
    it(
      "puts CONTINUITY before Session Builder references and FACE_ID",
      () => {
        const contractStart =
          core.indexOf(
            "Continuation contract:",
          )

        expect(
          contractStart,
        ).toBeGreaterThan(-1)

        const continuity =
          core.indexOf(
            "if (continuityAsset)",
            contractStart,
          )

        const session =
          core.indexOf(
            "sessionProviderInputs",
            continuity + 1,
          )

        const identity =
          core.indexOf(
            "...identityReferences",
            session + 1,
          )

        expect(
          continuity,
        ).toBeGreaterThan(
          contractStart,
        )

        expect(
          session,
        ).toBeGreaterThan(
          continuity,
        )

        expect(
          identity,
        ).toBeGreaterThan(
          session,
        )
      },
    )

    it(
      "passes continuation unlocks through every campaign-safe path",
      () => {
        const standardCall =
          /buildMiravaCampaignSafeTransferPrompt\(\s*primaryPrompt,\s*"standard",\s*campaignSafeContinuation,\s*\)/

        expect(
          core,
        ).toMatch(
          standardCall,
        )

        const continuationBlockStart =
          core.indexOf(
            "const campaignSafeContinuation",
          )

        const continuationBlockEnd =
          core.indexOf(
            "const primaryIdentityAssets",
            continuationBlockStart,
          )

        expect(
          continuationBlockStart,
        ).toBeGreaterThan(-1)

        expect(
          continuationBlockEnd,
        ).toBeGreaterThan(
          continuationBlockStart,
        )

        const continuationBlock =
          core.slice(
            continuationBlockStart,
            continuationBlockEnd,
          )

        expect(
          continuationBlock,
        ).toContain(
          "continuationDirective",
        )

        expect(
          continuationBlock,
        ).toContain(
          ".intents",
        )

        expect(
          continuationBlock,
        ).toContain(
          ".customInstruction",
        )

        expect(
          continuationBlock,
        ).toContain(
          "campaignSafeContinuation",
        )

        const conservativeCalls =
          core.match(
              /buildMiravaCampaignSafeTransferPrompt\(\s*primaryPrompt,\s*"conservative",\s*campaignSafeContinuation,\s*\)/g,
          ) ?? []

        expect(
          conservativeCalls.length,
        ).toBeGreaterThanOrEqual(
          3,
        )
      },
    )

    it(
      "logs ordered Kie reference roles for live fidelity diagnostics",
      () => {
        expect(
          core,
        ).toContain(
          "referenceRoles:",
        )

        expect(
          core,
        ).toMatch(
          /referenceRoles:\s*references\.map\(/,
        )
      },
    )
  },
)
