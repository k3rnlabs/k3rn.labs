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
  discoveryCreationId: string | null
  hasVerifiedPurchase: boolean
}

export function hasVerifiedMiravaPurchase(
  args: {
    purchaseStripeSessionIds:
      Array<string | null | undefined>
    subscriptionFirstPaidAt:
      string | null | undefined
  },
): boolean {
  return (
    args.purchaseStripeSessionIds
      .some(Boolean) ||
    Boolean(
      args.subscriptionFirstPaidAt,
    )
  )
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
    paidPurchases,
    subscription,
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
    db.studioCreditLedger
      .findMany({
        where: {
          userId,
          kind: "PURCHASE",
        },
      }),
    db.studioSubscription
      .findUnique({
        where: {
          userId,
        },
        select: {
          firstPaidAt: true,
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

  const discoveryCreationId =
    typeof metadata.creationId ===
      "string"
      ? metadata.creationId
      : null

  const hasVerifiedPurchase =
    hasVerifiedMiravaPurchase({
      purchaseStripeSessionIds:
        paidPurchases.map(
          (purchase) =>
            purchase
              .stripeSessionId,
        ),
      subscriptionFirstPaidAt:
        subscription
          ?.firstPaidAt,
    })

  return {
    firstSessionId,
    discoveryCreationId,
    hasVerifiedPurchase,
  }
}

export function isMiravaDiscoveryCreationLocked(
  access: MiravaDiscoveryAccess,
  creationId: string,
): boolean {
  return (
    Boolean(
      access.firstSessionId,
    ) &&
    access.firstSessionId !==
      creationId &&
    !access.hasVerifiedPurchase
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
  const [
    access,
    creation,
  ] = await Promise.all([
    getMiravaDiscoveryAccess(
      args.userId,
    ),
    db.studioCreation.findUnique({
      where: {
        id:
          args.creationId,
        userId:
          args.userId,
      },
      select: {
        id: true,
        status: true,
      },
    }),
  ])

  if (
    !creation ||
    creation.status !==
      "COMPLETED"
  ) {
    throw new Error(
      "MIRAVA_DISCOVERY_CREATION_INVALID",
    )
  }

  if (
    access.discoveryCreationId &&
    access.discoveryCreationId !==
      args.creationId
  ) {
    throw new Error(
      "MIRAVA_DISCOVERY_ALREADY_USED",
    )
  }

  const isIdempotentRetry =
    access.discoveryCreationId ===
      args.creationId

  if (
    !isIdempotentRetry &&
    !isMiravaDiscoveryCreationLocked(
      access,
      args.creationId,
    )
  ) {
    throw new Error(
      "MIRAVA_DISCOVERY_CREATION_INVALID",
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
        "first_purchase_gate_unlocked",
    },
  })
}
