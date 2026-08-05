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
  const miravaStyles = readFileSync(
    path.resolve(process.cwd(), "src/styles/mirava.css"),
    "utf8",
  )

  it("localizes every visible onboarding section label", () => {
    expect(onboarding).toContain(
      "Votre studio photo personnel, guidé de la direction au premier résultat.",
    )
    expect(onboarding).toContain(
      "Tu estudio fotográfico personal, guiado desde la dirección hasta el primer resultado.",
    )
    expect(onboarding).toContain(
      "Choisir mes univers",
    )
    expect(onboarding).toContain(
      "Elegir mis universos",
    )
    expect(onboarding).toContain('autoFocus autoComplete="given-name"')
  })

  it("honors an editorial universe chosen before the onboarding begins", () => {
    expect(onboarding).toContain("initialUniverseId?: string")
    expect(onboarding).toContain("initialUniverseId &&")
    expect(onboarding).toContain("getMiravaUniverse(")
  })

  it("makes both identity routes clear before the user chooses to create a profile", () => {
    expect(onboarding).toContain("3 vues essentielles · environ 2 minutes")
    expect(onboarding).toContain("3 vistas esenciales · unos 2 minutos")
    expect(onboarding).toContain("remplacer ou les supprimer")
    expect(onboarding).toContain("sustituirlas o eliminarlas")
  })

  it("separates contractual acceptance from explicit identity processing consent", () => {
    expect(onboarding).toContain("const [termsAccepted")
    expect(onboarding).toContain("termsAccepted: true")
    expect(onboarding).toContain("identityConsentAccepted: true")
    expect(onboarding).toContain("Je consens explicitement au traitement de mes photos de visage")
    expect(onboarding).toContain("J’accepte les Conditions d’utilisation de MIRAVA")
  })

  it("saves meaningful progress and records only non-sensitive onboarding analytics", () => {
    expect(onboarding).toContain('action: "progress"')
    expect(onboarding).toContain('objective_selected')
    expect(onboarding).toContain('onboarding_step_viewed')
    expect(onboarding).toContain('onboarding_activated')
    expect(onboarding).toContain('MIRAVA_ONBOARDING_STEPS[Math.max(0, step - 1)]')
    expect(onboarding).toContain('useReducedMotion')
    expect(onboarding).not.toContain('posthog.capture("objective_selected", { firstName')
    expect(onboarding).toMatch(
      /onCompleted\(\s*data\.onboarding,\s*name\.trim\(\),?\s*\)/,
    )
  })

  it("bypasses the Vercel media payload limit with signed direct uploads", () => {
    expect(onboarding).toContain(
      "uploadMiravaIdentityProfile",
    )
    expect(onboarding).toContain(
      "files,",
    )
    expect(onboarding).toContain(
      "consent,",
    )
    expect(onboarding).not.toContain(
      'form.append("file"',
    )
  })

  it("keeps activation linear and truthful after identity upload", () => {
    expect(onboarding).toContain(
      "activationRequestRef",
    )
    expect(onboarding).toContain(
      "activationPreparing",
    )
    expect(onboarding).toContain(
      "photos réellement enregistrées",
    )
    expect(onboarding).toContain(
      "Préparation de ma séance…",
    )
    expect(onboarding).not.toContain(
      'const isDone = onboardingState?.status === "session_ready" || slot.number === 1',
    )
    expect(onboarding).not.toContain(
      "Ajouter ou modifier mes photos",
    )
    expect(onboarding).not.toContain(
      "onStartCapture(saved)",
    )
  })

  it("sends the complete onboarding state when the identity profile is finalized", () => {
    expect(onboarding).toContain(
      'const saved = await persist(\n                          "capture_activation"',
    )
    expect(onboarding).toContain("goal,")
    expect(onboarding).toContain("universeIds,")
    expect(onboarding).toContain("direction,")
    expect(onboarding).toContain(
      "identityConsentAccepted: true",
    )
    expect(onboarding).toContain(
      "[mirava-onboarding] progress_failed",
    )
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
    expect(onboarding).toContain('aria-valuemax={8}')
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
    expect(onboarding).toContain(
      'className="mirava-onboarding-step-panel outline-none"',
    )
    expect(miravaStyles).toContain(
      ".mirava-theme .mirava-onboarding-step-panel:focus-visible",
    )
    expect(miravaStyles).toMatch(
      /\.mirava-theme \.mirava-onboarding-step-panel:focus-visible\s*\{\s*outline: none;/,
    )
  })

  it("confirms the goal, then auto-advances briefly while keeping back navigation", () => {
    expect(onboarding).toContain(
      "Choisir mes univers",
    )
    expect(onboarding).toContain(
      "Elegir mis universos",
    )
    expect(onboarding).toMatch(
      /stepId === "objective"\s*\? labels\.objectiveCta/,
    )
    expect(onboarding).toMatch(
      /stepId === "objective"\s*\? Boolean\(goal\)/,
    )
    expect(onboarding).toContain("window.setTimeout")
    expect(onboarding).toContain("360")
    expect(onboarding).toContain('void persist("visual_universes", { goal: choice })')
  })

  it("keeps direction, identity and activation in the actual production order", () => {
    expect(MIRAVA_ONBOARDING_STEPS).toEqual([
      "promise_name", "objective", "visual_universes", "first_universe", "session_intent", "direction_review", "identity_permission", "capture_activation",
    ])
    expect(onboarding).toMatch(
      /action:\s*"activate"/,
    )
  })

  it("separates favorite universes from the explicit first-session choice", () => {
    expect(onboarding).toContain(
      'stepId === "first_universe"',
    )
    expect(onboarding).toContain(
      'stepId === "session_intent"',
    )
    expect(onboarding).toContain(
      "first_universe_selected",
    )
    expect(onboarding).toContain(
      "session_type_selected",
    )
    expect(onboarding).toContain(
      "2,99 € TTC",
    )
    expect(onboarding).not.toContain(
      "const primaryUniverseId = universeIds[0]",
    )
  })

  it("explains the three-universe limit instead of silently ignoring a fourth choice", () => {
    expect(onboarding).toContain(
      "Trois univers maximum. Retirez-en un pour en choisir un autre.",
    )
    expect(onboarding).toContain(
      "Máximo tres universos. Elimina uno para elegir otro.",
    )
    expect(onboarding).toMatch(
      /setUniverseLimitNotice\(\s*labels\.universeLimit,?\s*\)/,
    )
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
