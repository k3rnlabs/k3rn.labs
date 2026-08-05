import { NextRequest } from "next/server"
import { z } from "zod"
import { verifySession } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  MIRAVA_ONBOARDING_STEPS,
  MIRAVA_ONBOARDING_VERSION,
  type MiravaOnboardingDirection,
  type MiravaOnboardingFormat,
  type MiravaOnboardingGoal,
  type MiravaOnboardingSessionType,
  type MiravaOnboardingState,
  type MiravaOnboardingStepId,
} from "@/lib/mirava/onboarding"
import { MIRAVA_UNIVERSES } from "@/lib/mirava/universes"
import { validateBody } from "@/lib/validate"
import { acceptMiravaRequiredConsents } from "@/lib/visual-engine/privacy"
import {
  miravaApiError as apiError,
  miravaApiSuccess as apiSuccess,
  withMiravaPrivateHeaders,
} from "@/lib/visual-engine/http"

const universeIds =
  MIRAVA_UNIVERSES.map(
    (universe) => universe.id,
  ) as [string, ...string[]]

const stepSchema =
  z.enum(MIRAVA_ONBOARDING_STEPS)

const goalSchema =
  z.enum([
    "presence",
    "campaign",
    "portfolio",
  ])

const sessionTypeSchema =
  z.enum([
    "portrait_signature",
    "profile_premium",
    "lifestyle_editorial",
    "mini_campaign",
  ])

const formatSchema =
  z.enum([
    "portrait",
    "publication",
    "profile",
    "story",
    "banner",
    "portfolio",
  ])

const firstNameSchema =
  z.string().trim().min(1).max(48)

const directionSchema = z.object({
  primaryUniverseId:
    z.enum(universeIds),
  sessionType:
    sessionTypeSchema,
  recommendedFormats:
    z.array(formatSchema).min(1).max(6),
})

const stateSchema = z.object({
  version:
    z.literal(MIRAVA_ONBOARDING_VERSION),
  status:
    z.enum([
      "in_progress",
      "session_ready",
      "activated",
    ]),
  currentStep:
    stepSchema,
  universeIds:
    z.array(z.enum(universeIds)).max(3),
  primaryUniverseId:
    z.enum(universeIds).optional(),
  goal:
    goalSchema.optional(),
  direction:
    directionSchema.optional(),
  termsAcceptedAt:
    z.string().optional(),
  identityConsentAt:
    z.string().optional(),
  firstSessionId:
    z.string().min(1).optional(),
  updatedAt:
    z.string(),
  activatedAt:
    z.string().optional(),
})

const versionThreeDirectionSchema =
  z.object({
    primaryUniverseId:
      z.enum(universeIds),
    sessionType:
      z.enum([
        "portrait_editorial",
        "campaign_series",
        "signature_series",
      ]),
    recommendedFormats:
      z.array(z.string()).min(1).max(6),
  })

const versionThreeSchema =
  z.object({
    version: z.literal(3),
    status:
      z.enum([
        "in_progress",
        "session_ready",
        "activated",
      ]),
    currentStep:
      z.enum([
        "promise_name",
        "objective",
        "visual_universes",
        "direction_review",
        "identity_permission",
        "capture_activation",
      ]),
    universeIds:
      z.array(z.enum(universeIds)).max(3),
    goal:
      goalSchema.optional(),
    direction:
      versionThreeDirectionSchema.optional(),
    identityConsentAt:
      z.string().optional(),
    firstSessionId:
      z.string().min(1).optional(),
    updatedAt:
      z.string(),
    activatedAt:
      z.string().optional(),
  })

const versionTwoSchema =
  z.object({
    version: z.literal(2),
    status:
      z.enum([
        "in_progress",
        "completed",
      ]),
    step:
      z.number().int().min(0).max(7),
    universeIds:
      z.array(z.enum(universeIds)).max(3),
    goal:
      goalSchema.optional(),
    identityIntent:
      z.enum(["now", "later"]).optional(),
    updatedAt:
      z.string(),
    completedAt:
      z.string().optional(),
  })

const progressSchema = z.object({
  action:
    z.literal("progress"),
  currentStep:
    stepSchema,
  firstName:
    firstNameSchema.optional(),
  universeIds:
    z.array(z.enum(universeIds))
      .min(1)
      .max(3)
      .optional(),
  primaryUniverseId:
    z.enum(universeIds).optional(),
  goal:
    goalSchema.optional(),
  direction:
    directionSchema.optional(),
  termsAccepted:
    z.literal(true).optional(),
  identityConsentAccepted:
    z.literal(true).optional(),
  locale:
    z.enum(["fr", "es"]).optional(),
})

