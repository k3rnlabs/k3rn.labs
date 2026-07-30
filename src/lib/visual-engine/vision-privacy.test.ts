import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA local vision privacy boundary", () => {
  const worker = readFileSync(path.resolve(process.cwd(), "src/components/studio/mirava-vision.worker.ts"), "utf8")
  const nextConfig = readFileSync(path.resolve(process.cwd(), "next.config.mjs"), "utf8")

  it("rejects every worker request outside the MIRAVA origin", () => {
    expect(worker).toContain('url.origin !== allowedOrigin')
    expect(worker).toContain("MIRAVA_EXTERNAL_VISION_REQUEST_BLOCKED")
    expect(worker).not.toContain("storage.googleapis.com")
  })

  it("restricts Visual Engine connections to the same origin in production", () => {
    expect(nextConfig).toContain('process.env.NODE_ENV === "development"')
    expect(nextConfig).toContain(': "\'self\'"')
    expect(nextConfig).toContain('`connect-src ${miravaConnectSources}`')
  })

  it("uses only self-hosted model and runtime paths", () => {
    expect(worker).toContain('"/visual-engine/vision/wasm"')
    expect(worker).toContain('"/visual-engine/vision/models/face_landmarker.task"')
    expect(worker).toContain('"/visual-engine/vision/models/pose_landmarker_lite.task"')
  })
})
