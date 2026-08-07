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
  "MIRAVA credit checkout CTA loading state",
  () => {
    const studio = readFileSync(
      path.resolve(
        process.cwd(),
        "src/components/studio/visual-engine-studio.tsx",
      ),
      "utf8",
    )

    it(
      "keeps checkout busy state accessible",
      () => {
        expect(studio).toContain(
          "aria-busy={actionPending}",
        )
        expect(studio).toContain(
          'actionPending &&\n                  "cursor-wait opacity-100"',
        )
      },
    )

    it(
      "keeps the ivory premium treatment while checkout is pending",
      () => {
        expect(studio).toContain(
          "bg-[linear-gradient(135deg,#fffaf0_0%,#eee4d3_58%,#d8c3a0_100%)]",
        )
        expect(studio).toContain(
          'selectedOffer\n                      ? "text-black/55"',
        )
        expect(studio).not.toContain(
          "group-disabled:text-white/24",
        )
        expect(studio).not.toContain(
          "group-disabled:bg-white/10",
        )
      },
    )

    it(
      "still renders an unavailable state before an offer is selected",
      () => {
        expect(studio).toContain(
          '!selectedOffer\n                  ? "cursor-not-allowed border border-white/10 bg-white/[0.07] text-white/32 shadow-none"',
        )
        expect(studio).toContain(
          '!selectedOffer && "hidden"',
        )
      },
    )
  },
)
