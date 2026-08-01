import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(process.cwd(), file), "utf8")

describe("MIRAVA public-product promises", () => {
  const landing = read("src/app/visual-engine/page.tsx")
  const studioReference = read("src/components/mirava/mirava-agent-simulator.tsx")
  const presence = read("src/components/mirava/mirava-channel-showcase.tsx")
  const pricing = read("src/components/mirava/mirava-pricing.tsx")

  it("keeps the custom-studio direction private instead of exposing a derived analysis", () => {
    expect(landing).toContain("sans jamais afficher sa direction interne")
    expect(studioReference).toContain("Votre direction artistique n’est jamais affichée ni partagée.")
    expect(studioReference).not.toContain("5400K")
    expect(studioReference).not.toContain("agentPrompt")
  })

  it("does not market formats that the MVP does not deliver", () => {
    expect(pricing).toContain("Images signature verticales 4:5 dans votre galerie privée")
    expect(presence).toContain("Chaque création est livrée dans votre galerie privée au format vertical 4:5.")
    expect(presence).not.toContain("9:16")
    expect(presence).not.toContain("16:9")
    expect(pricing).not.toContain("multi-formats")
  })

  it("localizes the public identity-guide labels in French and Spanish", () => {
    expect(landing).toContain('label: { fr: "Face neutre", es: "Rostro de frente" }')
    expect(landing).toContain("alt={item.label[locale]}")
    expect(landing).toContain("{item.label[locale]}")
  })

  it("explains the three required identity views before optional reinforcement views", () => {
    expect(landing).toContain("3 portraits guidés essentiels")
    expect(landing).toContain("jusqu’à deux vues silhouette")
    expect(landing).toContain("3 retratos guiados esenciales")
    expect(landing).toContain("hasta dos vistas de silueta")
  })

  it("keeps a public pricing choice through the Studio entry route", () => {
    expect(pricing).toContain('href={`/visual-engine/studio?view=account&offer=${item.id}`}')
  })
})
