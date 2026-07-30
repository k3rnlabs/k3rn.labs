import { randomUUID } from "crypto"
import { db } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { MIRAVA_STRIPE_PRODUCT, MIRAVA_SUBSCRIPTION_PLANS, type MiravaOfferId } from "@/lib/mirava/brand"

export const MIRAVA_ACTIVATION_CREDITS = 3

export type MiravaCreditLotKind = "ACTIVATION" | "SUBSCRIPTION" | "PURCHASE" | "COMPENSATION" | "MIGRATION"
type MiravaLedgerKind = "ACTIVATION_GRANT" | "SUBSCRIPTION_GRANT" | "PURCHASE" | "COMPENSATION"

export class MiravaCreditError extends Error {
  constructor(message: string, readonly code: "INSUFFICIENT_CREDITS" | "CREDIT_ERROR" | "NOT_FOUND") {
    super(message)
  }
}

function asCreditError(error: unknown): never {
  const message = error instanceof Error ? error.message : ""
  if (message.includes("INSUFFICIENT_STUDIO_CREDITS")) {
    throw new MiravaCreditError("Vous n’avez plus de créations MIRAVA disponibles.", "INSUFFICIENT_CREDITS")
  }
  throw new MiravaCreditError("Impossible de mettre à jour vos crédits MIRAVA.", "CREDIT_ERROR")
}

export async function grantMiravaCredits(args: {
  userId: string
  kind: MiravaCreditLotKind
  ledgerKind: MiravaLedgerKind
  amount: number
  key: string
  stripeSessionId?: string
  periodStart?: string
  periodEnd?: string
  expiresAt?: string
  metadata?: Record<string, unknown>
}): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("grant_mirava_credit_lot", {
    p_user_id: args.userId,
    p_lot_id: randomUUID(),
    p_kind: args.kind,
    p_amount: args.amount,
    p_key: args.key,
    p_ledger_kind: args.ledgerKind,
    p_stripe_session_id: args.stripeSessionId ?? "",
    p_period_start: args.periodStart ?? null,
    p_period_end: args.periodEnd ?? null,
    p_expires_at: args.expiresAt ?? null,
    p_metadata: args.metadata ?? {},
  })
  if (error) asCreditError(error)
  return Number(data)
}

export async function ensureMiravaActivation(userId: string): Promise<number> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { studioCredits: true } })
  if (!user) throw new MiravaCreditError("Compte MIRAVA introuvable.", "NOT_FOUND")
  return grantMiravaCredits({
    userId,
    kind: "ACTIVATION",
    ledgerKind: "ACTIVATION_GRANT",
    amount: MIRAVA_ACTIVATION_CREDITS,
    key: `mirava-studio-activation:${userId}:2026-07-29`,
    metadata: { product: MIRAVA_STRIPE_PRODUCT, version: "2026-07-29" },
  })
}

export async function reserveMiravaCredit(userId: string, creationId: string, key: string, amount = 1): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("reserve_mirava_credit", {
    p_user_id: userId,
    p_creation_id: creationId,
    p_key: key,
    p_amount: amount,
  })
  if (error) asCreditError(error)
  return Number(data)
}

export async function releaseMiravaCreditReservation(args: {
  userId: string
  creationId: string
  key: string
  reason: string
}): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("release_mirava_credit_reservation", {
    p_user_id: args.userId,
    p_creation_id: args.creationId,
    p_key: args.key,
    p_metadata: { product: MIRAVA_STRIPE_PRODUCT, reason: args.reason },
  })
  if (error) asCreditError(error)
  return Number(data)
}

export async function debitMiravaCreditReservation(userId: string, creationId: string, key: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("debit_mirava_credit_reservation", {
    p_user_id: userId,
    p_creation_id: creationId,
    p_key: key,
  })
  if (error) asCreditError(error)
  return Number(data)
}

export async function expireMiravaCreditLots(): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("expire_mirava_credit_lots")
  if (error) throw new MiravaCreditError("Impossible d’expirer les crédits mensuels.", "CREDIT_ERROR")
  return Number(data ?? 0)
}

