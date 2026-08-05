import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA analytics consent", () => {
  const provider = readFileSync(
    path.resolve(process.cwd(), "src/app/posthog-provider.tsx"),
    "utf8",
  )
  const guard = readFileSync(
    path.resolve(process.cwd(), "src/lib/mirava/analytics-consent.client.ts"),
    "utf8",
  )

  it("does not initialize or capture before an explicit opt-in", () => {
    expect(provider).toContain('next !== "accepted"')
    expect(provider).toContain("autocapture: false")
    expect(provider).toContain("disable_session_recording: true")
    expect(provider).toContain('person_profiles: "never"')
    expect(guard).toContain('readMiravaAnalyticsConsent() !== "accepted"')
  })

  it("offers refusal and acceptance with separate actions", () => {
    expect(provider).toContain('setMiravaAnalyticsConsent("refused")')
    expect(provider).toContain('setMiravaAnalyticsConsent("accepted")')
  })
})
