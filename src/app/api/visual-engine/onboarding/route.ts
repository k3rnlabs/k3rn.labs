import { NextRequest } from "next/server"
import { z } from "zod"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  MIRAVA_ONBOARDING_STEPS,
  MIRAVA_ONBOARDING_VERSION,
  type MiravaOnboardingDirection,
  type MiravaOnboardingGoal,
  type MiravaOnboardingState,
  type MiravaOnboardingStepId,
} from "@/lib/mirava/onboarding"
import { MIRAVA_UNIVERSES } from "@/lib/mirava/universes"
import { validateBody } from "@/lib/validate"
import { miravaApiError as apiError, miravaApiSuccess as apiSuccess, withMiravaPrivateHeaders } from "@/lib/visual-engine/http"

const universeIds = MIRAVA_UNIVERSES.map((universe) => universe.id) as [string, ...string[]]
const stepSchema = z.enum(MIRAVA_ONBOARDING_STEPS)
const goalSchema = z.enum(["presence", "campaign", "portfolio"])
const firstNameSchema = z.string().trim().min(1).max(48)
const directionSchema = z.object({
  primaryUniverseId: z.enum(universeIds),
  sessionType: z.enum(["portrait_editorial", "campaign_series", "signature_series"]),
  recommendedFormats: z.array(z.string().min(1).max(40)).min(1).max(6),
})
const stateSchema = z.object({
  version: z.literal(MIRAVA_ONBOARDING_VERSION),
  status: z.enum(["in_progress", "session_ready", "activated"]),
  currentStep: stepSchema,
  universeIds: z.array(z.enum(universeIds)).max(3),
  goal: goalSchema.optional(),
  direction: directionSchema.optional(),
  identityConsentAt: z.string().optional(),
  firstSessionId: z.string().min(1).optional(),
  updatedAt: z.string(),
  activatedAt: z.string().optional(),
})
const versionTwoSchema = z.object({
  version: z.literal(2), status: z.enum(["in_progress", "completed"]),
  step: z.number().int().min(0).max(7), universeIds: z.array(z.enum(universeIds)).max(3),
  goal: goalSchema.optional(), identityIntent: z.enum(["now", "later"]).optional(),
  updatedAt: z.string(), completedAt: z.string().optional(),
})
const progressSchema = z.object({
  action: z.literal("progress"), currentStep: stepSchema,
  firstName: firstNameSchema.optional(), universeIds: z.array(z.enum(universeIds)).min(1).max(3).optional(),
  goal: goalSchema.optional(), direction: directionSchema.optional(), identityConsentAccepted: z.literal(true).optional(),
})
const sessionReadySchema = z.object({ action: z.literal("session_ready"), firstSessionId: z.string().min(1) })
const activateSchema = z.object({ action: z.literal("activate") })
const mutationSchema = z.discriminatedUnion("action", [progressSchema, sessionReadySchema, activateSchema])

function buildMiravaDirection(goal: MiravaOnboardingGoal, selectedUniverseIds: string[]): MiravaOnboardingDirection {
  const primaryUniverseId = selectedUniverseIds[0]
  if (!primaryUniverseId) throw new Error("MIRAVA_DIRECTION_REQUIRES_UNIVERSE")
  if (goal === "campaign") return { primaryUniverseId, sessionType: "campaign_series", recommendedFormats: ["Publication", "Story", "Bannière"] }
  if (goal === "portfolio") return { primaryUniverseId, sessionType: "signature_series", recommendedFormats: ["Portrait", "Portfolio", "Bannière"] }
  return { primaryUniverseId, sessionType: "portrait_editorial", recommendedFormats: ["Portrait", "Publication", "Photo de profil"] }
}

function asPreferences(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function sameStringList(left: string[] | undefined, right: string[] | undefined): boolean {
  return JSON.stringify(left ?? []) === JSON.stringify(right ?? [])
}

function sameDirection(left: MiravaOnboardingDirection | undefined, right: MiravaOnboardingDirection | undefined): boolean {
  return left?.primaryUniverseId === right?.primaryUniverseId
    && left?.sessionType === right?.sessionType
    && sameStringList(left?.recommendedFormats, right?.recommendedFormats)
}

function readMiravaOnboardingState(preferences: unknown): MiravaOnboardingState | null {
  const candidate = asPreferences(preferences).miravaOnboarding
  const current = stateSchema.safeParse(candidate)
  if (current.success) return current.data
  const old = versionTwoSchema.safeParse(candidate)
  if (!old.success) return null
  const currentStep: MiravaOnboardingStepId = !old.data.goal
    ? "objective"
    : old.data.universeIds.length === 0
      ? "visual_universes"
      : old.data.step < 6 ? "direction_review" : "identity_permission"
  return {
    version: MIRAVA_ONBOARDING_VERSION, status: "in_progress", currentStep,
    universeIds: old.data.universeIds, goal: old.data.goal,
    direction: old.data.goal && old.data.universeIds.length ? buildMiravaDirection(old.data.goal, old.data.universeIds) : undefined,
    updatedAt: old.data.updatedAt,
  }
}

export async function GET() {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { firstName: true, preferences: true } })
  if (!user) return apiError("User not found", 404)
  return apiSuccess({ firstName: user.firstName, onboarding: readMiravaOnboardingState(user.preferences) })
}

