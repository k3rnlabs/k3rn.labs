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

  it("keeps the authentication shell inside a narrow mobile viewport", () => {
    expect(login).toContain('flex min-h-dvh min-w-0 flex-col overflow-x-clip')
    expect(login).toContain('flex min-w-0 items-center justify-between gap-3')
    expect(login).toContain('min-w-0 w-full max-w-sm')
    expect(login).toContain('grid min-w-0 grid-cols-2')
    expect(login).toContain('min-w-0 w-full rounded-[10px] px-2 py-2 text-center')
    expect(login).toContain('flex min-w-0 flex-col items-start gap-1.5 sm:flex-row')
    expect(login).toContain('min-h-11 -ml-2 px-2 text-left')
  })
})
