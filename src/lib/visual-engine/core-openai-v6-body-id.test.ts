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

function bodyIdentityDerivation():
  string {
  const start =
    core.indexOf(
      "BODY_ID is generated only from the strict",
    )

  const end =
    core.indexOf(
      "const frameIndex =",
      start,
    )

  if (
    start < 0 ||
    end < 0
  ) {
    throw new Error(
      "BODY_ID derivation block not found",
    )
  }

  return core.slice(
    start,
    end,
  )
}

function kieBodyPromptBlock():
  string {
  const start =
    core.indexOf(
      "BODY_ID remains server-owned textual morphology",
    )

  const end =
    core.indexOf(
      "const promptHash =",
      start,
    )

  if (
    start < 0 ||
    end < 0
  ) {
    throw new Error(
      "KIE BODY_ID prompt block not found",
    )
  }

  return core.slice(
    start,
    end,
  )
}

describe(
  "MIRAVA KIE-only V6 BODY_ID boundary",
  () => {
    it(
      "contains no legacy OpenAI image BODY_ID runtime",
      () => {
        expect(
          core,
        ).not.toContain(
          "buildMiravaOpenAiBodyIdentityPrompt(",
        )

        expect(
          core,
        ).not.toContain(
          "const executeCall = async (",
        )

        expect(
          core,
        ).not.toContain(
          "return await executeCall(",
        )
      },
    )

    it(
      "derives BODY_ID only from persisted identity morphology",
      () => {
        const block =
          bodyIdentityDerivation()

        expect(
          block,
        ).toContain(
          "parseIdentityMorphology(",
        )

        expect(
          block,
        ).toContain(
          "formatIdentityMorphologyForPrompt(",
        )

        expect(
          block,
        ).not.toContain(
          "faceGeometry",
        )

        expect(
          block,
        ).not.toContain(
          "identityAssets",
        )
      },
    )

    it(
      "passes the server-owned BODY_ID into generation",
      () => {
        expect(
          core,
        ).toContain(
          "const bodyIdentityPrompt =",
        )

        expect(
          core,
        ).toContain(
          `physicalTraits,
        bodyIdentityPrompt,
        job.attempts + 1`,
        )
      },
    )

    it(
      "injects BODY_ID into the active KIE provider prompt",
      () => {
        const block =
          kieBodyPromptBlock()

        expect(
          block,
        ).toContain(
          "buildMiravaKieReferencePrompt({",
        )

        expect(
          block,
        ).toContain(
          "bodyIdentity:",
        )

        expect(
          block,
        ).toContain(
          "bodyIdentityPrompt",
        )
      },
    )
  },
)
