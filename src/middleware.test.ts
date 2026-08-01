import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA middleware boundary", () => {
  const middleware = readFileSync(path.resolve(process.cwd(), "src/middleware.ts"), "utf8")

  it("lets MIRAVA API routes reach their dedicated ownership and cache controls", () => {
    expect(middleware).toContain('path.startsWith("/api/visual-engine/")')
    expect(middleware).toContain('return NextResponse.next()')
  })

  it("keeps the self-hosted local vision runtime available before authentication", () => {
    expect(middleware).toContain('path.startsWith("/visual-engine/vision/")')
  })

  it("keeps every private MIRAVA API route behind its own session check", () => {
    const privateRoutes = [
      "src/app/api/visual-engine/account/route.ts",
      "src/app/api/visual-engine/billing/checkout/route.ts",
      "src/app/api/visual-engine/billing/portal/route.ts",
      "src/app/api/visual-engine/creations/route.ts",
      "src/app/api/visual-engine/creations/[id]/route.ts",
      "src/app/api/visual-engine/creations/[id]/analyze/route.ts",
      "src/app/api/visual-engine/creations/[id]/assets/route.ts",
      "src/app/api/visual-engine/creations/[id]/creative-options/route.ts",
      "src/app/api/visual-engine/creations/[id]/generate/route.ts",
      "src/app/api/visual-engine/creations/[id]/result/route.ts",
      "src/app/api/visual-engine/creative-director/route.ts",
      "src/app/api/visual-engine/identity-profile/route.ts",
      "src/app/api/visual-engine/onboarding/route.ts",
      "src/app/api/visual-engine/push-subscriptions/route.ts",
      "src/app/api/visual-engine/studios/route.ts",
      "src/app/api/visual-engine/studios/[id]/creations/route.ts",
    ]

    for (const routePath of privateRoutes) {
      const route = readFileSync(path.resolve(process.cwd(), routePath), "utf8")
      expect(route, routePath).toContain("verifySession")
    }
  })
})
