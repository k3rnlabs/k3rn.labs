import { describe, expect, it } from "vitest"
import {
  isMiravaBodyTooClose,
  isMiravaBodyTooFar,
} from "./mirava-pose-quality"

describe("MIRAVA full-body framing", () => {
  it("accepts the tested full-body portrait occupying 57% of the image", () => {
    expect(isMiravaBodyTooFar(0.57)).toBe(false)
    expect(isMiravaBodyTooClose(0.57)).toBe(false)
  })

  it("rejects a genuinely distant silhouette", () => {
    expect(isMiravaBodyTooFar(0.42)).toBe(true)
  })

  it("rejects a silhouette cropped too tightly", () => {
    expect(isMiravaBodyTooClose(0.98)).toBe(true)
  })
})
