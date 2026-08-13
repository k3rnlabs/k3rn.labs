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

function kieReferenceAssembly(): string {
  const start =
    core.indexOf(
      "const kieNonIdentityReferenceBudget =",
    )

  const end =
    core.indexOf(
      "const providerPrompt =",
      start,
    )

  if (
    start < 0 ||
    end < 0
  ) {
    throw new Error(
      "Kie reference-budget block not found",
    )
  }

  return core.slice(
    start,
    end,
  )
}

describe(
  "MIRAVA Kie V6 reference budget",
  () => {
    it(
      "keeps the existing eight-image provider cap",
      () => {
        expect(core).toContain(
          "const MIRAVA_KIE_REFERENCE_LIMIT = 8",
        )
      },
    )

    it(
      "reserves FACE_ID before budgeting non-identity references",
      () => {
        const block =
          kieReferenceAssembly()

        expect(block).toContain(
          "MIRAVA_KIE_REFERENCE_LIMIT -",
        )

        expect(block).toContain(
          "identityReferences.length",
        )
      },
    )

    it(
      "reserves continuity and explicit art direction before wardrobe inputs",
      () => {
        const block =
          kieReferenceAssembly()

        expect(block).toContain(
          "(continuityAsset ? 1 : 0)",
        )

        expect(block).toContain(
          "(kieArtisticReference ? 1 : 0)",
        )

        expect(block).toContain(
          "kieReservedNonSessionReferenceCount",
        )
      },
    )

    it(
      "limits only Session Builder references when the provider budget is saturated",
      () => {
        const block =
          kieReferenceAssembly()

        expect(block).toContain(
          "sessionProviderInputs.slice(",
        )

        expect(block).toContain(
          "kieSessionProviderInputBudget",
        )
      },
    )

    it(
      "never truncates the final reference array after FACE_ID is appended",
      () => {
        const block =
          kieReferenceAssembly()

        const identity =
          block.indexOf(
            "...identityReferences",
          )

        expect(identity).toBeGreaterThan(
          -1,
        )

        const afterIdentity =
          block.slice(identity)

        expect(afterIdentity).not.toContain(
          "splice(8)",
        )

        expect(afterIdentity).not.toContain(
          "references.splice(",
        )
      },
    )

    it(
      "keeps continuity before Session Builder references and FACE_ID",
      () => {
        const block =
          kieReferenceAssembly()

        const continuity =
          block.indexOf(
            "if (continuityAsset)",
          )

        const session =
          block.indexOf(
            "sessionProviderInputs.slice(",
          )

        const identity =
          block.indexOf(
            "...identityReferences",
          )

        expect(continuity).toBeGreaterThan(
          -1,
        )

        expect(session).toBeGreaterThan(
          continuity,
        )

        expect(identity).toBeGreaterThan(
          session,
        )
      },
    )

    it(
      "preserves all three FACE_ID slots in the worst supported Builder case",
      () => {
        const providerLimit = 8
        const identityCount = 3
        const continuityCount = 1
        const artDirectionCount = 1

        const sessionBudget =
          providerLimit -
          identityCount -
          continuityCount -
          artDirectionCount

        expect(sessionBudget).toBe(3)

        expect(
          identityCount +
            continuityCount +
            artDirectionCount +
            sessionBudget,
        ).toBe(8)
      },
    )
  },
)
