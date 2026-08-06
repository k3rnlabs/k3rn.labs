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
  "MIRAVA credit recovery UX",
  () => {
    const studio =
      readFileSync(
        path.resolve(
          process.cwd(),
          "src/components/studio/visual-engine-studio.tsx",
        ),
        "utf8",
      )

    it(
      "makes the header balance actionable",
      () => {
        expect(studio).toContain(
          "const openCreditOffers =",
        )

        expect(studio).toContain(
          "0 crédit · Recharger",
        )

        expect(studio).toContain(
          "0 créditos · Recargar",
        )

        expect(studio).toContain(
          "Aucun crédit disponible. Recharger mes crédits.",
        )
      },
    )

    it(
      "turns blocked progression into a recharge action",
      () => {
        expect(studio).toContain(
          "Recharger pour continuer",
        )

        expect(studio).toContain(
          "Recharger pour créer",
        )

        expect(studio).toContain(
          "Vous n’avez plus de crédits.",
        )

        expect(studio).toContain(
          "Recharger maintenant",
        )
      },
    )

    it(
      "provides an immediate account CTA",
      () => {
        expect(studio).toContain(
          "Votre solde est épuisé.",
        )

        expect(studio).toContain(
          "Voir les recharges",
        )

        expect(studio).toContain(
          'id="mirava-credit-offers"',
        )

        expect(studio).toContain(
          "scrollToOffers",
        )
      },
    )

    it(
      "shows permanent packs before subscriptions",
      () => {
        const accountStart =
          studio.indexOf(
            "function AccountView",
          )

        const accountEnd =
          studio.indexOf(
            "function Offers",
            accountStart,
          )

        const account =
          studio.slice(
            accountStart,
            accountEnd,
          )

        expect(
          account.indexOf(
            "offers={account?.packs",
          ),
        ).toBeLessThan(
          account.indexOf(
            "offers={account?.plans",
          ),
        )
      },
    )

    it(
      "preflights reuse and continuation",
      () => {
        expect(studio).toContain(
          "creditBalance <\n      requiredCredits",
        )

        expect(studio).toContain(
          "if (creditBalance < 1)",
        )

        expect(studio).toContain(
          "return Promise.resolve(\n        false",
        )
      },
    )
  },
)
