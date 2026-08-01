import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA onboarding localization contracts", () => {
  const onboarding = readFileSync(
    path.resolve(process.cwd(), "src/components/studio/mirava-studio-onboarding.tsx"),
    "utf8",
  )

  it("localizes every visible onboarding section label", () => {
    expect(onboarding).toContain('promise: "Une même identité. Plusieurs univers."')
    expect(onboarding).toContain('promise: "Una misma identidad. Varios universos."')
    expect(onboarding).toContain('direction: "Votre studio prend forme, {name}."')
    expect(onboarding).toContain('direction: "Tu estudio toma forma, {name}."')
    expect(onboarding).toContain('autoFocus autoComplete="given-name" aria-required="true" maxLength={48}')
  })

  it("honors an editorial universe chosen before the onboarding begins", () => {
    expect(onboarding).toContain("initialUniverseId?: string")
    expect(onboarding).toContain("initialUniverseId && getMiravaUniverse(initialUniverseId) ? [initialUniverseId] : []")
  })

  it("makes both identity routes clear before the user chooses to create a profile", () => {
    expect(onboarding).toContain("capture guidée ou import depuis votre galerie")
    expect(onboarding).toContain("captura guiada o importación desde tu galería")
  })

  it("saves meaningful progress and records only non-sensitive onboarding analytics", () => {
    expect(onboarding).toContain('action: "progress"')
    expect(onboarding).toContain('onboarding_resumed')
    expect(onboarding).toContain('onboarding_answer_submitted')
    expect(onboarding).toContain('onboarding_completed')
    expect(onboarding).toContain('MIRAVA_ONBOARDING_STEPS[step]')
    expect(onboarding).toContain('useReducedMotion')
    expect(onboarding).not.toContain('posthog.capture("onboarding_answer_selected", { firstName')
    expect(onboarding).toContain('onCompleted(data.onboarding, name.trim())')
  })

  it("exposes the onboarding sequence as an actual progress indicator", () => {
    expect(onboarding).toContain('role="progressbar"')
    expect(onboarding).toContain('aria-valuemin={1}')
    expect(onboarding).toContain('aria-valuemax={8}')
    expect(onboarding).toContain('aria-valuenow={step + 1}')
  })

  it("marks its content with the selected language for assistive technology", () => {
    expect(onboarding).toContain('<section lang={locale} className="mirava-studio-onboarding"')
  })

  it("moves each new onboarding step to the top and into keyboard focus", () => {
    expect(onboarding).toContain('window.scrollTo({ top: 0, left: 0, behavior: "auto" })')
    expect(onboarding).toContain('const focusTimer = window.setTimeout(')
    expect(onboarding).toContain('stepPanelRef.current?.focus({ preventScroll: true })')
    expect(onboarding).toContain('role="region" aria-label={labels.phase[step]} tabIndex={-1}')
  })
})
