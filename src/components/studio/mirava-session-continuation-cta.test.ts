import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const studio =
  readFileSync(
    "src/components/studio/visual-engine-studio.tsx",
    "utf8",
  )

describe(
  "MIRAVA session continuation CTA",
  () => {
    it(
      "uses the darkroom animated visual direction inside the continuation CTA",
      () => {
        expect(studio).toContain(
          "data-mirava-continuation-cta",
        )
        expect(studio).toContain(
          "data-mirava-continuation-grainient",
        )
        expect(studio).toContain(
          'color1="#b49a68"',
        )
        expect(studio).toContain(
          'color2="#171915"',
        )
        expect(studio).toContain(
          'color3="#6b5130"',
        )
        expect(studio).toContain(
          "data-mirava-continuation-dot-grid",
        )
        expect(studio).toContain(
          '"5px 5px"',
        )
      },
    )

    it(
      "keeps the premium checkout CTA interaction language",
      () => {
        expect(studio).toContain(
          "rounded-[1.35rem]",
        )
        expect(studio).toContain(
          "active:scale-[0.985]",
        )
        expect(studio).toContain(
          "group-hover:translate-x-0.5",
        )
        expect(studio).toContain(
          "focus-visible:ring-[#d7c39a]",
        )
      },
    )

    it(
      "opens credit purchase instead of disabling continuation when the balance is empty",
      () => {
        expect(studio).toContain(
          "onOpenCredits: () => void",
        )
        expect(studio).toContain(
          "if (current.studioCredits < 1) {",
        )
        expect(studio).toContain(
          "onOpenCredits()",
        )
        expect(studio).toContain(
          "disabled={continuationPending}",
        )
      },
    )

    it(
      "renders a coherent pending state before the loading screen takes over",
      () => {
        expect(studio).toContain(
          "aria-busy={",
        )
        expect(studio).toContain(
          "Préparation du prochain cliché",
        )
        expect(studio).toContain(
          "Preparando la siguiente foto",
        )
        expect(studio).toContain(
          '<Loader2 className="relative h-4 w-4 animate-spin" />',
        )
      },
    )

    it(
      "preserves the existing continuation intent flow after expansion",
      () => {
        for (
          const intent of [
            '"pose"',
            '"framing"',
            '"sub_location"',
            '"candid"',
          ]
        ) {
          expect(studio).toContain(intent)
        }

        expect(studio).toContain(
          "onContinueSession(",
        )
      },
    )
  },
)
