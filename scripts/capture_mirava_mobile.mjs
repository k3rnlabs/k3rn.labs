import { chromium } from "playwright"
import { mkdirSync } from "node:fs"
import path from "node:path"

const viewports = [
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "393x852", width: 393, height: 852 },
  { name: "430x932", width: 430, height: 932 },
]

const outDir = "/Users/user/.gemini/antigravity-ide/brain/096d33f6-3df7-47f8-837e-8fdf382dfc51/screenshots"
mkdirSync(outDir, { recursive: true })

async function capture() {
  const browser = await chromium.launch({ headless: true })

  for (const vp of viewports) {
    console.log(`Capturing viewport ${vp.name}...`)
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })

    const page = await context.newPage()

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
    await page.waitForTimeout(800)

    const cards = page.locator('.mirava-onboarding-v3-universes button')

    // State 0: 0 selection (CTA disabled)
    await page.screenshot({ path: path.join(outDir, `step3_${vp.name}_0_selection_cta_disabled.png`), fullPage: false })

    // State 1: 1 selection
    if (await cards.count() >= 1) {
      await cards.nth(0).click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: path.join(outDir, `step3_${vp.name}_1_selection_cta_active.png`), fullPage: false })
    }

    // State 2: 2 selections
    if (await cards.count() >= 2) {
      await cards.nth(1).click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: path.join(outDir, `step3_${vp.name}_2_selections.png`), fullPage: false })
    }

    // State 3: 3 selections (max allowed)
    if (await cards.count() >= 3) {
      await cards.nth(2).click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: path.join(outDir, `step3_${vp.name}_3_selections_max.png`), fullPage: false })
    }

    // State 4: Attempt 4th selection (Limit notice message displayed)
    if (await cards.count() >= 4) {
      await cards.nth(3).click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: path.join(outDir, `step3_${vp.name}_4th_attempt_limit_notice.png`), fullPage: false })
    }

    // State 5: Deselection back to 2 selections
    if (await cards.count() >= 3) {
      await cards.nth(2).click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: path.join(outDir, `step3_${vp.name}_deselection_to_2.png`), fullPage: false })
    }

    // State 6: Scrolled to bottom
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }))
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(outDir, `step3_${vp.name}_scrolled_bottom.png`), fullPage: false })

    await context.close()
  }

  await browser.close()
  console.log("All viewport screenshots successfully captured!")
}

capture().catch((err) => {
  console.error("Capture failure:", err)
  process.exit(1)
})
