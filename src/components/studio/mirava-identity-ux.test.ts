import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const studio = readFileSync(
  "src/components/studio/visual-engine-studio.tsx",
  "utf-8",
)

const capture = readFileSync(
  "src/components/studio/mirava-identity-capture.tsx",
  "utf-8",
)

describe("MIRAVA identity UX contracts", () => {
  it("centers the destructive identity confirmation in a compact card", () => {
    expect(studio).toContain(
      "open={deleteIdentityOpen}",
    )

    expect(studio).toContain(
      "max-h-[calc(100dvh-2rem)]",
    )

    expect(studio).toContain(
      "left-1/2 top-1/2",
    )

    expect(studio).toContain(
      "Garder mes photos",
    )

    expect(studio).toContain(
      "Supprimer définitivement",
    )
  })

  it("shows one large MIRAVA reference and replaces it with the user photo", () => {
    expect(capture).toContain(
      "!currentSlotState.preview ? (",
    )

    expect(capture).toContain(
      "aspect-[4/5]",
    )

    expect(capture).toContain(
      'className="h-full w-full object-contain"',
    )
  })

  it("preserves the draft and disables horizontal overscroll during capture", () => {
    expect(capture).toContain(
      "writeMiravaIdentityDraft",
    )

    expect(capture).toContain(
      "readMiravaIdentityDraft",
    )

    expect(capture).toContain(
      'root.style.overscrollBehaviorX =',
    )

    expect(capture).toContain(
      "overscroll-x-none",
    )
  })

  it("validates facial readability instead of requiring natural light", () => {
    expect(capture).toContain(
      "visage centré et clairement éclairé",
    )

    expect(capture).toContain(
      "Visage clairement et uniformément éclairé",
    )

    expect(capture).toContain(
      "Rostro claramente iluminado, sin sombras fuertes",
    )

    expect(capture).not.toContain(
      "Éclairage naturel et homogène",
    )

    expect(capture).not.toContain(
      "iluminación natural sin accesorios",
    )
  })

  it("keeps technical vision metrics outside production", () => {
    expect(capture).toContain(
      'process.env.NODE_ENV !== "production"',
    )

    expect(capture).toContain(
      "Vision debug",
    )
  })
})
