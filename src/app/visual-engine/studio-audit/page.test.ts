import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA local visual-audit harness", () => {
  it("is unavailable from every deployed environment", () => {
    const page = readFileSync(path.resolve(process.cwd(), "src/app/visual-engine/studio-audit/page.tsx"), "utf8")

    expect(page).toContain('if (process.env.NODE_ENV !== "development") notFound()')
    expect(page).toContain('import { notFound } from "next/navigation"')
  })
})
