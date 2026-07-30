import { describe, expect, it } from "vitest"
import { buildMiravaSeriesShotBrief, getMiravaSeriesSize } from "@/lib/mirava/series"

describe("MIRAVA editorial series", () => {
  it("accepts the wired one-to-six image formats and keeps a safe runtime fallback", () => {
    expect(getMiravaSeriesSize({})).toBe(1)
    expect(getMiravaSeriesSize({ seriesSize: 1 })).toBe(1)
    expect(getMiravaSeriesSize({ seriesSize: 2 })).toBe(2)
    expect(getMiravaSeriesSize({ seriesSize: 3 })).toBe(3)
    expect(getMiravaSeriesSize({ seriesSize: 4 })).toBe(4)
    expect(getMiravaSeriesSize({ seriesSize: 5 })).toBe(5)
    expect(getMiravaSeriesSize({ seriesSize: 6 })).toBe(6)
    expect(getMiravaSeriesSize({ seriesSize: 7 })).toBe(1)
  })

  it("gives every frame a different narrative and photographic role", () => {
    const briefs = Array.from({ length: 6 }, (_, index) => buildMiravaSeriesShotBrief({ seriesSize: 6 }, index))
    expect(new Set(briefs).size).toBe(6)
    expect(briefs[0]).toContain("Destination opener")
    expect(briefs[1]).toContain("Lived-in moment")
    expect(briefs[2]).toContain("Intimate signature")
    expect(briefs[3]).toContain("Movement and scale")
    expect(briefs[4]).toContain("Social detail")
    expect(briefs[5]).toContain("Closing frame")
    briefs.forEach((brief) => expect(brief).toContain("MANDATORY VARIATION"))
  })

  it("makes the selected setting strategy explicit in the production brief", () => {
    expect(buildMiravaSeriesShotBrief({ seriesSize: 3, seriesStrategy: "single-setting" }, 0))
      .toContain("Keep one main setting")
    expect(buildMiravaSeriesShotBrief({ seriesSize: 3, seriesStrategy: "varied-settings" }, 0))
      .toContain("multiple distinct but visually coherent settings")
  })
})
