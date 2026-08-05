import {
  describe,
  expect,
  it,
} from "vitest"
import {
  MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA,
  MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
} from "../prompts/visual-direction-extractor-v2"

describe(
  "MIRAVA coverage-safe direction extraction",
  () => {
    it(
      "uses the coverage-safe extractor contract",
      () => {
        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA.version,
        ).toBe("2.3.0")

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "# 13A. COVERAGE-SAFE ADAPTATION CONTRACT",
        )

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "fully opaque, high-waisted neutral underlayer",
        )

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "Do not solve the issue by replacing isolated trigger words",
        )
      },
    )
  },
)
