import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { computeAndPersistScore } from "@/lib/score-engine"
import { broadcastToChannel } from "@/lib/realtime-server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { sessionId } = await params
  const expertSession = await prisma.expertSession.findUnique({
    where: { id: sessionId },
    include: {
      expert: true,
      dossier: { include: { subFolders: true, labState: true } },
    },
  })
  if (!expertSession) return apiError("Session not found", 404)
  if (expertSession.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)
  if (expertSession.status !== "WAITING_VALIDATION") {
    return apiError("Session is not waiting for validation", 422)
  }

  const proposedCard = expertSession.proposedCard as { type: string; title: string; content: Record<string, unknown> } | null
  if (!proposedCard) return apiError("No proposed card to validate", 422)

  const currentLab = expertSession.dossier.labState?.currentLab
  if (!currentLab) return apiError("No active LAB", 422)

  const targetSubFolder = expertSession.dossier.subFolders[0]

  const card = await prisma.card.create({
    data: {
      subFolderId: targetSubFolder.id,
      lab: currentLab,
      type: proposedCard.type,
      title: proposedCard.title,
      content: proposedCard.content as any,
      state: "VALIDATED",
    },
  })

  await prisma.cardTransitionLog.create({
    data: {
      cardId: card.id,
      fromState: "DRAFT",
      toState: "VALIDATED",
      triggeredBy: session.userId,
      expertSessionId: sessionId,
    },
  })

  await prisma.expertSession.update({
    where: { id: sessionId },
    data: { status: "VALIDATED", cardId: card.id },
  })

  await createAuditLog({
    userId: session.userId,
    dossierId: expertSession.dossierId,
    action: "EXPERT_SESSION_VALIDATED",
    entity: "ExpertSession",
    entityId: sessionId,
    metadata: { cardType: proposedCard.type },
  })

  const score = await computeAndPersistScore(expertSession.dossierId, card.id)
  await broadcastToChannel(expertSession.dossierId, "score", score)

  return apiSuccess({ card, score })
}
