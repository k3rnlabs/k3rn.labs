import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess } from "@/lib/visual-engine/http"
import { appendIdentityProfile, appendIdentityProfileFromStagedUploads, deleteIdentityProfile, getIdentityProfilePublic, MAX_IDENTITY_ASSETS, MIN_IDENTITY_ASSETS, replaceIdentityProfile, replaceIdentityProfileFromStagedUploads, studioErrorResponse } from "@/lib/visual-engine/core"
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

    const form = await req.formData()
    const creationId = form.get("creationId")
    const mode = form.get("mode") === "append" ? "append" : "replace"
    const files = form.getAll("file").filter((file): file is File => file instanceof File)
    if ((mode === "replace" && files.length < MIN_IDENTITY_ASSETS) || files.length < 1 || files.length > MAX_IDENTITY_ASSETS) {
      return apiError(mode === "append" ? "Ajoutez au moins une photo." : "Entre trois et dix photos sont requises.", 400)
    }
    const normalizedCreationId = typeof creationId === "string" && creationId.length > 0 ? creationId : undefined
    const updateProfile = mode === "append" ? appendIdentityProfile : replaceIdentityProfile
    const profile = await updateProfile({
      userId: session.userId,
      creationId: normalizedCreationId,
      ageConfirmed: form.get("ageConfirmed") === "true",
      rightsConfirmed: form.get("rightsConfirmed") === "true",
      retentionAccepted: form.get("retentionAccepted") === "true",
      files: await Promise.all(files.map(async (file) => ({ mimeType: file.type, buffer: Buffer.from(await file.arrayBuffer()) }))),
    })
    await recordMiravaAudit(session.userId, mode === "append" ? "IDENTITY_PROFILE_EXTENDED" : "IDENTITY_PROFILE_UPDATED", normalizedCreationId ?? "identity-onboarding")
    return apiSuccess({ profile })
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
