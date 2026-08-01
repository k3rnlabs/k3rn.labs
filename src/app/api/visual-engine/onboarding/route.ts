import { NextRequest } from "next/server"
import { z } from "zod"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  MIRAVA_ONBOARDING_VERSION,
  type MiravaOnboardingStep,
  type MiravaOnboardingState,
} from "@/lib/mirava/onboarding"
import { MIRAVA_UNIVERSES } from "@/lib/mirava/universes"
import { apiError, apiSuccess, validateBody } from "@/lib/validate"

const universeIds = MIRAVA_UNIVERSES.map((universe) => universe.id) as [string, ...string[]]
const stepSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal(7)])
const firstNameSchema = z.string().trim().min(1).max(48)
const stateSchema = z.object({
  version: z.literal(MIRAVA_ONBOARDING_VERSION),
  status: z.enum(["in_progress", "completed"]),
  step: stepSchema,
  universeIds: z.array(z.enum(universeIds)).max(3),
  goal: z.enum(["presence", "campaign", "portfolio"]).optional(),
  identityIntent: z.enum(["now", "later"]).optional(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
})
const legacyCompletedSchema = z.object({
  universeIds: z.array(z.enum(universeIds)).min(1).max(3),
  goal: z.enum(["presence", "campaign", "portfolio"]),
  identityIntent: z.enum(["now", "later"]),
  completedAt: z.string(),
})
const versionOneStateSchema = z.object({
  version: z.literal(1),
  status: z.enum(["in_progress", "completed"]),
  step: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  universeIds: z.array(z.enum(universeIds)).max(3),
  goal: z.enum(["presence", "campaign", "portfolio"]).optional(),
  identityIntent: z.enum(["now", "later"]).optional(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
})
const progressSchema = z.object({
  action: z.literal("progress"),
  step: stepSchema,
  firstName: firstNameSchema.optional(),
  universeIds: z.array(z.enum(universeIds)).min(1).max(3).optional(),
  goal: z.enum(["presence", "campaign", "portfolio"]).optional(),
  identityIntent: z.enum(["now", "later"]).optional(),
})
const completeSchema = z.object({
  action: z.literal("complete"),
  firstName: firstNameSchema,
  universeIds: z.array(z.enum(universeIds)).min(1).max(3),
  goal: z.enum(["presence", "campaign", "portfolio"]),
  identityIntent: z.enum(["now", "later"]),
})
const mutationSchema = z.discriminatedUnion("action", [progressSchema, completeSchema])

function readState(preferences: unknown): MiravaOnboardingState | null {
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return null
  const candidate = (preferences as Record<string, unknown>).miravaOnboarding
  const current = stateSchema.safeParse(candidate)
  if (current.success) return current.data
  const versionOne = versionOneStateSchema.safeParse(candidate)
  if (versionOne.success) {
    const migratedStep = ([0, 3, 4, 6] as const)[versionOne.data.step]
    return {
      ...versionOne.data,
      version: MIRAVA_ONBOARDING_VERSION,
      step: versionOne.data.status === "completed" ? 7 : migratedStep,
    }
  }
  const legacy = legacyCompletedSchema.safeParse(candidate)
  if (!legacy.success) return null
  return {
    version: MIRAVA_ONBOARDING_VERSION,
    status: "completed",
    step: 7,
    universeIds: legacy.data.universeIds,
    goal: legacy.data.goal,
    identityIntent: legacy.data.identityIntent,
    updatedAt: legacy.data.completedAt,
    completedAt: legacy.data.completedAt,
  }
}

function asPreferences(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export async function GET() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { firstName: true, preferences: true } })
  if (!user) return apiError("User not found", 404)
  return apiSuccess({ firstName: user.firstName, onboarding: readState(user.preferences) })
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const result = await validateBody(mutationSchema, req)
  if ("error" in result) return result.error

  const user = await db.user.findUnique({ where: { id: session.userId }, select: { preferences: true } })
  if (!user) return apiError("User not found", 404)
  const now = new Date().toISOString()
  const existing = readState(user.preferences)
  const action = result.data
  const onboarding: MiravaOnboardingState = action.action === "complete"
    ? {
        version: MIRAVA_ONBOARDING_VERSION,
        status: "completed",
        step: 7,
        universeIds: action.universeIds,
        goal: action.goal,
        identityIntent: action.identityIntent,
        updatedAt: now,
        completedAt: now,
      }
    : {
        version: MIRAVA_ONBOARDING_VERSION,
        status: "in_progress",
        step: action.step,
        universeIds: action.universeIds ?? existing?.universeIds ?? [],
        goal: action.goal ?? existing?.goal,
        identityIntent: action.identityIntent ?? existing?.identityIntent,
        updatedAt: now,
      }
  await db.user.update({
    where: { id: session.userId },
    data: {
      ...(action.firstName ? { firstName: action.firstName } : {}),
      preferences: { ...asPreferences(user.preferences), miravaOnboarding: onboarding },
    },
  })
  return apiSuccess({ onboarding })
}
