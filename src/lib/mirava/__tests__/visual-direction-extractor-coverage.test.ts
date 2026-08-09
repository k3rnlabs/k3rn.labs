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
        ).toBe("2.6.0")

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "# 13A. CAMPAIGN-SAFE TRANSFER CONTRACT",
        )

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "conventional full-coverage commercial equivalent",
        )

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "Do not merely replace isolated trigger words",
        )

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).not.toContain(
          "may replace sexualized pose",
        )

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "localized visual dimension",
        )

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "MINIMUM-CHANGE reconstruction mode",
        )

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "raised-leg geometry",
        )

        expect(
          MIRAVA_VISUAL_DIRECTION_EXTRACTOR_V2_PROMPT,
        ).toContain(
          "Do not default to a balanced standing pose",
        )
      },
    )
  },
)
