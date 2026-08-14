import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess } from "@/lib/visual-engine/http"
import { appendIdentityProfileFromStagedUploads, deleteIdentityProfile, getIdentityProfilePublic, replaceIdentityProfileFromStagedUploads, studioErrorResponse } from "@/lib/visual-engine/core"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"
import {
  requireMiravaIdentityConsent,
  withdrawMiravaIdentityConsent,
} from "@/lib/visual-engine/privacy"

export async function GET() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  try { return apiSuccess({ profile: await getIdentityProfilePublic(session.userId) }) }
  catch (error) { const mapped = studioErrorResponse(error); return apiError(mapped.message, mapped.status) }
}

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const limit = await checkRateLimit("studioUpload", `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop d’envois MIRAVA. Réessayez plus tard.", 429)
  try {
    await requireMiravaIdentityConsent(session.userId)
    const contentType =
      req.headers.get("content-type") ?? ""

    if (
      contentType.includes("application/json")
    ) {
      const body = await req.json() as {
        mode?: string
        creationId?: string
        batchId?: string
        uploads?: Array<{
          path: string
          mimeType: string
          bytes: number
          viewKey?: string
          faceGeometry?: unknown
        }>
        ageConfirmed?: boolean
        rightsConfirmed?: boolean
        retentionAccepted?: boolean
      }

      if (
        ![
          "replace-staged",
          "append-staged",
        ].includes(body.mode ?? "") ||
        typeof body.batchId !== "string" ||
        !Array.isArray(body.uploads)
      ) {
        return apiError(
          "Session d’envoi invalide.",
          400,
        )
      }

      const common = {
        userId: session.userId,
        creationId:
          typeof body.creationId === "string" &&
          body.creationId.length > 0
            ? body.creationId
            : undefined,
        batchId: body.batchId,
        uploads: body.uploads,
        ageConfirmed:
          body.ageConfirmed === true,
        rightsConfirmed:
          body.rightsConfirmed === true,
        retentionAccepted:
          body.retentionAccepted === true,
      }

      const profile =
        body.mode === "append-staged"
          ? await appendIdentityProfileFromStagedUploads(
              common,
            )
          : await replaceIdentityProfileFromStagedUploads(
              common,
            )

      await recordMiravaAudit(
        session.userId,
        body.mode === "append-staged"
          ? "IDENTITY_PROFILE_EXTENDED"
          : "IDENTITY_PROFILE_UPDATED",
        common.creationId ??
          "identity-profile",
      )

      return apiSuccess({ profile })
    }

    return apiError(
      "Ce format d’envoi du Profil identité n’est plus pris en charge.",
      415,
    )
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "MIRAVA_IDENTITY_CONSENT_MISSING"
    ) {
      return apiError(
        "Le consentement au traitement du Profil identité doit être renouvelé avant l’enregistrement.",
        409,
      )
    }

    console.error(
      "[mirava-identity-profile] finalize_failed",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
        code:
          error instanceof Error
            ? error.message
            : "UNKNOWN",
      },
    )

    const mapped =
      studioErrorResponse(error)

    return apiError(
      mapped.message,
      mapped.status,
    )
  }
}

export async function DELETE() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  try {
    await withdrawMiravaIdentityConsent({
      userId: session.userId,
      source: "identity-profile-delete",
    })
    await deleteIdentityProfile(session.userId)
    await recordMiravaAudit(session.userId, "IDENTITY_PROFILE_DELETED", "identity-profile")
    return apiSuccess({ deleted: true, consentWithdrawn: true })
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}