const sessionReadySchema =
  z.object({
    action:
      z.literal("session_ready"),
    firstSessionId:
      z.string().min(1),
  })

const activateSchema =
  z.object({
    action:
      z.literal("activate"),
  })

const mutationSchema =
  z.discriminatedUnion(
    "action",
    [
      progressSchema,
      sessionReadySchema,
      activateSchema,
    ],
  )

function formatsForSession(
  sessionType: MiravaOnboardingSessionType,
): MiravaOnboardingFormat[] {
  if (
    sessionType === "mini_campaign"
  ) {
    return [
      "publication",
      "story",
      "banner",
    ]
  }

  if (
    sessionType === "profile_premium"
  ) {
    return [
      "portrait",
      "profile",
    ]
  }

  if (
    sessionType ===
    "lifestyle_editorial"
  ) {
    return [
      "portrait",
      "publication",
    ]
  }

  return [
    "portrait",
    "publication",
    "portfolio",
  ]
}

function buildMiravaDirection(
  primaryUniverseId: string,
  sessionType:
    MiravaOnboardingSessionType,
): MiravaOnboardingDirection {
  return {
    primaryUniverseId,
    sessionType,
    recommendedFormats:
      formatsForSession(sessionType),
  }
}

function legacySessionType(
  goal:
    | MiravaOnboardingGoal
    | undefined,
  sessionType:
    | "portrait_editorial"
    | "campaign_series"
    | "signature_series"
    | undefined,
): MiravaOnboardingSessionType {
  if (
    sessionType === "campaign_series" ||
    goal === "campaign"
  ) {
    return "mini_campaign"
  }

  if (
    sessionType === "signature_series" ||
    goal === "portfolio"
  ) {
    return "portrait_signature"
  }

  return "profile_premium"
}

function asPreferences(
  value: unknown,
): Record<string, unknown> {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value as Record<string, unknown>
    : {}
}

function sameStringList(
  left: string[] | undefined,
  right: string[] | undefined,
): boolean {
  return (
    JSON.stringify(left ?? []) ===
    JSON.stringify(right ?? [])
  )
}

function sameDirection(
  left:
    | MiravaOnboardingDirection
    | undefined,
  right:
    | MiravaOnboardingDirection
    | undefined,
): boolean {
  return (
    left?.primaryUniverseId ===
      right?.primaryUniverseId &&
    left?.sessionType ===
      right?.sessionType &&
    sameStringList(
      left?.recommendedFormats,
      right?.recommendedFormats,
    )
  )
}

function readMiravaOnboardingState(
  preferences: unknown,
): MiravaOnboardingState | null {
  const candidate =
    asPreferences(preferences)
      .miravaOnboarding

  const current =
    stateSchema.safeParse(candidate)

  if (current.success) {
    return current.data
  }

  const versionThree =
    versionThreeSchema.safeParse(
      candidate,
    )

  if (versionThree.success) {
    const old = versionThree.data

    const primaryUniverseId =
      old.direction
        ?.primaryUniverseId ??
      old.universeIds[0]

    const direction =
      primaryUniverseId
        ? buildMiravaDirection(
            primaryUniverseId,
            legacySessionType(
              old.goal,
              old.direction
                ?.sessionType,
            ),
          )
        : undefined

    const currentStep:
      MiravaOnboardingStepId =
      old.currentStep ===
        "promise_name" ||
      old.currentStep ===
        "objective" ||
      old.currentStep ===
        "visual_universes"
        ? old.currentStep
        : old.currentStep ===
            "direction_review"
          ? "first_universe"
          : old.currentStep

    return {
      version:
        MIRAVA_ONBOARDING_VERSION,
      status: old.status,
      currentStep,
      universeIds:
        old.universeIds,
      primaryUniverseId,
      goal: old.goal,
      direction,
      identityConsentAt:
        old.identityConsentAt,
      firstSessionId:
        old.firstSessionId,
      updatedAt:
        old.updatedAt,
      activatedAt:
        old.activatedAt,
    }
  }

  const versionTwo =
    versionTwoSchema.safeParse(
      candidate,
    )

  if (!versionTwo.success) {
    return null
  }

  const old =
    versionTwo.data

  const primaryUniverseId =
    old.universeIds[0]

  const sessionType =
    legacySessionType(
      old.goal,
      undefined,
    )

  const currentStep:
    MiravaOnboardingStepId =
    !old.goal
      ? "objective"
      : old.universeIds.length === 0
        ? "visual_universes"
        : "first_universe"

  return {
    version:
      MIRAVA_ONBOARDING_VERSION,
    status: "in_progress",
    currentStep,
    universeIds:
      old.universeIds,
    primaryUniverseId,
    goal: old.goal,
    direction:
      primaryUniverseId
        ? buildMiravaDirection(
            primaryUniverseId,
            sessionType,
          )
        : undefined,
    updatedAt:
      old.updatedAt,
  }
}