export async function PATCH(req: NextRequest) {
  const session = await verifySession()
  if (!session) return apiError("Unauthorized", 401)
  const result = await validateBody(mutationSchema, req)
  if ("error" in result) return withMiravaPrivateHeaders(result.error)
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { preferences: true } })
  if (!user) return apiError("User not found", 404)
  const existing = readMiravaOnboardingState(user.preferences)
  const now = new Date().toISOString()
  const action = result.data
  let onboarding: MiravaOnboardingState
  if (action.action === "progress") {
    const goal = action.goal ?? existing?.goal
    const selected = action.universeIds ?? existing?.universeIds ?? []
    const direction = action.direction ?? (goal && selected.length ? buildMiravaDirection(goal, selected) : existing?.direction)
    const targetIndex = MIRAVA_ONBOARDING_STEPS.indexOf(action.currentStep)
    if (targetIndex >= 2 && !goal) return apiError("Onboarding objective incomplete", 409)
    if (targetIndex >= 3 && selected.length === 0) return apiError("Onboarding universes incomplete", 409)
    if (targetIndex >= 4 && !direction) return apiError("Onboarding direction incomplete", 409)
    if (direction && (!selected.includes(direction.primaryUniverseId) || (goal && direction.sessionType !== buildMiravaDirection(goal, selected).sessionType))) {
      return apiError("Onboarding direction inconsistent", 409)
    }
    const identityConsentAt = action.identityConsentAccepted ? now : existing?.identityConsentAt
    if (targetIndex >= 5 && !identityConsentAt) return apiError("Identity consent missing", 409)
    const answersChanged = (action.goal !== undefined && action.goal !== existing?.goal)
      || (action.universeIds !== undefined && !sameStringList(action.universeIds, existing?.universeIds))
      || (action.direction !== undefined && !sameDirection(action.direction, existing?.direction))
      || (action.identityConsentAccepted === true && !existing?.identityConsentAt)
    const keepPreparedSession = existing?.status === "session_ready" && !answersChanged
    onboarding = {
      version: MIRAVA_ONBOARDING_VERSION, status: keepPreparedSession ? "session_ready" : "in_progress", currentStep: action.currentStep,
      universeIds: selected, goal, direction,
      identityConsentAt,
      ...(keepPreparedSession ? { firstSessionId: existing.firstSessionId } : {}),
      updatedAt: now,
    }
  } else if (action.action === "session_ready") {
    if (!existing?.goal || !existing.direction || existing.universeIds.length === 0) return apiError("Onboarding direction incomplete", 409)
    if (!existing.identityConsentAt) return apiError("Identity consent missing", 409)
    const [profile, creation] = await Promise.all([
      db.studioIdentityProfile.findUnique({ where: { userId: session.userId }, include: { _count: { select: { assets: true } } } }),
      db.studioCreation.findUnique({ where: { id: action.firstSessionId, userId: session.userId } }),
    ])
    if (!profile || profile._count.assets < 3) return apiError("Identity profile incomplete", 409)
    if (!creation || creation.identityProfileId !== profile.id) return apiError("First session not linked to identity", 409)
    onboarding = { ...existing, status: "session_ready", currentStep: "capture_activation", firstSessionId: creation.id, updatedAt: now }
  } else {
    if (existing?.status !== "session_ready" || !existing.firstSessionId) return apiError("First session not ready", 409)
    const [profile, creation] = await Promise.all([
      db.studioIdentityProfile.findUnique({ where: { userId: session.userId }, include: { _count: { select: { assets: true } } } }),
      db.studioCreation.findUnique({ where: { id: existing.firstSessionId, userId: session.userId } }),
    ])
    if (!profile || profile._count.assets < 3 || !creation || creation.identityProfileId !== profile.id) return apiError("Activation prerequisites no longer valid", 409)
    onboarding = { ...existing, status: "activated", currentStep: "capture_activation", activatedAt: now, updatedAt: now }
  }
  await db.user.update({
    where: { id: session.userId },
    data: { ...(action.action === "progress" && action.firstName ? { firstName: action.firstName } : {}), preferences: { ...asPreferences(user.preferences), miravaOnboarding: onboarding } },
  })
  return apiSuccess({ onboarding })
}
