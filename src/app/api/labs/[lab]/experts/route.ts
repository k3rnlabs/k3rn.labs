import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { apiError, apiSuccess } from "@/lib/validate"
import { db as prisma } from "@/lib/db"
import { publicExpert } from "@/lib/public-dto"
import type { LabType } from "@prisma/client"

export async function GET(req: NextRequest, { params }: { params: Promise<{ lab: string }> }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const { lab } = await params
  const validLabs: LabType[] = [
    "DISCOVERY", "STRUCTURATION", "VALIDATION_MARCHE",
    "DESIGN_PRODUIT", "ARCHITECTURE_TECHNIQUE", "BUSINESS_FINANCE",
  ]
  if (!validLabs.includes(lab as LabType)) return apiError("Invalid LAB", 400)

  const experts = await prisma.expert.findMany({
    where: { lab: lab as LabType },
  })

  return apiSuccess(experts.map(publicExpert))
}
