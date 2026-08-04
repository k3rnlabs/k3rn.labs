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
    expect(capture).toContain("leur traitement par OpenAI pour préparer ma première séance")
    expect(capture).toContain("su tratamiento por OpenAI para preparar mi primera sesión")
    expect(capture).toContain('disabled={phase === "loading" || !legalAccepted}')
    expect(capture).toContain("Enregistrer mon profil")
  })
})
