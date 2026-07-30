// Webhook interne appelé par un worker pour les mises à jour intermédiaires de mission
import { NextRequest } from "next/server"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { db as prisma } from "@/lib/db"
import { broadcastToChannel } from "@/lib/realtime-server"
import { z } from "zod"
import { randomUUID } from "node:crypto"
import { hasValidInternalWebhookSecret } from "@/lib/internal-webhook"

const schema = z.object({
  message: z.string().min(1),
  source: z.string().optional(), // ex: "Reddit", "GitHub", "Google Trends"
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!hasValidInternalWebhookSecret(req)) return apiError("Unauthorized", 401)
  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const mission = await prisma.autonomousMission.findUnique({
    where: { id: params.id },
    include: { dossier: { select: { id: true } } },
  })
  if (!mission) return apiError("Not found", 404)
  if (mission.status === "FAILED" || mission.status === "CANCELLED") {
    return apiError("Mission is not active", 400)
  }

  const updates = (mission.updates as Array<Record<string, unknown>>) ?? []
  const newUpdate = {
    id: randomUUID(),
    message: result.data.message,
    source: result.data.source ?? null,
    timestamp: new Date().toISOString(),
  }
  updates.push(newUpdate)

  await prisma.autonomousMission.update({
    where: { id: params.id },
    data: { status: "RUNNING", updates },
  })

  // Ajouter une mise à jour dans la KaelSession
  const kaelSession = await prisma.kaelSession.findUnique({ where: { id: mission.kaelSessionId } })
  if (kaelSession) {
    const messages = (kaelSession.messages as Array<Record<string, unknown>>) ?? []

    // Vérifier les préférences de notification de l'utilisateur
    const dossier = await prisma.dossier.findUnique({
      where: { id: mission.dossierId },
      select: { ownerId: true },
    })
    const notifSettings = dossier
      ? await prisma.userNotificationSettings.findUnique({ where: { userId: dossier.ownerId } })
      : null

    if (!notifSettings || notifSettings.missionProgressUpdates) {
      messages.push({
        id: randomUUID(),
        role: "kael",
        content: `**${mission.managerName}** — ${result.data.message}`,
        timestamp: new Date().toISOString(),
        missionId: mission.id,
        isMissionUpdate: true,
      })
      await prisma.kaelSession.update({
        where: { id: mission.kaelSessionId },
        data: { messages },
      })
    }
  }

  // Broadcast Realtime
  broadcastToChannel(mission.dossierId, "mission", {
    type: "mission_update",
    missionId: mission.id,
    message: result.data.message,
    source: result.data.source,
  }).catch(() => undefined)

  return apiSuccess({ ok: true })
}
