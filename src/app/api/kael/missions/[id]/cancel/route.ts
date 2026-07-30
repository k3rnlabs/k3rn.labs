import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/validate"
import { db as prisma } from "@/lib/db"
import { broadcastToChannel } from "@/lib/realtime-server"
import { randomUUID } from "node:crypto"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const mission = await prisma.autonomousMission.findUnique({
    where: { id: params.id },
    include: { dossier: { select: { ownerId: true } } },
  })
  if (!mission) return apiError("Not found", 404)
  if (mission.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)
  if (mission.status === "DONE" || mission.status === "FAILED") {
    return apiError("Cannot cancel a finalized mission", 400)
  }

  // Remboursement uniquement si la mission n'a pas encore démarré (BRIEFING ou PENDING)
  const shouldRefund = mission.status === "BRIEFING" || mission.status === "PENDING"

  await prisma.$transaction(async (tx: any) => {
    await tx.autonomousMission.update({
      where: { id: params.id },
      data: { status: "CANCELLED", completedAt: new Date(), actualCost: shouldRefund ? 0 : mission.estimatedCost },
    })

    if (shouldRefund) {
      await tx.user.update({
        where: { id: session.userId },
        data: { missionBudget: { increment: mission.estimatedCost } },
      })
    }

    // Message d'annulation dans la KaelSession
    const kaelSession = await tx.kaelSession.findUnique({ where: { id: mission.kaelSessionId } })
    if (kaelSession) {
      const messages = (kaelSession.messages as Array<Record<string, unknown>>) ?? []
      messages.push({
        id: randomUUID(),
        role: "kael",
        content: `Mission annulée.${shouldRefund ? ` Ton budget a été remboursé (${mission.estimatedCost} mission${mission.estimatedCost > 1 ? "s" : ""}).` : ""}`,
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
    type: "mission_cancelled",
    missionId: mission.id,
  }).catch(() => undefined)

  return apiSuccess({ ok: true, refunded: shouldRefund ? mission.estimatedCost : 0 })
}
