import {
  describe,
  expect,
  it,
} from "vitest"
import {
  buildMiravaSeriesShotBrief,
} from "../series"

describe(
  "MIRAVA series reference fidelity",
  () => {
    it(
      "uses frame one as the closest reconstruction of the reference",
      () => {
        const brief =
          buildMiravaSeriesShotBrief(
            {
              seriesSize: 3,
              referenceMode:
                "faithful",
            },
            0,
          )

        expect(brief).toContain(
          "Reference fidelity hero",
        )

        expect(brief).toContain(
          "preserve the exact extracted reference crop",
        )

        expect(brief).toContain(
          "reproduce the extracted pose skeleton",
        )

        expect(brief).toContain(
          "head angle, gaze, expression and hairstyle arrangement",
        )

        expect(brief).toContain(
          "Do not replace the reference pose with arrival, walking",
        )

        expect(brief).not.toContain(
          "arrival, walking into the setting or a confident pause that establishes the destination",
        )
      },
    )

    it(
      "preserves non-varied architecture and wardrobe in later frames",
      () => {
        const brief =
          buildMiravaSeriesShotBrief(
            {
              seriesSize: 3,
              referenceMode:
                "variations",
              variationAxes: [
                "framing",
              ],
            },
            1,
          )

        expect(brief).toContain(
          "architectural era and material system",
        )

        expect(brief).toContain(
          "wardrobe topology",
        )

        expect(brief).toContain(
          "preserve every non-varied reference constraint",
        )
      },
    )
  },
)