export async function GET(
  req: NextRequest,
) {
  const session =
    await verifySession()

  if (!session) {
    return apiError(
      "Unauthorized",
      401,
    )
  }

  const resetParam =
    req.nextUrl?.searchParams
      ?.get("reset") === "1"

  const user =
    await db.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        firstName: true,
        email: true,
        preferences: true,
      },
    })

  if (!user) {
    return apiError(
      "User not found",
      404,
    )
  }

  if (resetParam) {
    const preferences =
      asPreferences(
        user.preferences,
      )

    delete preferences
      .miravaOnboarding

    await db.user.update({
      where: {
        id: session.userId,
      },
      data: {
        preferences,
      },
    })

    return apiSuccess({
      firstName:
        user.firstName,
      email:
        user.email,
      onboarding: null,
    })
  }

  return apiSuccess({
    firstName:
      user.firstName,
    email:
      user.email,
    onboarding:
      readMiravaOnboardingState(
        user.preferences,
      ),
  })
}

export async function DELETE() {
  const session =
    await verifySession()

  if (!session) {
    return apiError(
      "Unauthorized",
      401,
    )
  }

  const user =
    await db.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        preferences: true,
      },
    })

  if (!user) {
    return apiError(
      "User not found",
      404,
    )
  }

  const preferences =
    asPreferences(
      user.preferences,
    )

  delete preferences
    .miravaOnboarding

  await db.user.update({
    where: {
      id: session.userId,
    },
    data: {
      preferences,
    },
  })

  return apiSuccess({
    onboarding: null,
  })
}

