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
  "MIRAVA contextual credit sheet",
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
      "opens the purchase sheet without navigating away from the active flow",
      () => {
        const start =
          studio.indexOf(
            "const openCreditOffers =",
          )
        const end =
          studio.indexOf(
            "const openDirector =",
            start,
          )

        expect(start).toBeGreaterThanOrEqual(0)
        expect(end).toBeGreaterThan(start)

        const openCreditOffers =
          studio.slice(start, end)

        expect(openCreditOffers).toContain(
          "setCreditSheetOpen(true)",
        )
        expect(openCreditOffers).toContain(
          "setCreditSheetRequiredCredits",
        )
        expect(openCreditOffers).not.toContain(
          'selectView("account")',
        )
        expect(openCreditOffers).not.toContain(
          "scrollIntoView",
        )
      },
    )

    it(
      "uses one contextual sheet from every credit recovery entry point",
      () => {
        expect(studio).toContain(
          "function CreditPurchaseSheet",
        )
        expect(studio).toContain(
          "data-mirava-credit-sheet",
        )
        expect(studio).toContain(
          "openCreditOffers(0)",
        )
        expect(studio).toContain(
          "Recharger pour continuer",
        )
        expect(studio).toContain(
          "Recharger pour créer",
        )
      },
    )

    it(
      "keeps the account focused on balance and plan management",
      () => {
        const accountStart =
          studio.indexOf(
            "function AccountView",
          )
        const accountEnd =
          studio.indexOf(
            "function CreditPurchaseSheet",
            accountStart,
          )
        const account =
          studio.slice(
            accountStart,
            accountEnd,
          )

        expect(account).toContain(
          "data-mirava-account-billing",
        )
        expect(account).toContain(
          "Ajouter des crédits",
        )
        expect(account).toContain(
          "Gérer ma formule",
        )
        expect(account).not.toContain(
          'id="mirava-credit-offers"',
        )
        expect(account).not.toContain(
          "<Offers",
        )
        expect(account).not.toContain(
          '"CRÉDITS & ACCÈS"',
        )
      },
    )

    it(
      "reuses the darkroom visual language in the purchase surface",
      () => {
        const sheetStart =
          studio.indexOf(
            "function CreditPurchaseSheet",
          )
        const sheetEnd =
          studio.indexOf(
            "function DesktopNavButton",
            sheetStart,
          )
        const sheet =
          studio.slice(
            sheetStart,
            sheetEnd,
          )

        expect(sheet).toContain(
          "data-mirava-credit-darkroom",
        )
        expect(sheet).toContain(
          "<Grainient",
        )
        expect(sheet).toContain(
          'color1="#b49a68"',
        )
        expect(sheet).toContain(
          "MIRAVA / CHAMBRE NOIRE",
        )
        expect(sheet).toContain(
          "Séance conservée",
        )
      },
    )


    it(
      "keeps the sheet modal and restores focus to its trigger",
      () => {
        expect(studio).toContain(
          "const creditSheetTriggerRef = useRef<HTMLElement | null>(null)",
        )
        expect(studio).toContain(
          "consentTarget !== undefined ||\n    creditSheetOpen",
        )
        expect(studio).toContain(
          "onCloseAutoFocus={(event) => {",
        )
        expect(studio).toContain(
          "creditSheetTriggerRef.current?.focus()",
        )
        expect(studio).toContain(
          "setCreditSheetHighlightedOfferId(",
        )
        expect(studio).toContain(
          "setHighlightedOfferId(null)",
        )
      },
    )


    it(
      "resets purchase scrolling and keeps offer navigation visible",
      () => {
        expect(studio).toContain(
          "const offerScrollRef =",
        )
        expect(studio).toContain(
          "ref={offerScrollRef}",
        )
        expect(studio).toContain(
          "offerScrollRef.current?.scrollTo({",
        )
        expect(studio).toContain(
          '"sticky top-0 z-20 grid',
        )
        expect(studio).toContain(
          "localizedOfferName(",
        )
        expect(studio).toContain(
          '"MIRAVA / CHAMBRE NOIRE"',
        )
        expect(studio).toContain(
          "onOpenAutoFocus={(event) => {",
        )
      },
    )

    it(
      "structures packs and subscriptions behind an explicit selection",
      () => {
        expect(studio).toContain(
          'id: "pack"',
        )
        expect(studio).toContain(
          'id: "subscription"',
        )
        expect(studio).toContain(
          "Le plus choisi",
        )
        expect(studio).toContain(
          "Meilleure valeur",
        )
        expect(studio).toContain(
          "Ajouter ${selectedOffer.credits} crédits",
        )
      },
    )

    it(
      "still blocks reuse and continuation before credits are consumed",
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
