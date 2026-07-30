import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { broadcastToChannel } from "@/lib/realtime-server"
import { z } from "zod"

const canvasNodeSchema = z.object({
  nodeId: z.string(),
  type: z.string(),
  positionX: z.number(),
  positionY: z.number(),
  data: z.record(z.string(), z.unknown()).default({}),
})

const canvasEdgeSchema = z.object({
  edgeId: z.string(),
  source: z.string(),
  target: z.string(),
  data: z.record(z.string(), z.unknown()).default({}),
})

const canvasSchema = z.object({
  nodes: z.array(canvasNodeSchema),
  edges: z.array(canvasEdgeSchema),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const subFolder = await prisma.subFolder.findUnique({
    where: { id },
    include: { dossier: { include: { labState: true } } },
  })
  if (!subFolder) return apiError("SubFolder not found", 404)
  if (subFolder.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const lab = subFolder.dossier.labState?.currentLab
  const [nodes, edges] = await Promise.all([
    prisma.canvasNode.findMany({ where: { subFolderId: id, ...(lab ? { labContext: lab } : {}) } }),
    prisma.canvasEdge.findMany({ where: { subFolderId: id, ...(lab ? { labContext: lab } : {}) } }),
  ])

  return apiSuccess({ nodes, edges })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const subFolder = await prisma.subFolder.findUnique({
    where: { id },
    include: { dossier: { include: { labState: true } } },
  })
  if (!subFolder) return apiError("SubFolder not found", 404)
  if (subFolder.dossier.ownerId !== session.userId) return apiError("Forbidden", 403)

  const lab = subFolder.dossier.labState?.currentLab
  if (!lab) return apiError("No active LAB", 422)

  const result = await validateBody(canvasSchema, req)
  if ("error" in result) return result.error

  await prisma.$transaction([
    prisma.canvasNode.deleteMany({ where: { subFolderId: id, labContext: lab } }),
    prisma.canvasEdge.deleteMany({ where: { subFolderId: id, labContext: lab } }),
  ])

  await prisma.$transaction([
    ...result.data.nodes.map((n) =>
      prisma.canvasNode.create({
        data: { subFolderId: id, nodeId: n.nodeId, type: n.type, positionX: n.positionX, positionY: n.positionY, data: n.data as any, labContext: lab },
      })
    ),
    ...result.data.edges.map((e) =>
      prisma.canvasEdge.create({
        data: { subFolderId: id, edgeId: e.edgeId, source: e.source, target: e.target, data: e.data as any, labContext: lab },
      })
    ),
  ])

  await broadcastToChannel(subFolder.dossierId, "canvas", { subFolderId: id, lab })
  return apiSuccess({ success: true })
}