export function carryableCredits(remaining: number, monthlyAllowance: number): number {
  return Math.max(0, Math.min(remaining, monthlyAllowance))
}

export async function recordMiravaSubscription(args: {
  userId: string
  stripeCustomerId?: string | null
  stripeSubscriptionId: string
  planId: MiravaOfferId | null
  status: string
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd: boolean
}): Promise<void> {
  await db.studioSubscription.upsert({
    where: { userId: args.userId },
    create: {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId ?? null,
      stripeSubscriptionId: args.stripeSubscriptionId,
      planId: args.planId,
      status: args.status,
      currentPeriodStart: args.currentPeriodStart ?? null,
      currentPeriodEnd: args.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
    },
    update: {
      stripeCustomerId: args.stripeCustomerId ?? null,
      stripeSubscriptionId: args.stripeSubscriptionId,
      planId: args.planId,
      status: args.status,
      currentPeriodStart: args.currentPeriodStart ?? null,
      currentPeriodEnd: args.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
    },
  })

  const plan = MIRAVA_SUBSCRIPTION_PLANS.find((candidate) => candidate.id === args.planId)
  const isActive = args.status === "active" || args.status === "trialing"
  if (!plan || !isActive || !args.currentPeriodStart || !args.currentPeriodEnd) return

  const periodStart = new Date(args.currentPeriodStart)
  const periodEnd = new Date(args.currentPeriodEnd)
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodEnd <= periodStart) return

  // A subscription lot may carry only once. Packs, activation and compensation
  // are deliberately excluded: they remain permanent while the account exists.
  const { data: previousLots } = await supabaseAdmin
    .from("StudioCreditLot")
    .select("id,remaining")
    .eq("userId", args.userId)
    .eq("kind", "SUBSCRIPTION")
    .is("rolloverUsedAt", null)
    .gt("remaining", 0)
    .lte("expiresAt", periodStart.toISOString())
    .order("expiresAt", { ascending: false })
    .limit(1)

  const previous = previousLots?.[0] as { id: string; remaining: number } | undefined
  if (previous) {
    const carry = carryableCredits(Number(previous.remaining), plan.credits)
    if (carry > 0) {
      const { error } = await supabaseAdmin.rpc("rollover_mirava_subscription_credits", {
        p_user_id: args.userId,
        p_lot_id: previous.id,
        p_cap: plan.credits,
        p_period_end: periodEnd.toISOString(),
      })
      if (error) throw new MiravaCreditError("Impossible de reporter les crédits MIRAVA.", "CREDIT_ERROR")
    }
  }

  await grantMiravaCredits({
    userId: args.userId,
    kind: "SUBSCRIPTION",
    ledgerKind: "SUBSCRIPTION_GRANT",
    amount: plan.credits,
    key: `mirava-studio-subscription:${args.stripeSubscriptionId}:${periodStart.toISOString()}`,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    expiresAt: periodEnd.toISOString(),
    metadata: { product: MIRAVA_STRIPE_PRODUCT, planId: plan.id, subscriptionId: args.stripeSubscriptionId },
  })
}

export async function getMiravaAccount(userId: string) {
  const [user, subscription, lots] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { studioCredits: true } }),
    db.studioSubscription.findUnique({ where: { userId } }),
    db.studioCreditLot.findMany({ where: { userId }, orderBy: { expiresAt: "asc" } }),
  ])
  if (!user) throw new MiravaCreditError("Compte MIRAVA introuvable.", "NOT_FOUND")
  const now = Date.now()
  const activeLots = lots.filter((lot: { expiresAt?: string | null }) => !lot.expiresAt || new Date(lot.expiresAt).getTime() > now)
  const credits = activeLots.reduce((sum: number, lot: { remaining: number }) => sum + Number(lot.remaining), 0)
  const expiringCredits = activeLots.reduce((sum: number, lot: { remaining: number; expiresAt?: string | null }) => {
    return lot.expiresAt ? sum + Number(lot.remaining) : sum
  }, 0)
  return {
    credits,
    expiringCredits,
    subscription: subscription ? {
      planId: subscription.planId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
    } : null,
  }
}
