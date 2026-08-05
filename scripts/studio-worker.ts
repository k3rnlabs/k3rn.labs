/**
 * MIRAVA production Studio worker.
 *
 * Ce processus est exécuté en continu par un hébergeur de
 * background workers. Il ne doit pas être lancé dans une
 * Vercel Function.
 */
import "dotenv/config"

import {
  processNextStudioJob,
  purgeExpiredStudioAssets,
  recoverStaleStudioJobs,
} from "../src/lib/visual-engine/core"
import {
  expireMiravaCreditLots,
} from "../src/lib/visual-engine/credits"

const POLL_INTERVAL_MS = 2_000
const RECOVERY_INTERVAL_MS = 60_000
const PURGE_INTERVAL_MS = 5 * 60_000
const CREDIT_EXPIRY_INTERVAL_MS = 60 * 60_000

let stopping = false

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  )
}

function requestShutdown(signal: string): void {
  console.info(
    JSON.stringify({
      event: "STUDIO_WORKER_SHUTDOWN_REQUESTED",
      signal,
    }),
  )

  stopping = true
}

process.on(
  "SIGTERM",
  () => requestShutdown("SIGTERM"),
)

process.on(
  "SIGINT",
  () => requestShutdown("SIGINT"),
)

async function recoverJobs(): Promise<void> {
  const recovered =
    await recoverStaleStudioJobs()

  if (recovered > 0) {
    console.info(
      JSON.stringify({
        event: "STUDIO_JOBS_RECOVERED",
        count: recovered,
      }),
    )
  }
}

async function main(): Promise<void> {
  console.info(
    JSON.stringify({
      event: "STUDIO_WORKER_STARTED",
      pid: process.pid,
    }),
  )

  await recoverJobs()

  let lastRecovery = Date.now()
  let lastPurge = 0
  let lastCreditExpiry = 0

  while (!stopping) {
    try {
      const processed =
        await processNextStudioJob()

      const now = Date.now()

      if (
        now - lastRecovery >=
        RECOVERY_INTERVAL_MS
      ) {
        await recoverJobs()
        lastRecovery = now
      }

      if (
        now - lastPurge >=
        PURGE_INTERVAL_MS
      ) {
        const purged =
          await purgeExpiredStudioAssets()

        if (purged > 0) {
          console.info(
            JSON.stringify({
              event: "STUDIO_ASSETS_PURGED",
              count: purged,
            }),
          )
        }

        lastPurge = now
      }

      if (
        now - lastCreditExpiry >=
        CREDIT_EXPIRY_INTERVAL_MS
      ) {
        const expired =
          await expireMiravaCreditLots()

        if (expired > 0) {
          console.info(
            JSON.stringify({
              event:
                "MIRAVA_CREDIT_LOTS_EXPIRED",
              count: expired,
            }),
          )
        }

        lastCreditExpiry = now
      }

      if (!processed && !stopping) {
        await sleep(POLL_INTERVAL_MS)
      }
    } catch (error) {
      console.error(
        "[Studio worker] processing error",
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
            }
          : {
              name: "unknown",
            },
      )

      if (!stopping) {
        await sleep(POLL_INTERVAL_MS)
      }
    }
  }

  console.info(
    JSON.stringify({
      event: "STUDIO_WORKER_STOPPED",
    }),
  )
}

main().catch((error) => {
  console.error(
    "[Studio worker] fatal error",
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
        }
      : {
          name: "unknown",
        },
  )

  process.exit(1)
})
