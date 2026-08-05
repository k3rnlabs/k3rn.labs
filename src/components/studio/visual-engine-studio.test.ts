import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA studio entry contracts", () => {
  const studio = readFileSync(
    path.resolve(process.cwd(), "src/components/studio/visual-engine-studio.tsx"),
    "utf8",
  )

  it("keeps the universe selected on the landing page when the studio opens", () => {
    expect(studio).toContain('getMiravaUniverse(params.get("preset"))')
    expect(studio).toContain("setSelectedUniverseId(requestedUniverse.id)")
  })

  it("preserves a landing choice while an unauthenticated visitor goes through login", () => {
    expect(studio).toContain('const authReturnPath = `${window.location.pathname}${window.location.search}`')
    expect(studio).toContain('window.location.replace(`/visual-engine/studio/login?next=${encodeURIComponent(authReturnPath)}`)')
    expect(studio).toContain("initialUniverseId={entryUniverseId}")
    expect(studio).toContain('entryIntent === "reference"')
    expect(studio).toContain("Votre studio commence avec votre photo d’inspiration")
  })

  it("keeps identity deletion behind an explicit, dismissible confirmation", () => {
    expect(studio).toContain(
      "open={deleteIdentityOpen}",
    )

    expect(studio).toContain(
      "Supprimer votre Profil identité ?",
    )

    expect(studio).toContain(
      "Toutes vos références d’identité privées seront supprimées immédiatement.",
    )

    expect(studio).toContain(
      "Garder mes photos",
    )

    expect(studio).toContain(
      "Supprimer définitivement",
    )

    expect(studio).toContain(
      "closeIdentityDeletionDialog",
    )
  })

  it("validates an onboarding universe before making it the active studio universe", () => {
    expect(studio).toContain("state.primaryUniverseId ??")
    expect(studio).toContain("setSelectedUniverseId(preferredUniverse.id)")
  })

  it("uses each onboarding choice in the first studio rather than collecting decorative data", () => {
    expect(studio).toContain("seriesSize: 1")
    expect(studio).toContain("only after the client has explicitly")
    expect(studio).toContain('body: JSON.stringify({ action: "session_ready", firstSessionId: session.creation.id })')
    expect(studio).toContain('onStartCapture={(state) => void startOrResumeOnboarding(state)}')
    expect(studio).toContain('captureContext === "onboarding" && (!consent?.privacyAccepted || !consent.openaiDisclosureAccepted)')
    expect(studio).toContain('rightsConfirmed: consent.rightsConfirmed')
    expect(studio).toContain('privacyAccepted: consent.privacyAccepted')
    expect(studio).toContain('openaiDisclosureAccepted: consent.openaiDisclosureAccepted')
    expect(studio).toContain('setMiravaFirstName(firstName)')
    expect(studio).toContain('setSelectedUniverseId(preferredUniverse.id)')
  })

  it("rechecks the durable identity profile before reopening capture", () => {
    expect(studio).toContain(
      'const latestProfile =',
    )
    expect(studio).toContain(
      '"/api/visual-engine/identity-profile"',
    )
    expect(studio).toContain(
      "setIdentityProfile(latestProfile.profile)",
    )
    expect(studio).toContain(
      "isMiravaIdentityProfileReady(\n          latestProfile.profile,",
    )
    expect(studio).not.toContain(
      "if (!isMiravaIdentityProfileReady(identityProfile)) {\n      openCapture",
    )
  })

  it("resumes an already prepared first session instead of duplicating it after a lost response", () => {
    expect(studio).toContain('const latestOnboarding = await api<{ onboarding: MiravaOnboardingState | null }>("/api/visual-engine/onboarding")')
    expect(studio).toContain('latestOnboarding.onboarding?.status === "session_ready" && latestOnboarding.onboarding.firstSessionId')
    expect(studio).toContain('await api(`/api/visual-engine/creations/${latestOnboarding.onboarding.firstSessionId}/generate`, { method: "POST" })')
    expect(studio).toContain('return latestOnboarding.onboarding.firstSessionId')
  })

  it("never preselects a paid multi-image series from an onboarding goal", () => {
    expect(studio).not.toContain('state.goal === "presence" ? 1 : 3')
    expect(studio).toContain("aria-pressed={options.seriesSize === item.value}")
    expect(studio).toContain('"image" : "images"')
  })

  it("restores a returning client's saved universe without overriding an explicit landing choice", () => {
    expect(studio).toContain("hasHydratedStudioPreferenceRef")
    expect(studio).toContain("getMiravaUniverse(new URLSearchParams(window.location.search).get(\"preset\"))")
    expect(studio).toContain("?.primaryUniverseId ??")
    expect(studio).toContain("const preferredUniverse =")
    expect(studio).toContain("requestedUniverse ??")
  })

  it("confirms a personal reference without promoting its raw filename into the creative brief", () => {
    expect(studio).toContain('"1 image sélectionnée · appuyez pour la remplacer"')
    expect(studio).toContain('"Votre référence"')
    expect(studio).not.toContain("referenceFile?.name")
  })

  it("does not distract a visitor who explicitly chose the personal-reference route", () => {
    expect(studio).toContain('!referenceFile && entryIntent !== "reference"')
    expect(studio).toContain('createStep === 0 && entryIntent === "reference" && !options.referenceMode')
    expect(studio).toContain('const openReferenceFromAlma = () => {')
    expect(studio).toContain('setCurrent(null)')
    expect(studio).toContain('Votre séance en cours reste dans votre galerie.')
    expect(studio).not.toContain('Ajoutez votre inspiration dans la création ouverte')
    expect(studio).toContain('setEntryIntent("reference")')
    expect(studio).toContain('const isReferenceRoute = step === 0 && entryIntent === "reference"')
    expect(studio).toContain('quelle image vous inspire ?')
  })

  it("keeps mobile navigation to the three product destinations", () => {
    const mobileNavigation = studio.slice(studio.indexOf("const bottomNavItems"), studio.indexOf("const isCreateFlow"))
    expect(mobileNavigation).toContain('{ id: "create", label: t.create')
    expect(mobileNavigation).toContain('{ id: "library", label: t.library')
    expect(mobileNavigation).toContain('{ id: "account", label: t.account')
    expect(mobileNavigation).not.toContain('{ id: "universes"')
    expect(mobileNavigation).not.toContain('{ id: "alma"')
    expect(studio).toContain("Alma remain available in the creation flow")
  })

  it("keeps the internal analysis state out of the client and starts a ready preset without exposing it", () => {
    expect(studio).not.toContain("MASTER_PROMPT")
    expect(studio).toContain('if (presetId && isMiravaIdentityProfileReady(identityProfile))')
    expect(studio).toContain('await api(`/api/visual-engine/creations/${data.creation.id}/generate`, { method: "POST" })')
  })

  it("does not try to generate a personal-reference creation before its asynchronous analysis is ready", () => {
    expect(studio).toContain('if (presetId && isMiravaIdentityProfileReady(identityProfile))')
    expect(studio).toContain('await api(`/api/visual-engine/creations/${session.creation.id}/generate`, { method: "POST" })')
  })

  it("keeps Alma useful when a current creation can no longer be edited", () => {
    expect(studio).toContain('const canApplyToCurrent = current && ["DRAFT", "ANALYSIS_QUEUED", "ANALYSING", "IDENTITY_READY"].includes(current.creation.status)')
    expect(studio).toContain("Direction Alma prête pour votre prochaine séance. Votre création en cours reste inchangée.")
  })

  it("uses the server privacy status and two distinct legal choices", () => {
    expect(studio).toContain("privacyStatus?.requiredAccepted === true")
    expect(studio).toContain('action: "accept_required"')
    expect(studio).toContain("consents.terms && consents.identity")
    expect(studio).toContain("Je consens explicitement au traitement de mes photos de visage")
    expect(studio).toContain("Retirer mon consentement et supprimer le Profil identité")
  })

  it("makes the underlying studio inert whenever a MIRAVA modal is open", () => {
    expect(studio).toContain(
      "const modalOpen = Boolean(captureContext) || directorOpen || consentTarget !== undefined",
    )

    expect(studio).toContain(
      "background.inert = modalOpen",
    )

    expect(studio).toMatch(
      /<div\s+ref=\{studioBackgroundRef\}/,
    )

    expect(studio).not.toContain(
      "aria-hidden={modalOpen ? true : undefined}",
    )
  })

  it("returns keyboard focus to the control that opened Alma", () => {
    expect(studio).toContain("const directorTriggerRef = useRef<HTMLElement | null>(null)")
    expect(studio).toContain("const closeDirector = () => {")
    expect(studio).toContain("directorTriggerRef.current?.focus()")
    expect(studio).toContain("onClose={closeDirector}")
  })

  it("returns keyboard focus to the control that opened identity capture", () => {
    expect(studio).toContain("const captureTriggerRef = useRef<HTMLElement | null>(null)")
    expect(studio).toContain("const closeCapture = () => {")
    expect(studio).toContain("captureTriggerRef.current?.focus()")
    expect(studio).toContain("onClose={closeCapture}")
  })

  it("makes billing cadence, tax and expiry explicit in every accessible offer name", () => {
    expect(studio).toContain('const isSubscription = offer.kind === "subscription"')
    expect(studio).toContain('const accessibleOfferLabel = locale === "fr"')
    expect(studio).toContain('aria-label={mustManageSubscription')
    expect(studio).toContain('"TTC · sans expiration"')
    expect(studio).toContain('const displayName = offer.name.replace(/\\s+[—-]\\s+\\d+\\s*$/, "")')
    expect(studio).toContain('offer.credits === 1 ? "creación" : "creaciones"')
  })

  it("calls the private identity profile by its purpose, not by an ambiguous model label", () => {
    expect(studio).toContain('"PROFIL IDENTITÉ PRIVÉ"')
    expect(studio).toContain('"Préparer mon identité"')
    expect(studio).not.toContain('"Préparer mon modèle"')
  })

  it("does not imply that camera capture is the only way to create an identity profile", () => {
    expect(studio).toContain('guided: "Préparer mon Profil identité"')
    expect(studio).toContain("MiravaIdentityCapture")
    expect(studio).toContain('onOpenCapture={() => openCapture')
  })

  it("keeps physical descriptions out of the client-side identity profile", () => {
    expect(studio).not.toContain("physicalTraits")
    expect(studio).not.toContain("CARACTÉRISTIQUES DISTINCTIVES")
  })

  it("returns Stripe checkout visitors to a clear account-state explanation", () => {
    expect(studio).toContain('const checkoutState = params.get("checkout")')
    expect(studio).toContain('setView("account")')
    expect(studio).toContain("Retour de paiement reçu. Votre accès est actualisé dès la confirmation Stripe.")
    expect(studio).toContain("Paiement annulé. Aucun changement n’a été apporté à votre accès.")
    expect(studio).toContain('params.delete("checkout")')
    expect(studio).toContain("if (!isLocaleReady) return")
    expect(studio).toContain('clearNotice()\n    setHighlightedOfferId(null)\n    setView(next)')
  })

  it("keeps a public offer selection visible after authentication instead of starting payment implicitly", () => {
    expect(studio).toContain('const requestedOfferId = params.get("offer")')
    expect(studio).toContain('const authReturnPath = `${window.location.pathname}${window.location.search}`')
    expect(studio).toContain('setHighlightedOfferId(requestedOfferId)')
    expect(studio).toContain('"Votre offre est prête à être confirmée."')
    expect(studio).toContain('highlightedOfferId={highlightedOfferId}')
    expect(studio).toContain('isHighlighted && "border-mirava-accent/70')
  })

  it("does not let a client select a series that exceeds the available credit balance", () => {
    expect(studio).toContain("const unavailable = item.value > availableCredits")
    expect(studio).toContain("disabled={unavailable}")
    expect(studio).toContain("Votre solde permet jusqu’à {availableCredits} photo")
    expect(studio).toContain("options.seriesSize! <= (account?.credits ?? 0)")
  })

  it("names the final creation action after the selected number of images", () => {
    expect(studio).toContain("const creationCount = options.seriesSize ?? 1")
    expect(studio).toContain('creationCount === 1 ? "Créer mon image"')
    expect(studio).toContain('creationCount === 1 ? "Crear mi imagen"')
  })

  it("makes an available credit lead to creation instead of an unnecessary purchase", () => {
    expect(studio).toContain("const availableCredits = account?.credits ?? 0")
    expect(studio).toContain('availableCredits > 0 ? (')
    expect(studio).toContain('"Créer ma séance"')
    expect(studio).toMatch(/const startFreshCreation = \(\) => \{\s*setCurrent\(null\)\s*setCreateStep\(0\)\s*selectView\("create"\)\s*\}/)
    expect(studio).toMatch(/<AccountView[^>]*onStartCreate=\{startFreshCreation\}/)
  })

  it("does not block creation when identity previews are temporarily unavailable", () => {
    expect(studio).toContain("if (!identityProfile?.previews?.length) return null")
  })

  it("does not ask a returning client to prepare an identity profile that is already ready", () => {
    expect(studio).toContain('identityReadyTitle: "Votre Profil identité est prêt"')
    expect(studio).toContain('identityReadyHint: "Votre identité est déjà liée à cette séance.')
    expect(studio).toContain('"Ajouter une vue privée"')
  })

  it("gives every private gallery result a distinct accessible name", () => {
    expect(studio).toContain('const statusLabel = t.status[creation.status] ??')
    expect(studio).toContain("Ouvrir la création ${index + 1} : ${statusLabel}")
    expect(studio).toContain("Abrir creación ${index + 1}: ${statusLabel}")
    expect(studio).toContain('imagesTitle: "Vos images"')
    expect(studio).toContain('<h2 className="mirava-section-title mt-12 text-2xl">{t.imagesTitle}</h2>')
  })

  it("keeps an empty private gallery actionable rather than blank", () => {
    expect(studio).toContain("Votre premier studio apparaîtra ici après votre première séance.")
    expect(studio).toContain("Votre galerie reste privée et vide jusqu’à votre première image.")
    expect(studio).toMatch(/const startFreshCreation = \(\) => \{\s*setCurrent\(null\)\s*setCreateStep\(0\)\s*selectView\("create"\)\s*\}/)
    expect(studio).toMatch(/<LibraryView[^>]*onStartCreate=\{startFreshCreation\}/)
  })

  it("resets a mobile destination to its beginning and announces non-error feedback", () => {
    expect(studio).toContain("studioScrollRef.current?.scrollTo")
    expect(studio).toContain('role="status" aria-live="polite" aria-atomic="true" className="mirava-notice')
  })

  it("marks the active studio language even though K3RN owns the outer document", () => {
    expect(studio).toContain('<main lang={locale} className="mirava-theme mirava-app-shell')
  })
  it("uses a native fixed shell with an independent content scroller", () => {
    expect(studio).toContain(
      "mirava-native-shell",
    )
    expect(studio).toContain(
      "mirava-native-frame",
    )
    expect(studio).toContain(
      'ref={studioScrollRef} className="mirava-native-scroll"',
    )
    expect(studio).toContain(
      "studioScrollRef.current?.scrollTo",
    )
  })

  it("shows and manages every private identity reference from the account", () => {
    expect(studio).toContain(
      "identityProfile.previews.map",
    )
    expect(studio).toContain(
      "selectedIdentityAssetId",
    )
    expect(studio).toContain(
      "handleIdentityAssetReplacement",
    )
    expect(studio).toContain(
      "confirmSingleAssetDeletion",
    )
    expect(studio).toContain(
      "uploadMiravaIdentityAsset",
    )
    expect(studio).toContain(
      "MIRAVA_MIN_IDENTITY_PHOTOS",
    )
    expect(studio).toContain(
      "MIRAVA_MAX_IDENTITY_PHOTOS",
    )
  })

  it("never sends identity photos through a multipart Vercel request from the Studio", () => {
    const uploadBlock = studio.slice(
      studio.indexOf(
        "const uploadIdentityFiles",
      ),
      studio.indexOf(
        "const replaceIdentityAsset",
      ),
    )

    expect(uploadBlock).toContain(
      "uploadMiravaIdentityProfile",
    )
    expect(uploadBlock).not.toContain(
      "new FormData()",
    )
    expect(uploadBlock).not.toContain(
      'form.append("file"',
    )
  })

  it("turns generation waiting into a premium photographic workflow", () => {
    expect(studio).toContain(
      "function MiravaDarkroomLoading",
    )
    expect(studio).toContain(
      "useReducedMotion",
    )
    expect(studio).toContain(
      "Votre séance prend forme",
    )
    expect(studio).toContain(
      "Analyse de l’architecture et du décor",
    )
    expect(studio).toContain(
      "Cartographie de la pose",
    )
    expect(studio).toContain(
      "Transfert de la direction artistique",
    )
    expect(studio).toContain(
      "Développement du rendu photographique",
    )
    expect(studio).toContain(
      "<MiravaDarkroomLoading",
    )
    expect(studio).not.toContain(
      'className="h-1 overflow-hidden bg-mirava-surface-raised"',
    )
  })

  it("protects the discovery result with a server-rendered preview and an explicit one-time checkout", () => {
    expect(studio).toContain(
      "function MiravaDiscoveryPaywall",
    )
    expect(studio).toContain(
      "mirava-discovery",
    )
    expect(studio).toContain(
      "Débloquer pour 2,99 € TTC",
    )
    expect(studio).toContain(
      "current.resultLocked",
    )
    expect(studio).not.toContain(
      "filter: blur(",
    )
  })

  it("renews withdrawn identity consent before uploading photos", () => {
    const consentMatches =
      studio.match(
        /initialConsentAccepted=\{privacyStatus\?\.requiredAccepted === true\}/g,
      )

    expect(consentMatches).toHaveLength(2)

    expect(studio).not.toContain(
      "initialConsentAccepted={true}",
    )

    expect(studio).not.toContain(
      "initialConsentAccepted={Boolean(miravaOnboarding?.identityConsentAt)}",
    )

    const uploadFlow = studio.slice(
      studio.indexOf(
        "const uploadIdentityFiles",
      ),
      studio.indexOf(
        "const replaceIdentityAsset",
      ),
    )

    const privacyRequestIndex =
      uploadFlow.indexOf(
        '"/api/visual-engine/privacy"',
      )

    const uploadIndex =
      uploadFlow.indexOf(
        "await uploadMiravaIdentityProfile",
      )

    expect(privacyRequestIndex).toBeGreaterThan(-1)
    expect(uploadIndex).toBeGreaterThan(-1)
    expect(privacyRequestIndex).toBeLessThan(uploadIndex)

    expect(uploadFlow).toContain(
      'action:',
    )

    expect(uploadFlow).toContain(
      '"accept_required"',
    )

    expect(uploadFlow).toContain(
      "Profil identité enregistré.",
    )
  })


  it("explains safety refusals and restored credits in both locales", () => {
    expect(studio).toContain(
      'current.creation.failureKind ===',
    )
    expect(studio).toContain(
      '"SAFETY_REFUSAL"',
    )
    expect(studio).toContain(
      "Aucun crédit ne reste débité",
    )
    expect(studio).toContain(
      "No queda ningún crédito descontado",
    )
    expect(studio).toContain(
      "{failureExplanation}",
    )
  })


  it("keeps the darkroom card free of decorative scan ornaments", () => {
    const darkroom = studio.slice(
      studio.indexOf(
        "function MiravaDarkroomLoading",
      ),
      studio.indexOf(
        "function ResultSaveButton",
      ),
    )

    expect(darkroom).toContain(
      "data-mirava-darkroom-card",
    )
    expect(darkroom).toContain(
      "data-mirava-darkroom-dot-grid",
    )
    expect(darkroom).not.toContain(
      "darkroomCopy.frame",
    )
    expect(darkroom).not.toContain(
      "bottom-11 left-1/2 flex -translate-x-1/2",
    )
    expect(darkroom).not.toContain(
      "border-l border-t border-white/35",
    )
    expect(darkroom).not.toContain(
      "border-b border-r border-white/35",
    )
  })

  it("replaces the local liquid halo with a full-card golden Grainient field", () => {
    const darkroom = studio.slice(
      studio.indexOf(
        "function MiravaDarkroomLoading",
      ),
      studio.indexOf(
        "function ResultSaveButton",
      ),
    )

    expect(studio).toContain(
      'import { Grainient } from "@/components/mirava/grainient"',
    )
    expect(darkroom).toContain(
      "data-mirava-darkroom-grainient",
    )
    expect(darkroom).toContain(
      "<Grainient",
    )
    expect(darkroom).toContain(
      'color1="#b49a68"',
    )
    expect(darkroom).toContain(
      'color3="#6b5130"',
    )
    expect(darkroom).toContain(
      "animated={!reduceMotion}",
    )
    expect(darkroom).not.toContain(
      "data-mirava-liquid-gold-halo",
    )
    expect(darkroom).not.toContain(
      "borderRadius: [",
    )
  })

  it(
    "polls only the active creation while production is pending",
    () => {
      expect(studio).toContain(
        "const refreshCreation =",
      )

      expect(studio).toContain(
        "`/api/visual-engine/creations/${creationId}`",
      )

      const pollingStart =
        studio.indexOf(
          "const poll = async () =>",
        )

      const pollingEnd =
        studio.indexOf(
          "const run = async",
          pollingStart,
        )

      const pollingSection =
        studio.slice(
          pollingStart,
          pollingEnd,
        )

      expect(pollingSection).toContain(
        "refreshCreation(",
      )

      expect(pollingSection).not.toContain(
        "void refresh(",
      )

      expect(pollingSection).not.toContain(
        "setInterval",
      )
    },
  )

  it(
    "explains analysis and generation timeouts explicitly",
    () => {
      expect(studio).toContain(
        '"ANALYSIS_TIMEOUT"',
      )

      expect(studio).toContain(
        '"GENERATION_TIMEOUT"',
      )

      expect(studio).toContain(
        "Référence non analysée",
      )

      expect(studio).toContain(
        "Création interrompue",
      )
    },
  )

  it("continues a completed creation as the same photographic session", () => {
    expect(studio).toContain(
      'type ShotIntent = "pose" | "framing" | "sub_location" | "candid"',
    )
    expect(studio).toContain(
      "Continuer cette séance",
    )
    expect(studio).toContain(
      "Même tenue · Même ambiance · Nouveau cliché",
    )
    expect(studio).toContain(
      "/continue",
    )
    expect(studio).toContain(
      "sourceResultIndex",
    )
    expect(studio).toContain(
      "Autre pose",
    )
    expect(studio).toContain(
      "Autre cadrage",
    )
    expect(studio).toContain(
      "Autre coin du décor",
    )
    expect(studio).toContain(
      "Moment spontané",
    )
    expect(studio).toContain(
      "Créer une nouvelle séance depuis ce studio",
    )
  })



  it(
    "does not blame the customer when an official MIRAVA universe is refused",
    () => {
      expect(studio).toContain(
        "Univers momentanément indisponible",
      )

      expect(studio).toContain(
        "Cet univers MIRAVA n’a pas pu être produit correctement",
      )

      expect(studio).toContain(
        "current.creation.presetId",
      )
    },
  )

})
