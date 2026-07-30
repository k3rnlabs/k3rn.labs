import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { prisma as prismaDirect } from "@/lib/prisma"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { buildProjectMemory } from "@/lib/project-memory"
import { invokeExpertDirect } from "@/lib/claude"
import { createAuditLog } from "@/lib/audit"
import { publicPole } from "@/lib/public-dto"
import { z } from "zod"
import { randomUUID } from "node:crypto"

const REFERRAL_BONUS_MISSIONS = 5

const schema = z.object({
  dossierId: z.string().min(1),
  userMessage: z.string().min(1).max(4000),
  currentLab: z.string().default("DISCOVERY"),
})

export async function POST(req: NextRequest, { params }: { params: { poleId: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error
  const { dossierId, userMessage, currentLab } = result.data

  const pole = await prisma.pole.findUnique({ where: { id: params.poleId } })
  if (!pole) return apiError("Pole not found", 404)

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  // Vérifier et débiter le budget de missions
  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user || (user.missionBudget ?? 0) <= 0) {
    return apiError("Votre budget de missions freemium (30) est épuisé.", 403)
  }

  const projectMemory = await buildProjectMemory(dossierId)

  const expertResponse = await invokeExpertDirect({
    managerName: pole.managerName,
    systemPrompt: pole.systemPrompt,
    userMessage,
    history: [],
    projectMemory,
    labContext: currentLab,
  })

  const initialManagerMessage = {
    id: randomUUID(),
    role: "manager",
    content: expertResponse,
    timestamp: new Date().toISOString(),
    isManager: true,
  }

  const userMsgObj = {
    id: randomUUID(),
    role: "user",
    content: userMessage,
    timestamp: new Date().toISOString(),
  }

  const poleSession = await prisma.$transaction(async (tx) => {
    // 1. Débiter le budget
    await tx.user.update({
      where: { id: session.userId },
      data: { missionBudget: { decrement: 1 } }
    })

    // 2. Créer la session
    return await tx.poleSession.create({
      data: {
        poleId: params.poleId,
        dossierId,
        labAtCreation: currentLab as any,
        messages: [userMsgObj, initialManagerMessage],
        status: "ACTIVE",
      },
    })
  })

  await createAuditLog({
    userId: session.userId,
    action: "POLE_SESSION_CREATED",
    entity: "PoleSession",
    entityId: poleSession.id,
  })

  // Déclencher ACTIVATED si c'est la première interaction pôle du filleul (idempotent)
  try {
    const alreadyActivated = await prismaDirect.referralLog.findFirst({
      where: { userId: session.userId, type: "ACTIVATED" },
      select: { id: true },
    })

    if (!alreadyActivated) {
      const dbUser = await prismaDirect.user.findUnique({
        where: { id: session.userId },
        select: { referredById: true },
      })

      if (dbUser?.referredById) {
        await prismaDirect.$transaction([
          prismaDirect.referralLog.create({
            data: {
              userId: session.userId,
              ambassadorId: dbUser.referredById,
              type: "ACTIVATED",
              missions: REFERRAL_BONUS_MISSIONS,
              metadata: { trigger: "first_pole_session", poleId: params.poleId },
            },
          }),
          prismaDirect.user.update({
            where: { id: dbUser.referredById },
            data: { missionBudget: { increment: REFERRAL_BONUS_MISSIONS } },
          }),
        ])
      }
    }
  } catch (err) {
    // Ne pas bloquer la réponse si le tracking referral échoue
    console.error("Referral ACTIVATED tracking error:", err)
  }

  return apiSuccess({ session: poleSession, pole: publicPole(pole) })
}
