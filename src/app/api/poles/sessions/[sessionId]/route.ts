import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { buildProjectMemory } from "@/lib/project-memory"
import { invokeExpertDirect, triggerKAELPostSessionNote, triggerDocumentExtraction } from "@/lib/claude"
import { computeAndPersistScore } from "@/lib/score-engine"
import { checkMissionBudget, consumeMission } from "@/lib/mission-budget"
import { publicPoleSession } from "@/lib/public-dto"
import { z } from "zod"
import { randomUUID } from "node:crypto"

const schema = z.object({
  userMessage: z.string().min(1).max(4000),
})

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const poleSession = await prisma.poleSession.findUnique({
    where: { id: params.sessionId },
    include: { pole: true, dossier: true },
  })
  if (!poleSession) return apiError("Session not found", 404)
  if (poleSession.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  // Vérifier le budget avant d'invoquer l'expert
  const budgetCheck = await checkMissionBudget(session.userId)
  if (!budgetCheck.ok) return apiError(budgetCheck.reason, 403)

  const messages = poleSession.messages as Array<Record<string, any>>
  const projectMemory = await buildProjectMemory(poleSession.dossierId)

  // Historique propre pour le LLM
  const cleanHistory = messages.map((m) => ({
    role: (m.role === "manager" ? "assistant" : "user") as "user" | "assistant",
    content: (m.content as string) ?? "",
  }))

  const expertResponse = await invokeExpertDirect({
    managerName: poleSession.pole.managerName,
    systemPrompt: poleSession.pole.systemPrompt,
    userMessage: result.data.userMessage,
    history: cleanHistory,
    projectMemory,
    labContext: poleSession.labAtCreation,
  })

  const userMsg = {
    id: randomUUID(),
    role: "user",
    content: result.data.userMessage,
    timestamp: new Date().toISOString(),
  }

  const managerMsg = {
    id: randomUUID(),
    role: "manager",
    content: expertResponse,
    timestamp: new Date().toISOString(),
  }

  const newMessages = [...messages, userMsg, managerMsg]

  const updated = await prisma.poleSession.update({
    where: { id: params.sessionId },
    data: {
      messages: newMessages,
    },
  })

  const lastManagerMsg = managerMsg

  // Débiter la mission (appel expert consommé)
  consumeMission(session.userId).catch(() => undefined)

  // Score recompute post-session — fire and forget
  computeAndPersistScore(poleSession.dossierId).catch(() => undefined)

  // Synthèse KAEL post-session — fire and forget, ne bloque pas la réponse
  if (lastManagerMsg) {
    const exchangeSummary = [
      `Utilisateur : ${result.data.userMessage}`,
      `${poleSession.pole.managerName} : ${lastManagerMsg.content}`,
    ].join("\n")
    triggerKAELPostSessionNote(
      poleSession.dossierId,
      poleSession.pole.code,
      poleSession.pole.managerName,
      exchangeSummary
    ).catch(() => undefined)
  }

  // Document extraction post-session — fire and forget
  const allMessages = updated.messages as Array<{ role: string; content: string }>
  triggerDocumentExtraction(
    poleSession.dossierId,
    poleSession.pole.code,
    poleSession.pole.managerName,
    poleSession.id,
    allMessages
  ).catch(() => undefined)

  return apiSuccess({
    session: updated,
    managerResponse: lastManagerMsg,
    executionStatus: "COMPLETED",
  })
}

export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const poleSession = await prisma.poleSession.findUnique({
    where: { id: params.sessionId },
    include: { pole: true, dossier: true },
  })
  if (!poleSession) return apiError("Not found", 404)
  if (poleSession.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  return apiSuccess(publicPoleSession(poleSession))
}
