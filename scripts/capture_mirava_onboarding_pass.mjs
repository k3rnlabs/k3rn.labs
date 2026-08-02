import { chromium } from "playwright"
import path from "node:path"
import fs from "node:fs"

const VIEWPORTS = [
  { width: 375, height: 812, name: "375x812" },
  { width: 390, height: 844, name: "390x844" },
  { width: 393, height: 852, name: "393x852" },
  { width: 430, height: 932, name: "430x932" },
]

const OUTPUT_DIR = "/Users/user/.gemini/antigravity-ide/brain/096d33f6-3df7-47f8-837e-8fdf382dfc51/onboarding_pass_screenshots"

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

async function capture() {
  console.log("Starting Playwright capture for Camera & Activation Final Gate...")
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  })

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Capturing viewport: ${vp.name} ---`)
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      permissions: ["camera"],
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    })

    const page = await context.newPage()

    // Mock API route handlers
    await page.route("**/api/visual-engine/**", async (route) => {
      const url = route.request().url()
      const method = route.request().method()

      if (url.includes("/api/visual-engine/account")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            email: "kevin@mirava.studio",
            firstName: "Kévin",
            credits: 5,
            subscription: null,
            plans: [],
            packs: [],
            onboarding: {
              version: 3,
              currentStep: "promise_name",
              status: "in_progress",
              universeIds: [],
              identityConsentAt: null,
            },
            identityProfile: null,
            studios: [],
            creations: [],
          }),
        })
        return
      }

      if (url.includes("/api/visual-engine/onboarding")) {
        if (method === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              onboarding: {
                version: 3,
                currentStep: "promise_name",
                status: "in_progress",
                universeIds: [],
                identityConsentAt: null,
              },
            }),
          })
        } else {
          const payload = JSON.parse(route.request().postData() || "{}")
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              onboarding: {
                version: 3,
                currentStep: payload.currentStep || "promise_name",
                status: "in_progress",
                goal: payload.goal || "presence",
                universeIds: payload.universeIds || ["escapade_solaire"],
                identityConsentAt: "2026-08-02T12:00:00.000Z",
              },
            }),
          })
        }
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, studios: [], creations: [] }),
      })
    })

    // Catch-all mock for auth session
    await page.route("**/api/auth/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: { id: "user-1", email: "kevin@mirava.studio" } }),
      })
    })

    // Navigate to studio page
    await page.goto("http://localhost:3000/visual-engine/studio")
    await page.waitForSelector('input[autoComplete="given-name"]', { timeout: 10000 })

    // Step 1 -> Step 2
    const nameInput = page.locator('input[autoComplete="given-name"]')
    await nameInput.fill("Kévin")
    await page.click('footer button.is-primary')
    await page.waitForTimeout(600)

    // Step 2 Goal selection
    const goalCard = page.locator('button[aria-pressed]').first()
    if (await goalCard.isVisible()) {
      await goalCard.click()
      await page.waitForTimeout(1000)
    }

    // Step 3 Universe selection
    const universeCard = page.locator('button[aria-pressed]').first()
    if (await universeCard.isVisible()) {
      await universeCard.click()
      await page.waitForTimeout(400)
    }

    // Step 3 -> Step 4
    await page.click('footer button.is-primary')
    await page.waitForTimeout(600)

    // Step 4 -> Step 5
    await page.click('footer button.is-primary')
    await page.waitForTimeout(600)

    // Capture Step 5: identity_permission with UNCHECKED custom checkbox
    await page.screenshot({ path: path.join(OUTPUT_DIR, `step5_checkbox_unchecked_${vp.name}.png`) })
    console.log(`Captured step5_checkbox_unchecked_${vp.name}.png`)

    // Click custom checkbox
    const customCheckbox = page.locator('button[role="checkbox"]')
    if (await customCheckbox.isVisible()) {
      await customCheckbox.click()
      await page.waitForTimeout(400)
    }

    // Capture Step 5: identity_permission with CHECKED custom checkbox (champagne fill & dark checkmark)
    await page.screenshot({ path: path.join(OUTPUT_DIR, `step5_checkbox_checked_${vp.name}.png`) })
    console.log(`Captured step5_checkbox_checked_${vp.name}.png`)

    // Advance from Step 5 -> Step 6 (camera intro opens)
    await page.click('footer button.is-primary')
    await page.waitForTimeout(800)

    // If camera intro modal opens, close it to reveal Step 6 Activation Card inside MiravaStudioOnboarding
    const closeCameraBtn = page.locator('button:has-text("Plus tard"), header button[aria-label="Fermer"]').first()
    if (await closeCameraBtn.isVisible()) {
      await closeCameraBtn.click()
      await page.waitForTimeout(600)
    }

    // Capture Step 6: activation screen with 3-view identity profile status card
    await page.screenshot({ path: path.join(OUTPUT_DIR, `step6_activation_card_${vp.name}.png`) })
    console.log(`Captured step6_activation_card_${vp.name}.png`)

    await context.close()
  }

  await browser.close()
  console.log("\nAll Camera & Activation captures completed successfully!")
}

capture().catch((err) => {
  console.error("Capture script failed:", err)
  process.exit(1)
})
