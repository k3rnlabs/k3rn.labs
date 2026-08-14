import {
  type NextRequest,
} from "next/server"

import {
  hasValidInternalWebhookSecret,
} from "@/lib/internal-webhook"

import {
  MiravaLookStorageGcError,
  runMiravaLookStorageGc,
} from "@/lib/mirava/session-builder/look-storage-gc"

import {
  apiError,
  apiSuccess,
} from "@/lib/validate"

export const dynamic =
  "force-dynamic"

function hasValidCronSecret(
  request:
    NextRequest,
): boolean {
  const expected =
    process.env
      .CRON_SECRET

  const received =
    request.headers.get(
      "authorization",
    )

  return Boolean(
    expected &&
    received ===
      `Bearer ${expected}`,
  )
}

function isAuthorized(
  request:
    NextRequest,
): boolean {
  return (
    hasValidCronSecret(
      request,
    ) ||
    hasValidInternalWebhookSecret(
      request,
    )
  )
}

function wantsDryRun(
  request:
    NextRequest,
): boolean {
  const value =
    new URL(
      request.url,
    )
      .searchParams
      .get(
        "dryRun",
      )
      ?.trim()
      .toLowerCase()

  return (
    value === "1" ||
    value === "true" ||
    value === "yes"
  )
}

export async function GET(
  request:
    NextRequest,
) {
  if (
    !isAuthorized(
      request,
    )
  ) {
    return apiError(
      "Unauthorized",
      401,
    )
  }

  try {
    const report =
      await runMiravaLookStorageGc({
        dryRun:
          wantsDryRun(
            request,
          ),
      })

    return apiSuccess({
      ok:
        true,
      report,
    })
  } catch (
    error
  ) {
    if (
      error instanceof
        MiravaLookStorageGcError
    ) {
      console.error(
        "[mirava-look-storage-gc]",
        error.code,
      )
    } else {
      console.error(
        "[mirava-look-storage-gc]",
        "UNKNOWN_ERROR",
      )
    }

    return apiError(
      "MIRAVA look storage maintenance failed.",
      503,
    )
  }
}
