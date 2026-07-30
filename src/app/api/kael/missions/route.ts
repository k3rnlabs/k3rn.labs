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
  dossierId: z.string().min(1),
  kaelSessionId: z.string().min(1),
  poleCode: z.string().min(1),
  managerName: z.string().min(1),
  objective: z.string().min(1),
  estimatedCost: z.number().int().min(1).max(5),
  briefFinal: z.string().min(1),
})

async function executeAutonomousMission(
  missionId: string,
  dossierId: string,
  kaelSessionId: string,
  systemPrompt: string,
  managerName: string,
  briefFinal: string,
) {
  try {
    // 1. Marquer RUNNING + broadcast
    await prisma.autonomousMission.update({
      where: { id: missionId },
      data: { status: "RUNNING" },
    })
    broadcastToChannel(dossierId, "mission", {
      type: "mission_update",
      missionId,
      status: "RUNNING",
      message: `${managerName} analyse le brief…`,
    }).catch(() => undefined)

    // 2. Construire la mémoire projet
    const projectMemory = await buildProjectMemory(dossierId)

    // 3. Appel LLM direct avec le systemPrompt de l'expert
    const report = await invokeExpertDirect({
      managerName,
      systemPrompt,
      userMessage: briefFinal,
      history: [],
      projectMemory,
      labContext: "DISCOVERY",
    })

    // 4. Persister le résultat
    await prisma.autonomousMission.update({
      where: { id: missionId },
      data: {
        status: "DONE",
        result: { summary: report, fullReport: report },
        completedAt: new Date().toISOString() as any,
      },
    })

    // 5. Injecter le résultat dans la KaelSession
    const kaelSession = await prisma.kaelSession.findUnique({ where: { id: kaelSessionId } })
    if (kaelSession) {
      const messages = (kaelSession.messages ?? []) as Array<Record<string, unknown>>
      messages.push({
        id: randomUUID(),
        role: "kael",
        content: `**Mission terminée — ${managerName}**\n\n${report}`,
        timestamp: new Date().toISOString(),
        missionId,
        isMissionResult: true,
      })
      await prisma.kaelSession.update({
        where: { id: kaelSessionId },
        data: { messages },
      })
    }

    // 6. Broadcast DONE
    broadcastToChannel(dossierId, "mission", {
      type: "mission_done",
      missionId,
      status: "DONE",
      summary: report.slice(0, 300),
    }).catch(() => undefined)
  } catch (err) {
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

  const { dossierId, kaelSessionId, poleCode, managerName, objective, estimatedCost, briefFinal } = result.data

  // Vérifier budget suffisant (nouveau système hybride)
  const budgetCheck = await checkMissionBudget(session.userId)
  if (!budgetCheck.ok) {
    return apiError(`Budget insuffisant. ${budgetCheck.reason}`, 403)
  }

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  // Récupérer le systemPrompt du pôle
  const pole = await prisma.pole.findFirst({ where: { code: poleCode as any } })
  if (!pole) return apiError("Pole not found", 404)

  // Débiter le budget avant création de la mission
  await consumeMission(session.userId)

  // Créer la mission
  const mission = await prisma.autonomousMission.create({
    data: {
      dossierId,
      kaelSessionId,
      poleCode,
      managerName,
      objective,
      estimatedCost,
      actualCost: estimatedCost,
      status: "PENDING",
    },
  })

  // Ajouter un message de confirmation dans la KaelSession
  const kaelSession = await prisma.kaelSession.findUnique({ where: { id: kaelSessionId } })
  const kaelMessages = (kaelSession?.messages ?? []) as Array<Record<string, unknown>>
  kaelMessages.push({
    id: randomUUID(),
    role: "kael",
    content: `Mission lancée — **${managerName}** est en route. Je te tiendrai informé de sa progression.`,
    timestamp: new Date().toISOString(),
    missionId: mission.id,
    isMissionStatus: true,
  })
  await prisma.kaelSession.update({
    where: { id: kaelSessionId },
    data: { messages: kaelMessages },
  })

  // Broadcast Realtime : mission créée
  broadcastToChannel(dossierId, "mission", {
    type: "mission_created",
    missionId: mission.id,
    managerName,
    status: "PENDING",
  }).catch(() => undefined)

  // Fire-and-forget : exécution directe via LLM
  executeAutonomousMission(
    mission.id,
    dossierId,
    kaelSessionId,
    pole.systemPrompt,
    managerName,
    briefFinal,
  ).catch(() => undefined)

  return apiSuccess({ mission, status: "RUNNING" })
}

export async function GET(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const dossierId = searchParams.get("dossierId")
  if (!dossierId) return apiError("dossierId required", 400)

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const missions = await prisma.autonomousMission.findMany({
    where: { dossierId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return apiSuccess(missions)
}
