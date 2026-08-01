import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { classifyMiravaFaceYaw } from "./mirava-import-analyzer"

describe("MIRAVA imported identity classification", () => {
  const analyzer = readFileSync(path.resolve(process.cwd(), "src/components/studio/mirava-import-analyzer.ts"), "utf8")

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

  it("uses the standalone local vision worker for browser imports", () => {
    expect(analyzer).toContain('new Worker("/visual-engine/vision/mirava-vision.worker.js", { type: "module" })')
  })
})
