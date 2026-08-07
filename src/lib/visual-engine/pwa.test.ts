import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("MIRAVA PWA privacy policy", () => {
  const worker = readFileSync(
    path.resolve(
      process.cwd(),
      "public/visual-engine/sw.js",
    ),
    "utf8",
  )

  const offlinePage = readFileSync(
    path.resolve(
      process.cwd(),
      "src/app/visual-engine/offline/page.tsx",
    ),
    "utf8",
  )

  it("only pre-caches the public shell", () => {
    expect(worker).toContain(
      'PUBLIC_SHELL = ["/visual-engine", "/visual-engine/offline"]',
    )

    expect(worker).not.toContain(
      "cache.put",
    )
  })

  it(
    "refreshes the public shell cache when the branded offline fallback changes",
    () => {
      expect(worker).toContain(
        'CACHE = "mirava-public-shell-v4"',
      )
    },
  )

  it(
    "keeps the offline fallback branded even without external CSS assets",
    () => {
      expect(offlinePage).toContain(
        "const offlineCriticalCss =",
      )

      expect(offlinePage).toContain(
        "<style>{offlineCriticalCss}</style>",
      )

      expect(offlinePage).toContain(
        "data-mirava-offline-shell",
      )

      expect(offlinePage).toContain(
        "mirava-offline-bg",
      )

      expect(offlinePage).toContain(
        "mirava-offline-header",
      )

      expect(offlinePage).toContain(
        "mirava-offline-card",
      )

      expect(offlinePage).toContain(
        "mirava-offline-cta",
      )

      expect(offlinePage).toContain(
        "mirava-offline-cta-icon",
      )

      expect(offlinePage).toContain(
        'href="/visual-engine/studio"',
      )

      expect(offlinePage).not.toContain(
        "🛡️",
      )
    },
  )

  it(
    "explicitly excludes APIs and private storage from cache handling",
    () => {
      expect(worker).toContain(
        'url.pathname.startsWith("/api/")',
      )

      expect(worker).toContain(
        'url.pathname.startsWith("/storage/")',
      )
    },
  )

  it(
    "keeps notifications generic and their destination free of private creation ids",
    () => {
      expect(worker).toContain(
        'data: { url: "/visual-engine/studio" }',
      )

      expect(worker).not.toContain(
        "payload.url",
      )

      expect(worker).not.toContain(
        "creation=",
      )
    },
  )
})
