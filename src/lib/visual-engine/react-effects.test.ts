import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA creative director component contracts", () => {
  const creativeDirector = readFileSync(
    path.resolve(process.cwd(), "src/components/studio/mirava-creative-director.tsx"),
    "utf8",
  )

  it("does not return the scrollIntoView result as an effect cleanup", () => {
    expect(creativeDirector).toContain("useEffect(() => {\n    endRef.current?.scrollIntoView")
    expect(creativeDirector).not.toMatch(/useEffect\(\(\) =>\s*endRef\.current\?\.scrollIntoView/)
  })

  it("keeps one explicit exit and delegates starter actions to the structured pipeline", () => {
    expect(creativeDirector).toContain('Retour au studio')
    expect(creativeDirector).not.toContain('aria-label={locale === "fr" ? "Fermer"')
    expect(creativeDirector).toContain("DialogPrimitive.Content")
    expect(creativeDirector).toContain("getMiravaCreativeDirectorStarterActions")
    expect(creativeDirector).not.toContain("mirava-scroll-row")
  })
})
