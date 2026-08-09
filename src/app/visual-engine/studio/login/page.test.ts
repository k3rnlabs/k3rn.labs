import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA login continuation contract", () => {
  const login = readFileSync(
    path.resolve(
      process.cwd(),
      "src/app/visual-engine/studio/login/page.tsx",
    ),
    "utf8",
  )

  it("only accepts a safe internal Studio destination and keeps it after authentication", () => {
    expect(login).toContain(
      'next?.startsWith("/")',
    )
    expect(login).toContain(
      'pathname === "/visual-engine/studio"',
    )
    expect(login).toContain(
      'const studioDestination = getStudioDestination(searchParams.get("next"))',
    )
    expect(login).toContain(
      "router.push(studioDestination)",
    )
  })

  it("keeps one clear account-mode switch while preserving password recovery", () => {
    expect(login).toContain(
      '(["login", "signup"] as Mode[]).map',
    )
    expect(login).toContain(
      'mode !== "forgot" ? (',
    )
    expect(login).toContain(
      'setMode("forgot")',
    )
    expect(login).toContain(
      "{t.backToLogin}",
    )
  })

  it("keeps the authentication shell safe inside narrow mobile viewports", () => {
    expect(login).toContain(
      "min-h-svh min-w-0 flex-col overflow-x-hidden",
    )
    expect(login).toContain(
      "grid grid-cols-2 gap-1",
    )
    expect(login).toContain(
      "mirava-input min-h-14 w-full",
    )
    expect(login).toContain(
      "data-mirava-auth-cta",
    )
    expect(login).toContain(
      "min-h-14 w-full",
    )
  })
})
