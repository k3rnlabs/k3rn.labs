import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA identity capture accessibility contracts", () => {
  const capture = readFileSync(
    path.resolve(process.cwd(), "src/components/studio/mirava-identity-capture.tsx"),
    "utf8",
  )
  const styles = readFileSync(
    path.resolve(process.cwd(), "src/styles/mirava.css"),
    "utf8",
  )

  it("lets a keyboard user leave the full-screen capture at every stage", () => {
    expect(capture).toContain('if (event.key !== "Escape") return')
    expect(capture).toContain("window.addEventListener(\"keydown\", onKeyDown)")
    expect(capture).toContain("window.removeEventListener(\"keydown\", onKeyDown)")
    expect(capture).toContain("close()")
  })

  it("keeps keyboard focus inside the full-screen identity journey", () => {
    expect(capture).toContain('const dialogRef = useRef<HTMLDivElement>(null)')
    expect(capture).toContain('const retainFocus = (event: KeyboardEvent) => {')
    expect(capture).toContain('if (event.key !== "Tab") return')
    expect(capture).toContain('data-dialog-initial-focus')
  })

  it("keeps both guided camera and private import routes visible", () => {
    expect(capture).toContain('"Ouvrir la caméra"')
    expect(capture).toContain('"Choisir 3 à 10 photos"')
    expect(capture).toContain("Choisissez la caméra guidée ou vos propres photos")
  })

  it("makes additional trait photos visibly cumulative", () => {
    expect(capture).toContain(
      "Ajouter une photo supplémentaire ne remplace pas celles déjà ajoutées.",
    )
    expect(capture).toContain("Terminer avec")
    expect(capture).toContain("traitPhotoCount")
    expect(capture).toContain("MIRAVA_MAX_IDENTITY_PHOTOS")
  })

  it("restores validated photos after backward navigation or reload", () => {
    expect(capture).toContain(
      "readMiravaIdentityDraft",
    )
    expect(capture).toContain(
      "writeMiravaIdentityDraft",
    )
    expect(capture).toContain(
      "clearMiravaIdentityDraft",
    )
    expect(capture).toContain(
      "IdentityDraftSnapshot",
    )
    expect(capture).toContain(
      "URL.createObjectURL(state.file)",
    )
  })

  it("routes imported identity photos through the real MediaPipe analyzer", () => {
    expect(capture).toContain('from "./mirava-import-analyzer"')
    expect(capture).toContain("analyzeMiravaIdentityPhoto(")
    expect(capture).not.toContain("async function analyzePhotoCriteria(")
    expect(capture).not.toContain('// new Worker("/visual-engine/vision/mirava-vision.worker.js"')
  })

  it("keeps the full-screen capture anchored to the viewport", () => {
    expect(styles).toContain(".mirava-theme > .mirava-capture-shell")
    expect(styles).toMatch(/\.mirava-theme > \.mirava-capture-shell\s*\{\s*position: fixed;/)
  })

  it("makes OpenAI processing explicit before onboarding can prepare a first session", () => {
    expect(capture).toContain("privacyAccepted: true")
    expect(capture).toContain("openaiDisclosureAccepted: true")
    expect(capture).toContain("prestataires techniques utilisés par MIRAVA")
    expect(capture).toContain("proveedores técnicos utilizados por MIRAVA")
    expect(capture).not.toContain("traitement par OpenAI")
    expect(capture).not.toContain("tratamiento por OpenAI")
    expect(capture).toContain('disabled={phase === "loading" || !legalAccepted}')
    expect(capture).toContain("Enregistrer mon profil")
  })

  it("uses one conditional action state in onboarding and account capture", () => {
    expect(capture).toContain("currentPhotoHasBlockingIssues")
    expect(capture).toContain("Choisir une meilleure photo")
    expect(capture).toContain("currentActionState.onClick")
    expect(capture).toContain("currentActionState.disabled")
    expect(capture).toContain("mirava-floating-action-frame fixed bottom-0")
    expect(capture).not.toContain(
      '!inline && currentSlotState.status === "scanned"',
    )
  })

  it("aligns the smile slot with the actual Vision orientation contract", () => {
    const slotStart =
      capture.indexOf('id: "smile"')
    const slotEnd =
      capture.indexOf('id: "body"', slotStart)
    const smileSlot =
      capture.slice(slotStart, slotEnd)

    expect(smileSlot).toContain(
      "Visage de face, regard vers l'objectif",
    )
    expect(smileSlot).toContain(
      "Visage clairement et uniformément éclairé",
    )

    const mapStart =
      capture.indexOf(
        "  smile: {",
        capture.indexOf(
          "const SLOT_CRITERION_MAP",
        ),
      )
    const mapEnd =
      capture.indexOf(
        "  body: {",
        mapStart,
      )
    const smileMap =
      capture.slice(mapStart, mapEnd)

    expect(smileMap).toContain(
      "orientation: 2",
    )
    expect(smileMap).toContain(
      "eyes: 2",
    )
    expect(smileMap).toContain(
      "lighting: 3",
    )
    expect(smileMap).not.toContain(
      "lighting: 2",
    )
  })

  it("never paints a Vision-rejected scanned photo as validated", () => {
    const badgeStart =
      capture.indexOf(
        '{(currentSlotState.status === "scanned"',
      )
    const badgeEnd =
      capture.indexOf(
        '{currentSlotState.status === "scanned" && (',
        badgeStart,
      )
    const badge =
      capture.slice(
        badgeStart,
        badgeEnd,
      )

    expect(badge).toContain(
      "currentPhotoHasBlockingIssues",
    )
    expect(badge).toContain(
      "Photo validée",
    )

    expect(capture).toContain(
      "hasUnmappedBlockingIssue",
    )
    expect(capture).toContain(
      "!hasUnmappedBlockingIssue",
    )
  })

  it("does not require natural light for identity reference examples", () => {
    expect(capture).toContain(
      "un éclairage clair et homogène",
    )
    expect(capture).toContain(
      "una iluminación clara y uniforme",
    )
    expect(capture).not.toContain(
      "cet éclairage naturel",
    )
    expect(capture).not.toContain(
      "postura e iluminación natural",
    )
  })

  it("never exposes validation as the primary action for a rejected photo", () => {
    const blockingBranch = capture.slice(
      capture.indexOf("if (currentPhotoHasBlockingIssues)"),
      capture.indexOf('if (currentSlot.id === "tattoos")'),
    )

    expect(blockingBranch).toContain("Choisir une meilleure photo")
    expect(blockingBranch).toContain('icon: "upload"')
    expect(blockingBranch).not.toContain("Valider et continuer")
  })
})
