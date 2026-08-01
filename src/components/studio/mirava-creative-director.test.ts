import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA Alma dialog contracts", () => {
  const director = readFileSync(
    path.resolve(process.cwd(), "src/components/studio/mirava-creative-director.tsx"),
    "utf8",
  )

  it("keeps its message history keyboard-reachable and named", () => {
    expect(director).toContain('role="region" tabIndex={0} aria-label={locale === "fr" ? "Historique de conversation avec Alma"')
  })

  it("lets Radix connect the description without overriding its generated id", () => {
    expect(director).toContain("<DialogPrimitive.Description className=\"sr-only\">")
    expect(director).not.toContain("alma-dialog-description")
  })

  it("keeps Alma's first mobile message focused on the next useful action", () => {
    expect(director).toContain("Décrivez l’ambiance, le lieu ou l’énergie que vous imaginez")
    expect(director).toContain("direction à appliquer à votre séance")
    expect(director).not.toContain("Haute Couture ou Personal Branding")
  })

  it("marks the full-screen conversation with the selected language", () => {
    expect(director).toContain('<DialogPrimitive.Content lang={locale}')
  })
})
