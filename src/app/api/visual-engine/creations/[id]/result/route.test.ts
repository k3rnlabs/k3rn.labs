import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA private result response policy", () => {
  const route = readFileSync(
    path.resolve(process.cwd(), "src/app/api/visual-engine/creations/[id]/result/route.ts"),
    "utf8"
  )

  it("does not cache result media or any response that reveals its existence", () => {
    expect(route).toContain('const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache" }')
    expect(route).toContain('status: 401, headers: PRIVATE_NO_STORE_HEADERS')
    expect(route).toContain('status: 404, headers: PRIVATE_NO_STORE_HEADERS')
    expect(route).toContain('headers: PRIVATE_NO_STORE_HEADERS')
  })
})
