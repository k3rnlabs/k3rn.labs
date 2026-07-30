import { NextRequest } from "next/server"
import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { publicPole } from "@/lib/public-dto"
import { apiError, apiSuccess } from "@/lib/validate"

export async function GET(_req: NextRequest, { params }: { params: { poleId: string } }) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const pole = await prisma.pole.findUnique({
    where: { id: params.poleId },
    include: {
      experts: { select: { id: true, name: true, slug: true, lab: true } },
      _count: { select: { sessions: true } },
    },
  })

  if (!pole) return apiError("Not found", 404)
  return apiSuccess(publicPole(pole))
}
