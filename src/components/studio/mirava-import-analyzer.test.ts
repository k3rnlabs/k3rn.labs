import { describe, expect, it } from "vitest"
import { classifyMiravaFaceYaw } from "./mirava-import-analyzer"

describe("MIRAVA imported identity classification", () => {
  it("maps only confident face angles to the three required slots", () => {
    expect(classifyMiravaFaceYaw(0.02)).toBe("front")
    expect(classifyMiravaFaceYaw(0.24)).toBe("left")
    expect(classifyMiravaFaceYaw(-0.31)).toBe("right")
  })

  it("rejects ambiguous and excessive rotations", () => {
    expect(classifyMiravaFaceYaw(0.145)).toBeNull()
    expect(classifyMiravaFaceYaw(-0.145)).toBeNull()
    expect(classifyMiravaFaceYaw(0.55)).toBeNull()
    expect(classifyMiravaFaceYaw(null)).toBeNull()
  })
})
