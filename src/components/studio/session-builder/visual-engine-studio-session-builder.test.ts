import {
  readFileSync,
} from "node:fs"
import {
  resolve,
} from "node:path"

import {
  describe,
  expect,
  it,
} from "vitest"

const source =
  readFileSync(
    resolve(
      process.cwd(),
      "src/components/studio/visual-engine-studio.tsx",
    ),
    "utf-8",
  )

describe(
  "MIRAVA Studio Session Builder integration",
  () => {
    it("exposes a dedicated Session Builder entry", () => {
      expect(
        source,
      ).toContain(
        "data-mirava-session-builder-entry",
      )

      expect(
        source,
      ).toContain(
        "Construire une séance",
      )
    })

    it("creates a durable builder draft before opening the flow", () => {
      expect(
        source,
      ).toContain(
        "createMiravaSessionBuilderClientSession",
      )

      expect(
        source,
      ).toContain(
        "<SessionBuilderFlow",
      )
    })

    it("opens the dynamic session darkroom after launch", () => {
      expect(
        source,
      ).toContain(
        "<SessionGallery locale={locale} sessionId={sessionShootId}",
      )

      expect(
        source,
      ).toContain(
        "sessionBuilderSession",
      )

      expect(
        source,
      ).not.toContain(
        "creditCost={\n                MIRAVA_SESSION_SHOT_COUNT",
      )
    })
  },
)
