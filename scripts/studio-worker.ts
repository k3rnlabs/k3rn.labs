/**
 * MIRAVA private studio worker
 *
 * Run in production alongside the Next.js process:
 * pm2 start scripts/studio-worker.ts --interpreter tsx --name mirava-studio-worker
 */
import "dotenv/config"
import { processNextStudioJob, purgeExpiredStudioAssets, recoverStaleStudioJobs } from "../src/lib/visual-engine/core"
import { expireMiravaCreditLots } from "../src/lib/visual-engine/credits"

const POLL_INTERVAL_MS = 2_000
const PURGE_INTERVAL_MS = 5 * 60_000
const CREDIT_EXPIRY_INTERVAL_MS = 60 * 60_000

async function main() {
  console.info("[Studio worker] started")
  const recovered = await recoverStaleStudioJobs()
  if (recovered) console.info(JSON.stringify({ event: "STUDIO_JOBS_RECOVERED", count: recovered }))
  let lastPurge = 0
  let lastCreditExpiry = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const processed = await processNextStudioJob()
      if (!processed) await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
      if (Date.now() - lastPurge >= PURGE_INTERVAL_MS) {
        const purged = await purgeExpiredStudioAssets()
        if (purged) console.info(JSON.stringify({ event: "STUDIO_ASSETS_PURGED", count: purged }))
        lastPurge = Date.now()
      }
      if (Date.now() - lastCreditExpiry >= CREDIT_EXPIRY_INTERVAL_MS) {
        const expired = await expireMiravaCreditLots()
        if (expired) console.info(JSON.stringify({ event: "MIRAVA_CREDIT_LOTS_EXPIRED", count: expired }))
        lastCreditExpiry = Date.now()
      }
    } catch (error) {
      console.error("[Studio worker] processing error", error instanceof Error ? error.name : "unknown")
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }
}

main().catch(() => process.exit(1))
