import {
  readFileSync,
} from "node:fs"
import path from "node:path"
import {
  describe,
  expect,
  it,
} from "vitest"

describe("MIRAVA high-fidelity identity upload client", () => {
  const source = readFileSync(
    path.resolve(
      process.cwd(),
      "src/lib/mirava/identity-profile-upload.client.ts",
    ),
    "utf8",
  )

  it("keeps a high-resolution identity master", () => {
    expect(source).toContain(
      "MIRAVA_IDENTITY_MASTER_MAX_LONG_EDGE = 4096",
    )
    expect(source).toContain(
      "MIRAVA_IDENTITY_MASTER_MIN_QUALITY = 0.92",
    )
    expect(source).toContain("0.97")
    expect(source).toContain(
      'imageSmoothingQuality = "high"',
    )
  })

  it("uploads each master directly with a signed Supabase token", () => {
    expect(source).toContain(
      "uploadToSignedUrl(",
    )
    expect(source).toContain(
      "/identity-profile/upload-session",
    )
    expect(source).toContain(
      'mode: "replace-staged"',
    )
    expect(source).not.toContain(
      "new FormData()",
    )
  })
})
