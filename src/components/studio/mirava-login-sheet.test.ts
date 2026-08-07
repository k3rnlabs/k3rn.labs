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
  "MIRAVA authentication page",
  () => {
    const login = readFileSync(
      path.resolve(
        process.cwd(),
        "src/app/visual-engine/studio/login/page.tsx",
      ),
      "utf8",
    )

    it(
      "uses the exact credit darkroom animation across the page",
      () => {
        expect(login).toContain(
          "opacity-[0.72]",
        )
        expect(login).toContain(
          'color1="#b49a68"',
        )
        expect(login).toContain(
          'color2="#171915"',
        )
        expect(login).toContain(
          'color3="#6b5130"',
        )
        expect(login).toContain(
          "timeSpeed={0.72}",
        )
        expect(login).toContain(
          "warpStrength={1.75}",
        )
        expect(login).toContain(
          "rotationAmount={620}",
        )
        expect(login).toContain(
          "bg-black/34",
        )
        expect(login).toContain(
          "opacity-[0.12]",
        )
        expect(login).toContain(
          '"5px 5px"',
        )
      },
    )

    it(
      "mounts the animated background in an explicit viewport layer",
      () => {
        expect(login).toContain(
          "data-mirava-auth-background",
        )
        expect(login).toContain(
          'position: "fixed"',
        )
        expect(login).toContain(
          'height: "100svh"',
        )
        expect(login).toContain(
          'width: "100vw"',
        )
        expect(login).toContain(
          "data-mirava-auth-background-fallback",
        )
        expect(login).toContain(
          "data-mirava-auth-dots",
        )
        expect(login).toContain(
          'z-[1] opacity-[0.12]',
        )
        expect(login).toContain(
          'z-[2] bg-black/34',
        )
        expect(login).toContain(
          "relative isolate",
        )
      },
    )

    it(
      "reuses the real application header",
      () => {
        expect(login).toContain(
          "<Header",
        )
        expect(login).toContain(
          "<MiravaWordmark",
        )
        expect(login).toContain(
          "locale.toUpperCase()",
        )
        expect(login).not.toContain(
          'className="hidden text-[11px]',
        )
      },
    )

    it(
      "keeps the authentication CTA readable while loading",
      () => {
        expect(login).toContain(
          "aria-busy={loading}",
        )
        expect(login).toContain(
          "disabled:cursor-wait",
        )
        expect(login).toContain(
          "disabled:opacity-100",
        )
        expect(login).toContain(
          "disabled:text-[#0b0c0b]",
        )
        expect(login).not.toContain(
          "disabled:text-white/32",
        )
        expect(login).not.toContain(
          "disabled:bg-white/[0.07]",
        )
      },
    )

    it(
      "uses the same animated title treatment as the studio",
      () => {
        expect(login).toContain(
          "<BlurText",
        )
        expect(login).toContain(
          "mirava-section-title",
        )
        expect(login).toContain(
          "Retrouver votre studio et vos créations.",
        )
      },
    )

    it(
      "positions the card higher while remaining mobile scroll safe",
      () => {
        expect(login).toContain(
          "min-h-svh",
        )
        expect(login).toContain(
          "overflow-x-hidden",
        )
        expect(login).toContain(
          "items-start justify-center",
        )
        expect(login).toContain(
          "pt-[clamp(3rem,8dvh,6rem)]",
        )
        expect(login).toContain(
          "data-mirava-auth-card",
        )
      },
    )

    it(
      "keeps the existing authentication flow and locale",
      () => {
        expect(login).toContain(
          "getStudioDestination",
        )
        expect(login).toContain(
          "router.push(studioDestination)",
        )
        expect(login).toContain(
          "normalizedEmail",
        )
        expect(login).toContain(
          "password,\n            locale,",
        )
      },
    )
  },
)