export async function PATCH(
  req: NextRequest,
) {
  const session =
    await verifySession()

  if (!session) {
    return apiError(
      "Unauthorized",
      401,
    )
  }

  const result =
    await validateBody(
      mutationSchema,
      req,
    )

  if ("error" in result) {
    return withMiravaPrivateHeaders(
      result.error,
    )
  }

  const user =
    await db.user.findUnique({
      where: {
        id: session.userId,
      },
      select: {
        preferences: true,
      },
    })

  if (!user) {
    return apiError(
      "User not found",
      404,
    )
  }

  const existing =
    readMiravaOnboardingState(
      user.preferences,
    )

  const now =
    new Date().toISOString()

  const action =
    result.data

  let onboarding:
    MiravaOnboardingState

  if (
    action.action === "progress"
  ) {
    const goal =
      action.goal ??
      existing?.goal

    const selected =
      action.universeIds ??
      existing?.universeIds ??
      []

    const selectedChanged =
      action.universeIds !==
        undefined &&
      !sameStringList(
        action.universeIds,
        existing?.universeIds,
      )

    let primaryUniverseId =
      action.primaryUniverseId ??
      existing?.primaryUniverseId

    if (
      selectedChanged &&
      primaryUniverseId &&
      !selected.includes(
        primaryUniverseId,
      )
    ) {
      primaryUniverseId =
        undefined
    }

    const explicitDirection =
      action.direction
        ? buildMiravaDirection(
            action.direction
              .primaryUniverseId,
            action.direction
              .sessionType,
          )
        : undefined

    let direction =
      explicitDirection ??
      existing?.direction

    if (
      action.primaryUniverseId !==
        undefined &&
      direction &&
      direction.primaryUniverseId !==
        action.primaryUniverseId
    ) {
      direction = undefined
    }

    if (
      selectedChanged &&
      direction &&
      !selected.includes(
        direction.primaryUniverseId,
      )
    ) {
      direction = undefined
    }

    const targetIndex =
      MIRAVA_ONBOARDING_STEPS
        .indexOf(
          action.currentStep,
        )

    if (
      targetIndex >= 2 &&
      !goal
    ) {
      return apiError(
        "Onboarding objective incomplete",
        409,
      )
    }

    if (
      targetIndex >= 3 &&
      selected.length === 0
    ) {
      return apiError(
        "Onboarding universes incomplete",
        409,
      )
    }

    if (
      targetIndex >= 4 &&
      (
        !primaryUniverseId ||
        !selected.includes(
          primaryUniverseId,
        )
      )
    ) {
      return apiError(
        "Onboarding primary universe incomplete",
        409,
      )
    }

    if (
      targetIndex >= 5 &&
      (
        !direction ||
        direction
          .primaryUniverseId !==
          primaryUniverseId
      )
    ) {
      return apiError(
        "Onboarding direction incomplete",
        409,
      )
    }

    const termsAcceptedAt =
      action.termsAccepted
        ? now
        : existing
            ?.termsAcceptedAt

    const identityConsentAt =
      action.identityConsentAccepted
        ? now
        : existing
            ?.identityConsentAt

    if (
      targetIndex >= 7 &&
      (!termsAcceptedAt || !identityConsentAt)
    ) {
      return apiError(
        "Identity consent missing",
        409,
      )
    }

    const answersChanged =
      (
        action.goal !==
          undefined &&
        action.goal !==
          existing?.goal
      ) ||
      selectedChanged ||
      (
        action.primaryUniverseId !==
          undefined &&
        action.primaryUniverseId !==
          existing
            ?.primaryUniverseId
      ) ||
      (
        explicitDirection !==
          undefined &&
        !sameDirection(
          explicitDirection,
          existing?.direction,
        )
      ) ||
      (
        action.termsAccepted === true &&
        !existing?.termsAcceptedAt
      ) ||
      (
        action
          .identityConsentAccepted ===
          true &&
        !existing
          ?.identityConsentAt
      )

    const keepPreparedSession =
      existing?.status ===
        "session_ready" &&
      !answersChanged

    onboarding = {
      version:
        MIRAVA_ONBOARDING_VERSION,
      status:
        keepPreparedSession
          ? "session_ready"
          : "in_progress",
      currentStep:
        action.currentStep,
      universeIds:
        selected,
      primaryUniverseId,
      goal,
      direction,
      termsAcceptedAt,
      identityConsentAt,
      ...(
        keepPreparedSession
          ? {
              firstSessionId:
                existing
                  .firstSessionId,
            }
          : {}
      ),
      updatedAt: now,
    }
  } else if (
    action.action ===
      "session_ready"
  ) {
    if (
      !existing?.goal ||
      !existing
        .primaryUniverseId ||
      !existing.direction ||
      existing.universeIds
        .length === 0
    ) {
      return apiError(
        "Onboarding direction incomplete",
        409,
      )
    }

    if (
      !existing.termsAcceptedAt ||
      !existing.identityConsentAt
    ) {
      return apiError(
        "Identity consent missing",
        409,
      )
    }

    const [
      profile,
      creation,
    ] = await Promise.all([
      db.studioIdentityProfile
        .findUnique({
          where: {
            userId:
              session.userId,
          },
          include: {
            _count: {
              select: {
                assets: true,
              },
            },
          },
        }),
      db.studioCreation
        .findUnique({
          where: {
            id:
              action.firstSessionId,
            userId:
              session.userId,
          },
        }),
    ])

    if (
      !profile ||
      profile._count.assets < 3
    ) {
      return apiError(
        "Identity profile incomplete",
        409,
      )
    }

    if (
      !creation ||
      creation
        .identityProfileId !==
        profile.id
    ) {
      return apiError(
        "First session not linked to identity",
        409,
      )
    }

    onboarding = {
      ...existing,
      status:
        "session_ready",
      currentStep:
        "capture_activation",
      firstSessionId:
        creation.id,
      updatedAt: now,
    }
  } else {
    if (
      existing?.status !==
        "session_ready" ||
      !existing.firstSessionId
    ) {
      return apiError(
        "First session not ready",
        409,
      )
    }

    const [
      profile,
      creation,
    ] = await Promise.all([
      db.studioIdentityProfile
        .findUnique({
          where: {
            userId:
              session.userId,
          },
          include: {
            _count: {
              select: {
                assets: true,
              },
            },
          },
        }),
      db.studioCreation
        .findUnique({
          where: {
            id:
              existing
                .firstSessionId,
            userId:
              session.userId,
          },
        }),
    ])

    if (
      !profile ||
      profile._count.assets < 3 ||
      !creation ||
      creation
        .identityProfileId !==
        profile.id
    ) {
      return apiError(
        "Activation prerequisites no longer valid",
        409,
      )
    }

    onboarding = {
      ...existing,
      status:
        "activated",
      currentStep:
        "capture_activation",
      activatedAt: now,
      updatedAt: now,
    }
  }

  if (
    action.action === "progress" &&
    action.termsAccepted === true &&
    action.identityConsentAccepted === true
  ) {
    await acceptMiravaRequiredConsents({
      userId: session.userId,
      locale: action.locale ?? "fr",
      source: "onboarding-v4",
    })
  }

  await db.user.update({
    where: {
      id: session.userId,
    },
    data: {
      ...(
        action.action ===
          "progress" &&
        action.firstName
          ? {
              firstName:
                action.firstName,
            }
          : {}
      ),
      preferences: {
        ...asPreferences(
          user.preferences,
        ),
        miravaOnboarding:
          onboarding,
      },
    },
  })

  return apiSuccess({
    onboarding,
  })
}
