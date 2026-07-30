import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { apiError, apiSuccess } from "@/lib/validate"
import { createAuditLog } from "@/lib/audit"
import { LAB_CONDITIONS, getLabOrder } from "@/lib/lab-conditions"
import { broadcastToChannel } from "@/lib/realtime-server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({
    where: { id, ownerId: session.userId },
    include: { labState: true },
  })
  if (!dossier) return apiError("Dossier not found", 404)
  if (!dossier.labState) return apiError("No LAB state", 422)

  const currentLab = dossier.labState.currentLab
  const conditions = (LAB_CONDITIONS as any)[currentLab]
  if (!conditions.nextLab) return apiError("Already at final LAB", 422)

  const subFolders = await prisma.subFolder.findMany({
    where: { dossierId: id },
    include: { cards: { where: { state: "VALIDATED" } } },
  })
  const validatedCardTypes = subFolders.flatMap((sf: any) => sf.cards.map((c: any) => c.type))
  const missingCards = conditions.requiredValidatedCardTypes.filter(
    (t: any) => !validatedCardTypes.includes(t)
  )
  if (missingCards.length > 0) {
    return apiError(`Missing required cards: ${missingCards.join(", ")}`, 422)
  }

  const blockingExperts = await prisma.expertSession.findMany({
    where: { dossierId: id, status: { notIn: ["VALIDATED", "REJECTED"] } },
    include: { expert: true },
  })
  const blockers = blockingExperts.filter((s: any) => s.expert.blocksLabTransition)
  if (blockers.length > 0) {
    return apiError(`Blocking experts pending: ${blockers.map((b: any) => b.expert.name).join(", ")}`, 422)
  }

  const updated = await prisma.labState.update({
    where: { dossierId: id },
    data: { currentLab: conditions.nextLab, transitionAllowed: false },
  })

  await prisma.dossier.update({ where: { id }, data: { macroState: "LAB_TRANSITION" } })

  await createAuditLog({
    userId: session.userId,
    dossierId: id,
    action: "LAB_TRANSITION",
    entity: "LabState",
    entityId: updated.id,
    metadata: { from: currentLab, to: conditions.nextLab },
  })

  await broadcastToChannel(id, "lab", { from: currentLab, to: conditions.nextLab })

  return apiSuccess(updated)
}
