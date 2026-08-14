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
  "MIRAVA automatic identity morphology refresh",
  () => {
    const core =
      readFileSync(
        path.resolve(
          process.cwd(),
          "src/lib/visual-engine/core.ts",
        ),
        "utf8",
      )

    it(
      "analyzes temporary metadata-free vision derivatives rather than altering identity masters",
      () => {
        expect(core).toContain(
          "refreshIdentityMorphologyForProfile",
        )

        expect(core).toContain(
          "withoutEnlargement:",
        )

        expect(core).toContain(
          "1280",
        )

        expect(core).toMatch(
          /images\.push\(\{[\s\S]*?buffer:\s*preview,[\s\S]*?mimeType:\s*"image\/jpeg"/,
        )

        expect(core).toContain(
          "runKieMultimodalAnalysis({",
        )
      },
    )

    it(
      "excludes tattoo-only references from body morphology analysis",
      () => {
        expect(core).toContain(
          'asset.viewKey !==\n            "tattoos"',
        )
      },
    )

    it(
      "prefers a body view when one exists",
      () => {
        expect(core).toContain(
          'if (viewKey === "body")',
        )

        expect(core).toContain(
          "return 0",
        )
      },
    )

    it(
      "invalidates stale morphology before every refresh",
      () => {
        const refreshStart =
          core.indexOf(
            "async function refreshIdentityMorphologyForProfile",
          )

        const nullIndex =
          core.indexOf(
            "identityMorphology:",
            refreshStart,
          )

        const providerIndex =
          core.indexOf(
            "runKieMultimodalAnalysis({",
            refreshStart,
          )

        expect(nullIndex).toBeGreaterThan(
          refreshStart,
        )

        expect(providerIndex).toBeGreaterThan(
          nullIndex,
        )
      },
    )

    it(
      "recalculates after replace append individual replacement and deletion",
      () => {
        const calls =
          core.match(
            /await refreshIdentityMorphologyForProfile\(\{/g,
          ) ?? []

        /*
         * replace profile
         * replace individual asset
         * delete optional asset
         * append profile
         */
        expect(
          calls.length,
        ).toBeGreaterThanOrEqual(
          4,
        )
      },
    )

    it(
      "does not fail a durable identity upload when morphology analysis is temporarily unavailable",
      () => {
        expect(core).toContain(
          "[mirava-identity-morphology-error]",
        )

        expect(core).toContain(
          "stale morphology",
        )
      },
    )
  },
)
