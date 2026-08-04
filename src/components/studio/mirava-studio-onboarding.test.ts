import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { MIRAVA_ONBOARDING_STEPS } from "@/lib/mirava/onboarding"

describe("MIRAVA onboarding localization contracts", () => {
  const onboarding = readFileSync(
    path.resolve(process.cwd(), "src/components/studio/mirava-studio-onboarding.tsx"),
    "utf8",
  )

  const mobilePrimitives = readFileSync(
    path.resolve(process.cwd(), "src/components/studio/mirava-mobile-primitives.tsx"),
    "utf8",
  )
  const floatingShellStyles = readFileSync(
    path.resolve(process.cwd(), "src/components/studio/mirava-floating-shell.css"),
    "utf8",
  )

  it("localizes every visible onboarding section label", () => {
    expect(onboarding).toContain('promise: "Votre studio photo personnel, guidé de la direction au premier résultat."')
    expect(onboarding).toContain('promise: "Tu estudio fotográfico personal, guiado desde la dirección hasta el primer resultado."')
    expect(onboarding).toContain('objectiveCta: "Choisir mes univers"')
    expect(onboarding).toContain('objectiveCta: "Elegir mis universos"')
    expect(onboarding).toContain('autoFocus autoComplete="given-name"')
  })

  it("honors an editorial universe chosen before the onboarding begins", () => {
    expect(onboarding).toContain("initialUniverseId?: string")
    expect(onboarding).toContain("initialUniverseId && getMiravaUniverse(initialUniverseId) ? [initialUniverseId] : []")
  })

  it("makes both identity routes clear before the user chooses to create a profile", () => {
    expect(onboarding).toContain("3 vues essentielles · environ 2 minutes")
    expect(onboarding).toContain("3 vistas esenciales · unos 2 minutos")
    expect(onboarding).toContain("remplacer ou les supprimer")
    expect(onboarding).toContain("sustituirlas o eliminarlas")
  })

  it("saves meaningful progress and records only non-sensitive onboarding analytics", () => {
    expect(onboarding).toContain('action: "progress"')
    expect(onboarding).toContain('objective_selected')
    expect(onboarding).toContain('onboarding_step_viewed')
    expect(onboarding).toContain('onboarding_activated')
    expect(onboarding).toContain('MIRAVA_ONBOARDING_STEPS[Math.max(0, step - 1)]')
    expect(onboarding).toContain('useReducedMotion')
    expect(onboarding).not.toContain('posthog.capture("objective_selected", { firstName')
    expect(onboarding).toContain('onCompleted(data.onboarding, name.trim())')
  })

  it("persists backward edits and uses the latest server state for activation", () => {
    expect(onboarding).toContain("await persist(target)")
    expect(onboarding).toContain("setOnboardingState(data.onboarding)")
    expect(onboarding).toContain('onboardingState?.status === "session_ready"')
    expect(onboarding).not.toContain('consequence.split(" · ")')
  })

  it("exposes the onboarding sequence as an actual progress indicator", () => {
    expect(onboarding).toContain('role="progressbar"')
    expect(onboarding).toContain('aria-valuemin={1}')
    expect(onboarding).toContain('aria-valuemax={6}')
    expect(onboarding).toContain('aria-valuenow={step + 1}')
  })

  it("marks its content with the selected language for assistive technology", () => {
    expect(onboarding).toContain('<section lang={locale} className="mirava-studio-onboarding-v3"')
  })

  it("moves each new onboarding step to the top and into keyboard focus", () => {
    expect(onboarding).toContain('window.scrollTo({ top: 0, left: 0, behavior: "auto" })')
    expect(onboarding).toContain('panelRef.current?.focus({ preventScroll: true })')
    expect(onboarding).toContain('window.scrollTo({ top: 0, left: 0, behavior: "auto" })')
    expect(onboarding).toContain('key={stepId} tabIndex={-1}')
  })

  it("confirms the goal, then auto-advances briefly while keeping back navigation", () => {
    expect(onboarding).toContain('objectiveCta: "Choisir mes univers"')
    expect(onboarding).toContain('objectiveCta: "Elegir mis universos"')
    expect(onboarding).toContain('stepId === "objective" ? labels.objectiveCta')
    expect(onboarding).toContain('stepId === "objective" ? Boolean(goal)')
    expect(onboarding).toContain("window.setTimeout")
    expect(onboarding).toContain("360")
    expect(onboarding).toContain('void persist("visual_universes", { goal: choice })')
  })

  it("keeps direction, identity and activation in the actual production order", () => {
    expect(MIRAVA_ONBOARDING_STEPS).toEqual([
      "promise_name", "objective", "visual_universes", "direction_review", "identity_permission", "capture_activation",
    ])
    expect(onboarding).toContain('action: "activate"')
  })

  it("explains the three-universe limit instead of silently ignoring a fourth choice", () => {
    expect(onboarding).toContain('universeLimit: "Trois univers maximum. Retirez-en un pour en choisir un autre."')
    expect(onboarding).toContain('universeLimit: "Máximo tres universos. Elimina uno para elegir otro."')
    expect(onboarding).toContain('setUniverseLimitNotice(labels.universeLimit)')
    expect(onboarding).toContain('role="status">{universeLimitNotice}</p>')
  })

  it("keeps the mobile header and action dock as isolated floating glass capsules", () => {
    const headerFrame = mobilePrimitives.match(/<header className="([^"]*mirava-floating-header-frame[^"]*)"/)?.[1] ?? ""
    const actionFrame = onboarding.match(/<footer className="([^"]*mirava-floating-action-frame[^"]*)"/)?.[1] ?? ""

    expect(headerFrame).toContain("fixed")
    expect(headerFrame).not.toContain("bg-gradient")
    expect(headerFrame).not.toContain("backdrop-blur")
    expect(actionFrame).toContain("fixed")
    expect(actionFrame).not.toContain("bg-gradient")
    expect(actionFrame).not.toContain("backdrop-blur")

    expect(mobilePrimitives).toContain("mirava-onboarding-mobile-scroll")
    expect(mobilePrimitives).toContain("mirava-floating-header-glass")
    expect(onboarding).toContain("mirava-floating-action-glass")
    expect(floatingShellStyles).toContain("background: transparent !important")
    expect(floatingShellStyles).toContain("backdrop-filter: none !important")
    expect(floatingShellStyles).toContain("-webkit-backdrop-filter: none !important")
    expect(floatingShellStyles).toContain("background-image: none !important")
  })
})
