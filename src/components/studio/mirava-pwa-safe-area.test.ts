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
  "MIRAVA PWA iPhone safe-area shell",
  () => {
    const css = readFileSync(
      path.resolve(
        process.cwd(),
        "src/styles/mirava.css",
      ),
      "utf8",
    )

    const manifest =
      JSON.parse(
        readFileSync(
          path.resolve(
            process.cwd(),
            "public/visual-engine/manifest.webmanifest",
          ),
          "utf8",
        ),
      ) as {
        background_color?: string
        theme_color?: string
      }

    it(
      "paints the standalone document canvas with the MIRAVA background",
      () => {
        expect(css).toContain(
          "html:has(.mirava-theme)",
        )
        expect(css).toContain(
          "body:has(.mirava-theme)",
        )
        expect(css).toContain(
          "background-color: rgb(9 10 10);",
        )
        expect(manifest.background_color)
          .toBe("#090a0a")
        expect(manifest.theme_color)
          .toBe("#090a0a")
      },
    )

    it(
      "keeps the floating navigation compact and safe-area aware",
      () => {
        expect(css).toContain(
          "bottom: max(0.35rem, env(safe-area-inset-bottom));",
        )
        expect(css).toContain(
          "height: 3.5rem;",
        )
        expect(css).toContain(
          "height: 2.75rem;",
        )
        expect(css).toContain(
          "padding: 0 0.65rem;",
        )
      },
    )

    it(
      "does not reserve an oversized blank area below mobile content",
      () => {
        expect(css).toContain(
          "calc(5.5rem + env(safe-area-inset-bottom));",
        )
        expect(css).toContain(
          "calc(5rem + env(safe-area-inset-bottom));",
        )
      },
    )
  },
)
