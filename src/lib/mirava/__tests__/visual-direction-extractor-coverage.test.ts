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
  "MIRAVA campaign-safe direction extraction",
  () => {
    it(
      "uses the campaign-safe transfer contract",
      () => {
        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_METADATA.version,
        ).toBe("2.4.0")

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "# 13A. CAMPAIGN-SAFE TRANSFER CONTRACT",
        )

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "opaque high-waisted brief, full-coverage bottom",
        )

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "Do not merely replace isolated trigger words",
        )
      },
    )
  },
)
