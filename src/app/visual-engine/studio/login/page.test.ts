import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA login continuation contract", () => {
  const login = readFileSync(path.resolve(process.cwd(), "src/app/visual-engine/studio/login/page.tsx"), "utf8")

  it("only accepts a safe internal Studio destination and keeps it after authentication", () => {
    expect(login).toContain('next?.startsWith("/")')
    expect(login).toContain('pathname === "/visual-engine/studio"')
    expect(login).toContain('const studioDestination = getStudioDestination(searchParams.get("next"))')
    expect(login).toContain("router.push(studioDestination)")
  })

  it("keeps one clear account-mode switch while preserving the recovery return route", () => {
    expect(login).toContain('(["login", "signup"] as Mode[]).map')
    expect(login).toContain('{mode === "forgot" && (')
    expect(login).not.toContain('mode === "login" ? t.noAccount : t.hasAccount')
  })
})
