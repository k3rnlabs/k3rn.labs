// Webhook interne appelé par un worker si la mission échoue
import { NextRequest } from "next/server"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { db as prisma } from "@/lib/db"
import { broadcastToChannel } from "@/lib/realtime-server"
import { z } from "zod"
import { randomUUID } from "node:crypto"
import { hasValidInternalWebhookSecret } from "@/lib/internal-webhook"

const schema = z.object({
  reason: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!hasValidInternalWebhookSecret(req)) return apiError("Unauthorized", 401)
  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const mission = await prisma.autonomousMission.findUnique({
    where: { id: params.id },
    include: { dossier: { select: { ownerId: true } } },
  })
  if (!mission) return apiError("Not found", 404)
  if (mission.status === "DONE" || mission.status === "CANCELLED" || mission.status === "FAILED") {
    return apiError("Mission already finalized", 400)
  }

  // Remboursement du budget + mise à jour statut (transaction atomique)
  await prisma.$transaction(async (tx: any) => {
    await tx.autonomousMission.update({
      where: { id: params.id },
      data: { status: "FAILED", completedAt: new Date(), actualCost: 0 },
    })
    await tx.user.update({
      where: { id: mission.dossier.ownerId },
      data: { missionBudget: { increment: mission.estimatedCost } },
    })

    // Message d'erreur dans la KaelSession
    const kaelSession = await tx.kaelSession.findUnique({ where: { id: mission.kaelSessionId } })
    if (kaelSession) {
      const messages = (kaelSession.messages as Array<Record<string, unknown>>) ?? []
      messages.push({
        id: randomUUID(),
        role: "kael",
        content: `La mission de **${mission.managerName}** a rencontré une erreur et n'a pas pu aboutir. Ton budget a été remboursé (${mission.estimatedCost} mission${mission.estimatedCost > 1 ? "s" : ""}). Tu peux relancer la mission si tu le souhaites.`,
        timestamp: new Date().toISOString(),
        missionId: mission.id,
        isMissionStatus: true,
      })
      await tx.kaelSession.update({
        where: { id: mission.kaelSessionId },
        data: { messages },
      })
    }
  })

  broadcastToChannel(mission.dossierId, "mission", {
    type: "mission_failed",
    missionId: mission.id,
    reason: result.data.reason,
  }).catch(() => undefined)

  return apiSuccess({ ok: true, refunded: mission.estimatedCost })
}
