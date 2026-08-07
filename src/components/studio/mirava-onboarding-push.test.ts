import {
  readFileSync,
} from "node:fs"
import path from "node:path"
import {
  describe,
  expect,
  it,
} from "vitest"

describe(
  "MIRAVA onboarding push opt-in",
  () => {
    const onboarding = readFileSync(
      path.resolve(
        process.cwd(),
        "src/components/studio/mirava-studio-onboarding.tsx",
      ),
      "utf8",
    )

    const pwa = readFileSync(
      path.resolve(
        process.cwd(),
        "src/components/mirava/mirava-pwa.tsx",
      ),
      "utf8",
    )

    it(
      "asks for notifications before leaving the onboarding activation step",
      () => {
        expect(onboarding).toContain(
          "data-mirava-onboarding-push",
        )
        expect(onboarding).toContain(
          "Recevoir mes images dès qu’elles sont prêtes",
        )
        expect(onboarding).toContain(
          "Recibir mis imágenes en cuanto estén listas",
        )
        expect(onboarding).toContain(
          "Activer les notifications",
        )
        expect(onboarding).toContain(
          "Activar las notificaciones",
        )
        expect(onboarding).toContain(
          "Plus tard",
        )
        expect(onboarding).toContain(
          "Más tarde",
        )
      },
    )

    it(
      "keeps notification permission behind an explicit user action",
      () => {
        expect(onboarding).toContain(
          "void activateOnboardingPush()",
        )
        expect(onboarding).toContain(
          "await enableMiravaPush(locale)",
        )
        expect(pwa).toContain(
          "Notification.requestPermission()",
        )
        expect(onboarding).not.toContain(
          "Notification.requestPermission()",
        )
      },
    )

    it(
      "handles iPhone install and existing subscriptions without duplicate push subscriptions",
      () => {
        expect(pwa).toContain(
          'window.matchMedia(\n      "(display-mode: standalone)"',
        )
        expect(pwa).toContain(
          '"requires_install"',
        )
        expect(pwa).toContain(
          ".getSubscription()",
        )
        expect(pwa).toContain(
          "existing ??",
        )
        expect(onboarding).toContain(
          "<MiravaInstallButton",
        )
        expect(onboarding).toContain(
          "Continuer sans notifications",
        )
        expect(onboarding).toContain(
          "Continuar sin notificaciones",
        )
      },
    )
  },
)
