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
        'CACHE = "mirava-public-shell-v9"',
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
        "dangerouslySetInnerHTML",
      )

      expect(offlinePage).toContain(
        "__html: offlineCriticalCss",
      )

      expect(offlinePage).not.toContain(
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
        "-apple-system",
      )

      expect(offlinePage).toContain(
        "BlinkMacSystemFont",
      )

      expect(offlinePage).not.toContain(
        "var(\n        --font-jakarta",
      )

      expect(offlinePage).toContain(
        "href={returnPath}",
      )

      expect(offlinePage).toContain(
        '"online",',
      )

      expect(offlinePage).toContain(
        "window.location.replace(next)",
      )

      expect(offlinePage).toContain(
        "readOfflineReturnPath()",
      )

      expect(offlinePage).not.toContain(
        "🛡️",
      )
    },
  )

  it(
    "forces clients to refresh the service worker instead of trusting an HTTP-cached worker",
    () => {
      const pwaRegistration = readFileSync(
        path.resolve(
          process.cwd(),
          "src/components/mirava/mirava-pwa.tsx",
        ),
        "utf8",
      )

      expect(pwaRegistration).toContain(
        "updateViaCache:",
      )

      expect(pwaRegistration).toContain(
        '"none",',
      )

      expect(pwaRegistration).toContain(
        "registration.update()",
      )

      expect(pwaRegistration).toContain(
        "window.addEventListener(",
      )

      expect(pwaRegistration).toContain(
        '"offline",',
      )

      expect(pwaRegistration).toContain(
        "if (!navigator.onLine)",
      )

      expect(pwaRegistration).toContain(
        "window.location.replace(",
      )

      expect(pwaRegistration).toContain(
        "offlinePath,",
      )

      expect(pwaRegistration).toContain(
        "window.sessionStorage.setItem(",
      )

      expect(pwaRegistration).toContain(
        '"mirava-offline-return-path"',
      )
    },
  )

  it(
    "uses a network-only navigation request before falling back offline",
    () => {
      expect(worker).toContain(
        'fetch(request, { cache: "no-store" })',
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
