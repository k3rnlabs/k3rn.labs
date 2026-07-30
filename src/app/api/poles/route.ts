import { verifySession } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { publicPole } from "@/lib/public-dto"
import { apiError, apiSuccess } from "@/lib/validate"

export async function GET() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)

  const poles = await prisma.pole.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: { select: { experts: true, sessions: true } },
    },
  })

  return apiSuccess(poles.map(publicPole))
}
