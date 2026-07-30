import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { computeAndPersistScore } from "@/lib/score-engine"
import { broadcastToChannel } from "@/lib/realtime-server"
import { z } from "zod"
import type { CardState } from "@prisma/client"

const VALID_CARD_TRANSITIONS: Record<CardState, CardState[]> = {
  DRAFT: ["VALIDATED", "REJECTED"],
  VALIDATED: ["ARCHIVED"],
  REJECTED: [],
  ARCHIVED: [],
}

const schema = z.object({
  state: z.enum(["DRAFT", "VALIDATED", "REJECTED", "ARCHIVED"]),
  expertSessionId: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const card = await prisma.card.findUnique({
    where: { id },
    include: { subFolder: { include: { dossier: true } } },
  })
  if (!card) return apiError("Card not found", 404)
  if (card.subFolder.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const allowed = (VALID_CARD_TRANSITIONS[card.state as CardState] ?? []) as CardState[]
  if (!allowed.includes(result.data.state)) {
    return apiError(`Transition ${card.state} → ${result.data.state} not allowed`, 422)
  }

  const [updatedCard] = await prisma.$transaction([
    prisma.card.update({ where: { id }, data: { state: result.data.state } }),
    prisma.cardTransitionLog.create({
      data: {
        cardId: id,
        fromState: card.state,
        toState: result.data.state,
        triggeredBy: session.userId,
        expertSessionId: result.data.expertSessionId,
      },
    }),
  ])

  await createAuditLog({
    userId: session.userId,
    dossierId: card.subFolder.dossierId,
    action: "CARD_STATE_TRANSITION",
    entity: "Card",
    entityId: id,
    metadata: { from: card.state, to: result.data.state },
  })

  if (result.data.state === "VALIDATED") {
    const score = await computeAndPersistScore(card.subFolder.dossierId, id)
    await broadcastToChannel(card.subFolder.dossierId, "score", score)
  }

  return apiSuccess(updatedCard)
}
