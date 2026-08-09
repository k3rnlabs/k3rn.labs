import { describe, expect, it } from "vitest"
import {
  isMiravaBacklit,
  isMiravaRedEye,
} from "./mirava-vision-quality"

describe("MIRAVA backlight classification", () => {
  it("rejects the real backlit neutral portrait", () => {
    expect(
      isMiravaBacklit({
        luminance: 84.4,
        faceMedianLuminance: 78,
        backgroundHighlightRatio: 0.17,
        backlightDifference: 138,
      }),
    ).toBe(true)
  })

  it("rejects the real backlit profile portrait", () => {
    expect(
      isMiravaBacklit({
        luminance: 97.9,
        faceMedianLuminance: 98,
        backgroundHighlightRatio: 0.25,
        backlightDifference: 129,
      }),
    ).toBe(true)
  })

  it("accepts a properly exposed face on a white studio background", () => {
    expect(
      isMiravaBacklit({
        luminance: 136.5,
        faceMedianLuminance: 137,
        backgroundHighlightRatio: 0.7,
        backlightDifference: 108,
      }),
    ).toBe(false)
  })
  it("accepts a readable identity face in front of a bright white wall", () => {
    expect(
      isMiravaBacklit({
        luminance: 105,
        faceMedianLuminance: 110,
        backgroundHighlightRatio: 0.25,
        backlightDifference: 96,
      }),
    ).toBe(false)
  })

})


describe("MIRAVA red-eye classification", () => {
  it("rejects the measured flash portrait", () => {
    expect(isMiravaRedEye(0.413)).toBe(true)
  })

  it("keeps a conservative margin below the threshold", () => {
    expect(isMiravaRedEye(0.29)).toBe(false)
  })

  it("does not invent a verdict without a measurement", () => {
    expect(isMiravaRedEye(null)).toBe(false)
  })
})
