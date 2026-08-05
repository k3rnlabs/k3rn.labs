import {
  createHash,
  timingSafeEqual,
} from "crypto"
import { waitUntil } from "@vercel/functions"
import {
  nextStudioJobDelayForCreation,
  processNextStudioJobForCreation,
  recoverStaleStudioJobsForCreation,
} from "@/lib/visual-engine/core"

const INTERNAL_WORKER_PATH =
  "/api/visual-engine/internal/worker"

const MAX_CHAIN_WAIT_MS = 60_000

function workerSecret(): string | null {
  return (
    process.env.MIRAVA_WORKER_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    null
  )
}

function workerToken(): string | null {
  const secret = workerSecret()

  if (!secret) return null

  /*
   * La clé Supabase brute ne circule jamais dans la requête interne.
   * Seule une empreinte dédiée MIRAVA est transmise.
   */
  return createHash("sha256")
    .update(
      `mirava-vercel-worker-v1:${secret}`,
    )
    .digest("hex")
}

function sleep(
  milliseconds: number,
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

export function isMiravaWorkerRequestAuthorized(
  request: Request,
): boolean {
  const expected = workerToken()

  if (!expected) return false

  const authorization =
    request.headers.get("authorization")

  const received =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : ""

  const expectedBuffer =
    Buffer.from(expected)

  const receivedBuffer =
    Buffer.from(received)

  return (
    expectedBuffer.length ===
      receivedBuffer.length &&
    timingSafeEqual(
      expectedBuffer,
      receivedBuffer,
    )
  )
}

async function invokeNextWorker(
  origin: string,
  creationId: string,
): Promise<void> {
  const token = workerToken()

  if (!token) {
    throw new Error(
      "MIRAVA_WORKER_SECRET_MISSING",
    )
  }

  const response = await fetch(
    `${origin}${INTERNAL_WORKER_PATH}`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${token}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        creationId,
      }),
      cache: "no-store",
    },
  )

  if (!response.ok) {
    throw new Error(
      `MIRAVA_WORKER_CHAIN_${response.status}`,
    )
  }
}

export async function runMiravaStudioWorkUnit(
  origin: string,
  creationId: string,
): Promise<void> {
  await recoverStaleStudioJobsForCreation(
    creationId,
  )

  await processNextStudioJobForCreation(
    creationId,
  )

  const delay =
    await nextStudioJobDelayForCreation(
      creationId,
    )

  if (delay === null) {
    return
  }

  /*
   * Les erreurs temporaires utilisent nextRunAt. L'invocation courante
   * attend au maximum une minute, puis déclenche la suivante.
   */
  if (delay > 0) {
    await sleep(
      Math.min(
        delay,
        MAX_CHAIN_WAIT_MS,
      ),
    )
  }

  await invokeNextWorker(
    origin,
    creationId,
  )
}

export function scheduleMiravaStudioWork(
  request: Request,
  creationId: string,
): void {
  const origin =
    new URL(request.url).origin

  const task =
    runMiravaStudioWorkUnit(
      origin,
      creationId,
    ).catch((error: unknown) => {
      console.error(
        "[MIRAVA Vercel worker]",
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              creationId,
            }
          : {
              name: "unknown",
              creationId,
            },
      )
    })

  try {
    waitUntil(task)
  } catch {
    /*
     * Fallback local et tests hors runtime Vercel.
     * En production, waitUntil garde officiellement la fonction active.
     */
    void task
  }
}
