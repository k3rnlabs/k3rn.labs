import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { classifyMiravaFaceYaw } from "./mirava-import-analyzer"

describe("MIRAVA imported identity classification", () => {
  const analyzer = readFileSync(path.resolve(process.cwd(), "src/components/studio/mirava-import-analyzer.ts"), "utf8")

  it("maps only confident face angles to the three required slots", () => {
    expect(classifyMiravaFaceYaw(0.02)).toBe("front")
    expect(classifyMiravaFaceYaw(-0.24)).toBe("left")
    expect(classifyMiravaFaceYaw(0.31)).toBe("right")
  })

  it("rejects ambiguous and excessive rotations", () => {
    expect(classifyMiravaFaceYaw(0.145)).toBeNull()
    expect(classifyMiravaFaceYaw(-0.145)).toBeNull()
    expect(classifyMiravaFaceYaw(0.55)).toBeNull()
    expect(classifyMiravaFaceYaw(null)).toBeNull()
  })

  it("decodes MediaPipe frames in EXIF-correct visual orientation", () => {
    expect(analyzer).toContain(
      'imageOrientation:',
    )

    expect(analyzer).toContain(
      '"from-image"',
    )
  })

  it("uses the standalone local vision worker for browser imports", () => {
    expect(analyzer).toContain('new Worker("/visual-engine/vision/mirava-vision.worker.js", { type: "module" })')
  })

  it(
    "uses dedicated reference-face analysis without weakening identity capture",
    () => {
      expect(analyzer).toContain(
        "REFERENCE_FACE_ANALYSIS_EDGE",
      )

      expect(analyzer).toContain(
        "2048",
      )

      const start =
        analyzer.indexOf(
          "export async function analyzeMiravaReferenceFaceGeometry",
        )

      const end =
        analyzer.indexOf(
          "export async function analyzeMiravaIdentityPhoto",
          start,
        )

      const helper =
        analyzer.slice(
          start,
          end,
        )

      expect(helper).toContain(
        '"reference-face"',
      )

      /*
       * Documentation may mention result.ready.
       * What matters is that readiness is never used
       * as a gate for artistic-reference geometry.
       */
      expect(helper).not.toMatch(
        /if\s*\([^)]*result\.ready/,
      )

      expect(helper).not.toMatch(
        /result\.ready\s*\?/,
      )

      expect(helper).not.toMatch(
        /result\.ready\s*&&/,
      )
    },
  )


  it(
    "gives artistic-reference analysis a dedicated cold-start timeout",
    () => {
      expect(analyzer).toMatch(
        /const REFERENCE_FACE_TIMEOUT_MS\s*=\s*60_000/,
      )

      expect(analyzer).toMatch(
        /mode\s*===\s*"reference-face"[\s\S]*?\?\s*REFERENCE_FACE_TIMEOUT_MS[\s\S]*?:\s*ANALYSIS_TIMEOUT_MS/,
      )

      expect(
        analyzer.match(
          /timeoutMs/g,
        )?.length,
      ).toBeGreaterThanOrEqual(
        3,
      )

      expect(analyzer).toMatch(
        /const ANALYSIS_TIMEOUT_MS\s*=\s*20_000/,
      )
    },
  )

})
