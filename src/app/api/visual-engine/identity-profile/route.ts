import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { apiError, apiSuccess } from "@/lib/validate"
import { appendIdentityProfile, deleteIdentityProfile, getIdentityProfilePublic, MAX_IDENTITY_ASSETS, MIN_IDENTITY_ASSETS, replaceIdentityProfile, studioErrorResponse, updateIdentityProfilePhysicalTraits } from "@/lib/visual-engine/core"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"
import { type PhysicalTrait, MAX_TRAITS, MAX_DESCRIPTION_LENGTH, TRAIT_KINDS, BODY_ZONES, isValidPhysicalTrait } from "@/lib/mirava/physical-traits"

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
    const form = await req.formData()
    const creationId = form.get("creationId")
    const mode = form.get("mode") === "append" ? "append" : "replace"
    const files = form.getAll("file").filter((file): file is File => file instanceof File)
    if ((mode === "replace" && files.length < MIN_IDENTITY_ASSETS) || files.length < 1 || files.length > MAX_IDENTITY_ASSETS) {
      return apiError(mode === "append" ? "Ajoutez au moins une photo." : "Entre trois et six photos sont requises.", 400)
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
  } catch (error) { const mapped = studioErrorResponse(error); return apiError(mapped.message, mapped.status) }
}

export async function DELETE() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  try { await deleteIdentityProfile(session.userId); await recordMiravaAudit(session.userId, "IDENTITY_PROFILE_DELETED", "identity-profile"); return apiSuccess({ deleted: true }) }
  catch (error) { const mapped = studioErrorResponse(error); return apiError(mapped.message, mapped.status) }
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const limit = await checkRateLimit("mutations", `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop de requêtes. Réessayez plus tard.", 429)
  try {
    const body = await req.json() as { traits?: unknown }
    if (!Array.isArray(body.traits)) return apiError("Format invalide.", 400)
    if (body.traits.length > MAX_TRAITS) return apiError(`Maximum ${MAX_TRAITS} caractéristiques autorisées.`, 400)
    const traits = body.traits as unknown[]
    if (!traits.every(isValidPhysicalTrait)) return apiError("Une ou plusieurs caractéristiques sont invalides.", 400)
    await updateIdentityProfilePhysicalTraits(session.userId, traits as PhysicalTrait[])
    await recordMiravaAudit(session.userId, "IDENTITY_PROFILE_UPDATED", "physical-traits")
    return apiSuccess({ ok: true })
  } catch (error) { const mapped = studioErrorResponse(error); return apiError(mapped.message, mapped.status) }
}
