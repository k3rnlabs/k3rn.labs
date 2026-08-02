import { chromium } from "playwright"
import { mkdirSync } from "node:fs"
import path from "node:path"

const outDir = "/Users/user/.gemini/antigravity-ide/brain/096d33f6-3df7-47f8-837e-8fdf382dfc51/screenshots"
mkdirSync(outDir, { recursive: true })

async function debugCapture() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })

  const page = await context.newPage()

  let currentStep = "visual_universes"

  await page.route("**/api/visual-engine/**", async (route) => {
    const url = route.request().url()
    if (url.includes("/api/visual-engine/onboarding")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          firstName: "Kévin",
          onboarding: {
            version: 3,
            status: "in_progress",
            currentStep: "visual_universes",
            universeIds: [],
            goal: "presence",
            updatedAt: new Date().toISOString(),
          },
        }),
      })
      return
    }
    if (url.includes("/api/visual-engine/creations")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ studioCredits: 5, creations: [] }) })
      return
    }
    if (url.includes("/api/visual-engine/studios")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ studios: [] }) })
      return
    }
    if (url.includes("/api/visual-engine/identity-profile")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profile: null }) })
      return
    }
    if (url.includes("/api/visual-engine/account")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ credits: 5, subscription: null, plans: [], packs: [] }) })
      return
    }
    await route.continue()
  })

  await page.goto("http://localhost:3000/visual-engine/studio", { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(1000)

  await page.screenshot({ path: path.join(outDir, "debug_direct_step3.png") })
  console.log("Direct step 3 screenshot saved!")

  await browser.close()
}

debugCapture().catch(console.error)
