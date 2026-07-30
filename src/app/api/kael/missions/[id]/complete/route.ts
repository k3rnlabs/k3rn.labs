// Webhook interne appelé par un worker quand la mission est terminée
import { NextRequest } from "next/server"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { db as prisma } from "@/lib/db"
import { broadcastToChannel } from "@/lib/realtime-server"
import { z } from "zod"
import { randomUUID } from "node:crypto"
import { hasValidInternalWebhookSecret } from "@/lib/internal-webhook"

const proposedCardSchema = z.object({
  type: z.string(),
  title: z.string(),
  content: z.record(z.string(), z.unknown()),
}).optional()

const schema = z.object({
  summary: z.string().min(1),
  fullReport: z.object({
    sections: z.array(z.object({ title: z.string(), content: z.string() })),
    sources: z.array(z.object({ name: z.string(), url: z.string().optional(), excerpt: z.string().optional() })).optional(),
    keyInsights: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
  }),
  proposedCard: proposedCardSchema,
  confidence: z.number().min(0).max(1).optional(),
  suggestedCascade: z.object({
    poleCode: z.string(),
    managerName: z.string(),
    reason: z.string(),
  }).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!hasValidInternalWebhookSecret(req)) return apiError("Unauthorized", 401)
  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const mission = await prisma.autonomousMission.findUnique({
    where: { id: params.id },
    include: { dossier: { select: { id: true, ownerId: true } } },
  })
  if (!mission) return apiError("Not found", 404)

  const { summary, fullReport, proposedCard, confidence, suggestedCascade } = result.data

  // Marquer la mission comme terminée
  await prisma.autonomousMission.update({
    where: { id: params.id },
    data: {
      status: "DONE",
      completedAt: new Date(),
      result: { summary, fullReport, proposedCard, confidence, suggestedCascade },
    },
  })

  // Construire le message KAEL avec le livrable
  const cascadeText = suggestedCascade
    ? `\n\n**Suite suggérée :** ${suggestedCascade.reason} — Je peux envoyer **${suggestedCascade.managerName}** en mission. [Lancer] [Ignorer]`
    : ""

  const kaelMessage = {
    id: randomUUID(),
    role: "kael",
    content: `**${mission.managerName} a terminé sa mission.**\n\n${summary}${cascadeText}`,
    timestamp: new Date().toISOString(),
    missionId: mission.id,
    isMissionResult: true,
    missionResult: { summary, fullReport, proposedCard, confidence, suggestedCascade },
  }

  // Ajouter dans la KaelSession
  const kaelSession = await prisma.kaelSession.findUnique({ where: { id: mission.kaelSessionId } })
  if (kaelSession) {
    const messages = (kaelSession.messages as Array<Record<string, unknown>>) ?? []
    messages.push(kaelMessage)
    await prisma.kaelSession.update({
      where: { id: mission.kaelSessionId },
      data: { messages },
    })
  }

  // Broadcast Realtime
  broadcastToChannel(mission.dossierId, "mission", {
    type: "mission_complete",
    missionId: mission.id,
    summary,
    proposedCard,
    suggestedCascade,
  }).catch(() => undefined)

  // Notification Telegram si activée
  const notifSettings = await prisma.userNotificationSettings.findUnique({
    where: { userId: mission.dossier.ownerId },
  })
  if (notifSettings?.telegramOnComplete && notifSettings.telegramChatId) {
    // Notification directe via le Bot API Telegram
    const { notifyTelegram } = await import("@/lib/llm")
    notifyTelegram(notifSettings.telegramChatId, [
      `✅ *Mission terminée* — ${mission.managerName}`,
      `📋 ${summary}`,
      `Retourne dans ton workspace pour voir le rapport complet.`,
    ].join("\n\n")).catch(() => undefined)
  }

  return apiSuccess({ ok: true })
}
