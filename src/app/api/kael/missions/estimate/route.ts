import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { buildProjectMemory } from "@/lib/project-memory"
import { callLLM } from "@/lib/llm"
import { z } from "zod"

const schema = z.object({
  dossierId: z.string().min(1),
  kaelSessionId: z.string().min(1),
  poleCode: z.string().min(1),
  managerName: z.string().min(1),
  initialObjective: z.string().min(1),
  clarificationAnswers: z.record(z.string(), z.string()).optional(),
})

export async function POST(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const result = await validateBody(schema, req)
  if ("error" in result) return result.error

  const { dossierId, kaelSessionId, poleCode, managerName, initialObjective, clarificationAnswers } = result.data

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const kaelSession = await prisma.kaelSession.findUnique({ where: { id: kaelSessionId } })
  if (!kaelSession || kaelSession.dossierId !== dossierId) return apiError("Session not found", 404)

  const projectMemory = await buildProjectMemory(dossierId)

  // Contexte des réponses de clarification si disponibles
  const clarificationContext = clarificationAnswers
    ? `\n\nRéponses aux questions de clarification :\n${Object.entries(clarificationAnswers)
        .map(([q, a]) => `- ${q} : ${a}`)
        .join("\n")}`
    : ""

  const { content } = await callLLM([
    {
      role: "system",
      content: `Tu es KAEL, Chief of Staff. À partir du brief projet et de l'objectif de mission, génère :
1. Un brief de mission précis et actionnable pour l'expert ${managerName}
2. Une estimation du coût en missions (1-3) avec justification
3. Un breakdown du coût

Réponds UNIQUEMENT en JSON valide :
{
  "briefFinal": "brief complet pour ${managerName}, incluant contexte projet + objectif précis + livrables attendus",
  "estimatedCost": 1,
  "costBreakdown": "1 mission : collecte de données + synthèse LLM",
  "clarifyingQuestions": []
}

IMPORTANT : Tu DOIS toujours remplir "briefFinal" avec le brief le plus complet possible d'après les informations disponibles. Ne retourne JAMAIS null pour "briefFinal". Si des informations manquent, génère un brief avec ce que tu as et liste les questions dans "clarifyingQuestions".`,
    },
    {
      role: "user",
      content: `[BRIEF PROJET]\n${projectMemory}\n[FIN BRIEF]\n\nObjectif de mission : ${initialObjective}${clarificationContext}\n\nExpert ciblé : ${managerName} (${poleCode})`,
    },
  ], { maxTokens: 1024, temperature: 0.3 })

  let parsed: {
    briefFinal: string | null
    estimatedCost: number
    costBreakdown: string
    clarifyingQuestions: string[]
  }

  try {
    parsed = JSON.parse(content)
  } catch {
    return apiError("Failed to generate mission brief", 500)
  }

  return apiSuccess({
    briefFinal: parsed.briefFinal,
    estimatedCost: parsed.estimatedCost ?? 1,
    costBreakdown: parsed.costBreakdown ?? "",
    clarifyingQuestions: parsed.clarifyingQuestions ?? [],
    poleCode,
    managerName,
  })
}
