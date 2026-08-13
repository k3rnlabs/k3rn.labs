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
  "MIRAVA official universe certified runtime wiring",
  () => {
    it(
      "imports the textual Visual DNA runtime",
      () => {
        expect(
          core,
        ).toContain(
          'from "@/lib/mirava/official-universe-runtime"',
        )

        expect(
          core,
        ).toContain(
          "resolveMiravaOfficialUniverseRuntimePrompt",
        )

        expect(
          core,
        ).toContain(
          "getMiravaOfficialVisualDna",
        )
      },
    )

    it(
      "resolves certified DNA before the legacy official blueprint",
      () => {
        const start =
          core.indexOf(
            "export function buildMiravaResolvedPrimaryGenerationPrompt",
          )

        expect(
          start,
        ).toBeGreaterThan(
          -1,
        )

        const certified =
          core.indexOf(
            "const certifiedRuntimePrompt =",
            start,
          )

        const legacy =
          core.indexOf(
            "const officialBlueprint =",
            start,
          )

        expect(
          certified,
        ).toBeGreaterThan(
          start,
        )

        expect(
          legacy,
        ).toBeGreaterThan(
          certified,
        )

        expect(
          core,
        ).toContain(
          "return certifiedRuntimePrompt",
        )
      },
    )

    it(
      "uses the resolved prompt for the non-continuation anchor frame",
      () => {
        expect(
          core,
        ).toMatch(
          /const anchorPrompt\s*=\s*isReferenceAnchor\s*\?\s*buildMiravaResolvedPrimaryGenerationPrompt\(/,
        )
      },
    )

    it(
      "does not apply the legacy makeup layer twice",
      () => {
        expect(
          core,
        ).toMatch(
          /const primaryPrompt\s*=\s*usesCertifiedOfficialRuntimePrompt\s*\?\s*scenePrimaryPrompt\s*:\s*applyMiravaMakeupDirection\(/,
        )
      },
    )

    it(
      "keeps the canary text-only at runtime",
      () => {
        expect(
          core,
        ).toContain(
          'source:\n          "certified-textual-visual-dna"',
        )

        expect(
          core,
        ).toContain(
          "officialThumbnailRuntimeInput:\n          false",
        )
      },
    )
  },
)
