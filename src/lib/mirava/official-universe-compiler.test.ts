import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const compiler =
  readFileSync(
    "scripts/mirava/compile-official-universe.ts",
    "utf8",
  )

describe(
  "MIRAVA official universe offline compiler",
  () => {
    it(
      "uses the same visual direction extractor as uploaded references",
      () => {
        expect(
          compiler,
        ).toContain(
          "MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT",
        )

        expect(
          compiler,
        ).toContain(
          "runKieMultimodalAnalysis",
        )

        expect(
          compiler,
        ).toContain(
          "parseV2Extraction",
        )

        expect(
          compiler,
        ).toContain(
          "ART DIRECTION REFERENCE",
        )

        expect(
          compiler,
        ).toContain(
          "Create the MIRAVA internal art direction from this single reference.",
        )

        expect(
          compiler,
        ).toContain(
          "Compose for a final 4:5 portrait-safe image.",
        )
      },
    )

    it(
      "writes candidates outside the active runtime registry",
      () => {
        expect(
          compiler,
        ).toContain(
          "universe-artifacts",
        )

        expect(
          compiler,
        ).toContain(
          "candidates",
        )

        expect(
          compiler,
        ).toContain(
          'status:\n        "candidate"',
        )

        expect(
          compiler,
        ).not.toContain(
          "official-universe-blueprints.ts",
        )
      },
    )

    it(
      "records provenance and quality gates",
      () => {
        expect(
          compiler,
        ).toContain(
          "sourceSha256",
        )

        expect(
          compiler,
        ).toContain(
          "extractorVersion",
        )

        expect(
          compiler,
        ).toContain(
          "analysisModel",
        )

        expect(
          compiler,
        ).toContain(
          "cameraLanguagePresent",
        )

        expect(
          compiler,
        ).toContain(
          "lightingLanguagePresent",
        )

        expect(
          compiler,
        ).toContain(
          "stylingLanguagePresent",
        )

        expect(
          compiler,
        ).toContain(
          "poseOrExpressionLanguagePresent",
        )
      },
    )
  },
)
