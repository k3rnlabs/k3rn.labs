import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA PWA privacy policy", () => {
  const worker = readFileSync(path.resolve(process.cwd(), "public/visual-engine/sw.js"), "utf8")

  it("only pre-caches the public shell", () => {
    expect(worker).toContain('PUBLIC_SHELL = ["/visual-engine", "/visual-engine/offline"]')
    expect(worker).not.toContain("cache.put")
  })

  it("explicitly excludes APIs and private storage from cache handling", () => {
    expect(worker).toContain('url.pathname.startsWith("/api/")')
    expect(worker).toContain('url.pathname.startsWith("/storage/")')
  })
})
