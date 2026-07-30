import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"
import { hasValidInternalWebhookSecret } from "@/lib/internal-webhook"
import { z } from "zod"

const createSchema = z.object({
  dossierId: z.string().min(1),
  type: z.enum(["ANALYSIS", "REPORT", "STACK", "PROJECTION", "RESEARCH", "SOURCE_FILE"]),
  title: z.string().min(1),
  producedBy: z.string().min(1),
  poleCode: z.string().optional(),
  sourceKind: z.enum(["mission", "session", "upload"]),
  sourceId: z.string().optional(),
  content: z.object({
    summary: z.string(),
    sections: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
    data: z.record(z.string(), z.unknown()).default({}),
  }),
  metadata: z.object({
    confidence: z.number().min(0).max(1).default(0.8),
    tags: z.array(z.string()).default([]),
    relatedDocuments: z.array(z.string()).default([]),
    relatedCards: z.array(z.string()).default([]),
    relatedTasks: z.array(z.string()).default([]),
  }).default({ confidence: 0.8, tags: [], relatedDocuments: [], relatedCards: [], relatedTasks: [] }),
})

export async function GET(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const dossierId = searchParams.get("dossierId")
  if (!dossierId) return apiError("dossierId required", 400)

  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier || dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const documents = await prisma.expertDocument.findMany({
    where: { dossierId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return apiSuccess(documents)
}

export async function POST(req: NextRequest) {
  // Support trusted internal workers (no user session) OR authenticated user (upload)
  const isWebhook = hasValidInternalWebhookSecret(req)

  if (!isWebhook) {
    const session = await verifySession()
    if (!session) return apiError("Unauthorized", 401)
  }

  const result = await validateBody(createSchema, req)
  if ("error" in result) return result.error

  const { dossierId, type, title, producedBy, poleCode, sourceKind, sourceId, content, metadata } = result.data

  // Verify dossier exists
  const dossier = await prisma.dossier.findUnique({ where: { id: dossierId } })
  if (!dossier) return apiError("Dossier not found", 404)

  const doc = await prisma.expertDocument.create({
    data: {
      dossierId,
      type,
      title,
      producedBy,
      poleCode: poleCode ?? null,
      sourceKind,
      sourceId: sourceId ?? null,
      content,
      metadata,
    },
  })

  return apiSuccess(doc, 201)
}
