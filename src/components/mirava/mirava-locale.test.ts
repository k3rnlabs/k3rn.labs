import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA locale hydration contract", () => {
  const locale = readFileSync(
    path.resolve(process.cwd(), "src/components/mirava/mirava-locale.ts"),
    "utf8",
  )

  it("signals when remembered language resolution is complete", () => {
    expect(locale).toContain('const [isReady, setIsReady] = useState(false)')
    expect(locale).toContain("setIsReady(true)")
    expect(locale).toContain("return { locale, setLocale, isReady }")
  })
})
