import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { broadcastToChannel } from "@/lib/realtime-server"
import { invokeExpertDirect } from "@/lib/claude"
import { buildProjectMemory } from "@/lib/project-memory"
import { checkMissionBudget, consumeMission } from "@/lib/mission-budget"
import { z } from "zod"
import { randomUUID } from "node:crypto"

const schema = z.object({
  missionId: z.string().min(1),
  poleSessionId: z.string().min(1),
})

/**
 * Exécute la mission autonome et injecte le rapport dans la PoleSession.
 * Séparé de executeAutonomousMission dans missions/route.ts pour injecter dans PoleSession.
 */
async function executeMissionIntoPoleSession(
  missionId: string,
  dossierId: string,
  poleSessionId: string,
  systemPrompt: string,
  managerName: string,
  briefFinal: string,
) {
  try {
    // 1. Mark RUNNING + broadcast
    await prisma.autonomousMission.update({
      where: { id: missionId },
      data: { status: "RUNNING" },
    })
    broadcastToChannel(dossierId, "mission", {
      type: "mission_update",
      missionId,
      status: "RUNNING",
      message: `${managerName} analyse le brief et collecte les données…`,
    }).catch(() => undefined)

    // 2. Get pole session for history context
    const poleSession = await prisma.poleSession.findUnique({ where: { id: poleSessionId } })
    const existingMessages = (poleSession?.messages ?? []) as Array<Record<string, unknown>>

    // 3. Build project memory
    const projectMemory = await buildProjectMemory(dossierId)

    // 4. Build history from pole session (user message = brief)
    const history = existingMessages
      .filter((m) => m.role === "user" || m.role === "manager")
      .map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: String(m.content ?? ""),
      }))
      // Remove last manager message (the plan) — we'll call with execute prompt
      .filter((_, i, arr) => !(i === arr.length - 1 && arr[i].role === "assistant"))

    // Extract the brief (first user message)
    const briefMessage = existingMessages.find((m) => m.role === "user")
    const briefContent = String(briefMessage?.content ?? briefFinal)

    // 5. Call expert with execution prompt
    const executionPrompt = `${systemPrompt}

Tu as présenté ton plan à l'utilisateur qui l'a confirmé. Execute maintenant la mission complète.
Produis un rapport structuré, complet et actionnable.
- Utilise tes connaissances approfondies de ton domaine
- Structure le rapport avec des sections claires et numérotées
- Inclus des recommandations concrètes avec des actions précises
- Fournis des données, frameworks ou analyses selon ta spécialité
- Conclus avec 3-5 prochaines étapes prioritaires (nextSteps)`

    broadcastToChannel(dossierId, "mission", {
      type: "mission_update",
      missionId,
      status: "RUNNING",
      message: `${managerName} rédige le rapport final…`,
    }).catch(() => undefined)

    const report = await invokeExpertDirect({
      managerName,
      systemPrompt: executionPrompt,
      userMessage: `Execute la mission : ${briefContent}`,
      history,
      projectMemory,
      labContext: String(poleSession?.labAtCreation ?? "DISCOVERY"),
    })

    // 6. Persist result in AutonomousMission
    await prisma.autonomousMission.update({
      where: { id: missionId },
      data: {
        status: "DONE",
        actualCost: 1,
        result: { summary: report, fullReport: report },
        completedAt: new Date().toISOString() as any,
      },
    })

    // 7. Inject result as manager message in PoleSession
    const resultMsgId = randomUUID()
    const updatedMessages = [
      ...existingMessages,
      {
        id: resultMsgId,
        role: "manager",
        content: report,
        timestamp: new Date().toISOString(),
        isMissionResult: true,
        missionId,
      },
    ]
    await prisma.poleSession.update({
      where: { id: poleSessionId },
      data: { messages: updatedMessages },
    })

    // 8. Create tasks from report if nextSteps detected
    try {
      const nextStepsMatch = report.match(/(?:prochaines?\s+étapes?|next\s+steps?)[:\s]*\n([\s\S]{0,1000})/i)
      if (nextStepsMatch) {
        const lines = nextStepsMatch[1]
          .split("\n")
          .map((l) => l.replace(/^[\d\-\*\.\s]+/, "").trim())
          .filter((l) => l.length > 10 && l.length < 200)
          .slice(0, 5)

        for (const title of lines) {
          await prisma.task.create({
            data: {
              dossierId,
              title,
              description: `Issu du rapport de mission ${managerName} — ${new Date().toLocaleDateString("fr-FR")}`,
              status: "SUGGESTED",
              origin: "mission",
              originId: missionId,
              assignedPole: null,
            },
          })
        }
      }
    } catch {
      // Task creation is non-critical
    }

    // 9. Broadcast DONE
    broadcastToChannel(dossierId, "mission", {
      type: "mission_done",
      missionId,
      poleSessionId,
      status: "DONE",
      summary: report.slice(0, 300),
    }).catch(() => undefined)
  } catch {
    await prisma.autonomousMission.update({
      where: { id: missionId },
      data: { status: "FAILED" },
    }).catch(() => undefined)
    broadcastToChannel(dossierId, "mission", {
      type: "mission_failed",
      missionId,
      status: "FAILED",
    }).catch(() => undefined)
  }
}

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const { missionId, poleSessionId } = result.data

  // Verify mission exists and belongs to user
  const mission = await prisma.autonomousMission.findUnique({ where: { id: missionId } })
  if (!mission) return apiError("Mission not found", 404)

  const dossier = await prisma.dossier.findUnique({ where: { id: mission.dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  if (mission.status !== "BRIEFING") {
    return apiError("Mission is not in BRIEFING status", 400)
  }

  // Check budget
  const budgetCheck = await checkMissionBudget(session.userId)
  if (!budgetCheck.ok) {
    return apiError(`Budget insuffisant. ${budgetCheck.reason}`, 403)
  }

  // Get pole for system prompt
  const pole = await prisma.pole.findFirst({ where: { code: mission.poleCode as any } })
  if (!pole) return apiError("Pole not found", 404)

  // Get pole session for brief
  const poleSession = await prisma.poleSession.findUnique({ where: { id: poleSessionId } })
  if (!poleSession || poleSession.dossierId !== mission.dossierId) return apiError("PoleSession not found", 404)

  // Debit budget
  await consumeMission(session.userId)

  // Update mission to PENDING
  await prisma.autonomousMission.update({
    where: { id: missionId },
    data: {
      status: "PENDING",
      actualCost: mission.estimatedCost,
    },
  })

  // Extract brief from pole session
  const messages = (poleSession.messages ?? []) as Array<Record<string, unknown>>
  const briefMsg = messages.find((m) => m.role === "user")
  const briefFinal = String(briefMsg?.content ?? mission.objective)

  // Fire-and-forget execution
  executeMissionIntoPoleSession(
    missionId,
    mission.dossierId,
    poleSessionId,
    pole.systemPrompt,
    mission.managerName,
    briefFinal,
  ).catch(() => undefined)

  return apiSuccess({ ok: true, missionId, poleSessionId })
}
