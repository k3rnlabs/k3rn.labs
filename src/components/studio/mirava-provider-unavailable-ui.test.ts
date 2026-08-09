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
  "MIRAVA provider unavailable UI",
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
      "renders generic localized provider downtime without naming the provider",
      () => {
        expect(studio).toContain(
          '"PROVIDER_UNAVAILABLE"',
        )

        expect(studio).toContain(
          "Le service d’image est momentanément indisponible.",
        )

        expect(studio).toContain(
          "El servicio de imágenes no está disponible temporalmente.",
        )
      },
    )
  },
)
