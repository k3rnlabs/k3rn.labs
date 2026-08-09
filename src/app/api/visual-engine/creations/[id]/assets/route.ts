import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess } from "@/lib/visual-engine/http"
import { studioErrorResponse, uploadStudioAsset } from "@/lib/visual-engine/core"
import { recordMiravaAudit } from "@/lib/visual-engine/audit"

type RouteContext = { params: { id: string } }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const limit = await checkRateLimit("studioUpload", `${session.userId}:${req.headers.get("x-forwarded-for") ?? "local"}`)
  if (!limit.success) return apiError("Trop d’envois MIRAVA. Réessayez plus tard.", 429)
  try {
    const form = await req.formData()
    const kind = form.get("kind")
    const file = form.get("file")
    const referenceFaceGeometryRaw =
      form.get(
        "referenceFaceGeometry",
      )

    let referenceFaceGeometry:
      unknown =
      undefined

    if (
      referenceFaceGeometryRaw !==
      null
    ) {
      if (
        typeof referenceFaceGeometryRaw !==
        "string"
      ) {
        return apiError(
          "La géométrie faciale de la référence est invalide.",
          400,
        )
      }

      try {
        referenceFaceGeometry =
          JSON.parse(
            referenceFaceGeometryRaw,
          )
      } catch {
        return apiError(
          "La géométrie faciale de la référence est invalide.",
          400,
        )
      }
    }
    if ((kind !== "REFERENCE" && kind !== "IDENTITY") || !file || typeof file === "string") {
      return apiError("Un fichier image et son type sont requis.", 400)
    }
    const asset = await uploadStudioAsset({
      userId: session.userId,
      creationId: params.id,
      kind,
      mimeType: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
      referenceFaceGeometry,
    })
    await recordMiravaAudit(session.userId, "ASSET_UPLOADED", params.id)
    return apiSuccess({ asset: { id: asset.id, kind: asset.kind, createdAt: asset.createdAt } }, 201)
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return apiError(mapped.message, mapped.status)
  }
}
