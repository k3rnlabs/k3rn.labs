import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA push payload privacy contract", () => {
  const push = readFileSync(path.resolve(process.cwd(), "src/lib/visual-engine/push.ts"), "utf8")

  it("keeps the ready notification generic and localized", () => {
    expect(push).toContain('record.locale === "es" ? "Tu creación está lista" : "Votre création est prête"')
    expect(push).toContain('JSON.stringify({ title: "MIRAVA Studio", body, locale: record.locale === "es" ? "es" : "fr", url: "/visual-engine/studio" })')
    expect(push).not.toContain("?creation=")
    expect(push).not.toContain("masterPrompt")
    expect(push).not.toContain("creativeDirectionSummary")
  })
})
