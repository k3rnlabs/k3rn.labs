import { db } from "@/lib/db"
import {
  MIRAVA_DISCOVERY_OFFER,
  MIRAVA_STRIPE_PRODUCT,
} from "@/lib/mirava/brand"
import {
  grantMiravaCredits,
} from "@/lib/visual-engine/credits"

export type MiravaDiscoveryAccess = {
  firstSessionId: string | null
  unlockedCreationId: string | null
}

function asObject(
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

export function miravaDiscoveryKey(
  userId: string,
): string {
  return `mirava-discovery:${userId}`
}

export async function getMiravaDiscoveryAccess(
  userId: string,
): Promise<MiravaDiscoveryAccess> {
  const [
    user,
    ledger,
  ] = await Promise.all([
    db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        preferences: true,
      },
    }),
    db.studioCreditLedger
      .findUnique({
        where: {
          idempotencyKey:
            miravaDiscoveryKey(
              userId,
            ),
        },
      }),
  ])

  const onboarding =
    asObject(
      asObject(
        user?.preferences,
      ).miravaOnboarding,
    )

  const firstSessionId =
    typeof onboarding
      .firstSessionId === "string"
      ? onboarding.firstSessionId
      : null

  const metadata =
    asObject(
      ledger?.metadata,
    )

  const unlockedCreationId =
    typeof metadata.creationId ===
      "string"
      ? metadata.creationId
      : null

  return {
    firstSessionId,
    unlockedCreationId,
  }
}

export function isMiravaDiscoveryCreationLocked(
  access: MiravaDiscoveryAccess,
  creationId: string,
): boolean {
  return (
    access.firstSessionId ===
      creationId &&
    access.unlockedCreationId !==
      creationId
  )
}

export async function isMiravaDiscoveryResultLocked(
  userId: string,
  creationId: string,
): Promise<boolean> {
  return isMiravaDiscoveryCreationLocked(
    await getMiravaDiscoveryAccess(
      userId,
    ),
    creationId,
  )
}

export async function grantMiravaDiscoveryUnlock(
  args: {
    userId: string
    creationId: string
    stripeSessionId: string
  },
): Promise<number> {
  const access =
    await getMiravaDiscoveryAccess(
      args.userId,
    )

  if (
    access.firstSessionId !==
      args.creationId
  ) {
    throw new Error(
      "MIRAVA_DISCOVERY_CREATION_INVALID",
    )
  }

  if (
    access.unlockedCreationId &&
    access.unlockedCreationId !==
      args.creationId
  ) {
    throw new Error(
      "MIRAVA_DISCOVERY_ALREADY_USED",
    )
  }

  return grantMiravaCredits({
    userId:
      args.userId,
    kind: "PURCHASE",
    ledgerKind:
      "PURCHASE",
    amount:
      MIRAVA_DISCOVERY_OFFER
        .credits,
    key:
      miravaDiscoveryKey(
        args.userId,
      ),
    stripeSessionId:
      args.stripeSessionId,
    metadata: {
      product:
        MIRAVA_STRIPE_PRODUCT,
      offerId:
        MIRAVA_DISCOVERY_OFFER.id,
      creationId:
        args.creationId,
      entitlement:
        "first_session_unlocked",
    },
  })
}
