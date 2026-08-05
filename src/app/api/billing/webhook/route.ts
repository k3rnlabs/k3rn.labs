import { NextRequest, NextResponse } from "next/server"
import { constructWebhookEvent } from "@/lib/stripe"
import { getPackById } from "@/lib/credit-packs"
import { getPlanByPriceId } from "@/lib/subscription-plans"
import { creditTopUpMissions } from "@/lib/mission-budget"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getMiravaOffer, getMiravaPlanByPriceId, MIRAVA_STRIPE_PRODUCT } from "@/lib/mirava/brand"
import { grantMiravaCredits, recordMiravaSubscription } from "@/lib/visual-engine/credits"
import {
  grantMiravaDiscoveryUnlock,
} from "@/lib/visual-engine/discovery"
import { getStripe } from "@/lib/stripe"
import Stripe from "stripe"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(body, signature)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // ── One-time top-up ────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ received: true })
    }

    // Top-up one-shot (mode: payment)
    if (checkoutSession.mode === "payment") {
      const { userId, offerId, packId, product } = checkoutSession.metadata ?? {}
      if (!userId || (!offerId && !packId)) {
        console.error("[billing] top-up: missing metadata", checkoutSession.metadata)
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      if (product === MIRAVA_STRIPE_PRODUCT) {
        const offer =
          getMiravaOffer(
            offerId ?? "",
          )

        if (
          offer?.kind ===
            "discovery"
        ) {
          const creationId =
            checkoutSession
              .metadata
              ?.creationId

          if (!creationId) {
            console.error(
              "[billing] mirava discovery: missing creationId",
              checkoutSession.metadata,
            )

            return NextResponse.json(
              {
                error:
                  "Missing MIRAVA discovery creation",
              },
              {
                status: 400,
              },
            )
          }

          try {
            await grantMiravaDiscoveryUnlock({
              userId,
              creationId,
              stripeSessionId:
                checkoutSession.id,
            })

            console.log(
              `[billing] MIRAVA discovery unlocked → user ${userId} (creation: ${creationId})`,
            )

            return NextResponse.json({
              received: true,
            })
          } catch (error) {
            console.error(
              "[billing] MIRAVA discovery unlock failed",
              error,
            )

            return NextResponse.json(
              {
                error:
                  "Studio discovery unlock failed",
              },
              {
                status: 500,
              },
            )
          }
        }

        if (
          offer?.kind !== "pack"
        ) {
          console.error(
            "[billing] mirava-studio top-up: unknown offer",
            checkoutSession.metadata,
          )

          return NextResponse.json(
            {
              error:
                "Unknown MIRAVA Studio offer",
            },
            {
              status: 400,
            },
          )
        }

        try {
          await grantMiravaCredits({
            userId,
            kind: "PURCHASE",
            ledgerKind:
              "PURCHASE",
            amount:
              offer.credits,
            key:
              `mirava-studio-stripe:${checkoutSession.id}`,
            stripeSessionId:
              checkoutSession.id,
            metadata: {
              product:
                MIRAVA_STRIPE_PRODUCT,
              offerId:
                offer.id,
            },
          })

          console.log(
            `[billing] MIRAVA Studio credits applied → user ${userId} (offer: ${offer.id})`,
          )

          return NextResponse.json({
            received: true,
          })
        } catch {
          return NextResponse.json(
            {
              error:
                "Studio credit application failed",
            },
            {
              status: 500,
            },
          )
        }
      }

      if (!packId) return NextResponse.json({ error: "Missing pack metadata" }, { status: 400 })
      const pack = getPackById(packId)
      if (!pack) {
        console.error("[billing] top-up: unknown packId", packId)
        return NextResponse.json({ error: "Unknown pack" }, { status: 400 })
      }

      await creditTopUpMissions(userId, pack.credits)
      console.log(`[billing] +${pack.credits} top-up missions → user ${userId} (pack: ${packId})`)
    }

    // Subscription checkout — l'activation est gérée par customer.subscription.created
  }

  // ── Subscription created / activated ──────────────────────────────────────
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.userId
    if (!userId) {
      console.error("[billing] subscription event: missing userId in metadata")
      return NextResponse.json({ received: true })
    }

    const priceId = sub.items.data[0]?.price?.id
    if (sub.metadata?.product === MIRAVA_STRIPE_PRODUCT) {
      const miravaPlan = getMiravaPlanByPriceId(priceId)
      const periodStart = (sub.items.data[0] as Stripe.SubscriptionItem & { current_period_start?: number })?.current_period_start
      const periodEnd = (sub.items.data[0] as Stripe.SubscriptionItem & { current_period_end?: number })?.current_period_end
      await recordMiravaSubscription({
        userId,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripeSubscriptionId: sub.id,
        planId: miravaPlan?.id ?? null,
        status: sub.status,
        currentPeriodStart: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      })
      await supabaseAdmin.from("User").update({ stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id }).eq("id", userId)
      return NextResponse.json({ received: true })
    }
    const plan = priceId ? getPlanByPriceId(priceId) : undefined

    if (!plan || plan.tier === "FREE") {
      console.warn("[billing] subscription event: unknown price or FREE tier", priceId)
      return NextResponse.json({ received: true })
    }

    const isActive = sub.status === "active" || sub.status === "trialing"

    await supabaseAdmin
      .from("User")
      .update({
        subscriptionTier: isActive ? plan.tier : "FREE",
        stripeSubscriptionId: sub.id,
        subscriptionStatus: sub.status,
        monthlyMissionAllowance: isActive ? plan.missionsPerMonth : 5,
        // Reset usage au changement de plan
        monthlyMissionsUsed: 0,
        allowanceResetAt: nextMonthReset(),
      })
      .eq("id", userId)

    console.log(`[billing] subscription ${sub.status} → user ${userId} (tier: ${plan.tier}, ${plan.missionsPerMonth} missions/mois)`)
  }

  // ── Subscription cancelled / expired ──────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.userId
    if (!userId) return NextResponse.json({ received: true })

    if (sub.metadata?.product === MIRAVA_STRIPE_PRODUCT) {
      await recordMiravaSubscription({
        userId,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripeSubscriptionId: sub.id,
        planId: null,
        status: "canceled",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      })
      return NextResponse.json({ received: true })
    }

    await supabaseAdmin
      .from("User")
      .update({
        subscriptionTier: "FREE",
        stripeSubscriptionId: null,
        subscriptionStatus: "canceled",
        monthlyMissionAllowance: 5,
        monthlyMissionsUsed: 0,
      })
      .eq("id", userId)

    console.log(`[billing] subscription deleted → user ${userId} downgraded to FREE`)
  }

  // ── Payment failed ─────────────────────────────────────────────────────────
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } }
    const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id
    if (!subId) return NextResponse.json({ received: true })

    const subscription = await getStripe().subscriptions.retrieve(subId)
    if (subscription.metadata?.product === MIRAVA_STRIPE_PRODUCT && subscription.metadata.userId) {
      const item = subscription.items.data[0] as Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number }
      const plan = getMiravaPlanByPriceId(item?.price?.id)
      await recordMiravaSubscription({
        userId: subscription.metadata.userId,
        stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        stripeSubscriptionId: subscription.id,
        planId: plan?.id ?? null,
        status: subscription.status,
        currentPeriodStart: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
        currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })
      return NextResponse.json({ received: true })
    }

    await supabaseAdmin
      .from("User")
      .update({ subscriptionStatus: "past_due" })
      .eq("stripeSubscriptionId", subId)

    console.warn(`[billing] invoice payment failed for subscription ${subId}`)
  }

  // Stripe may emit a paid invoice without a subscription.updated event. Reading
  // the subscription here keeps the monthly grant idempotent by period start.
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } }
    const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id
    if (subscriptionId) {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId)
      if (sub.metadata?.product === MIRAVA_STRIPE_PRODUCT && sub.metadata.userId) {
        const priceId = sub.items.data[0]?.price?.id
        const plan = getMiravaPlanByPriceId(priceId)
        const item = sub.items.data[0] as Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number }
        await recordMiravaSubscription({
          userId: sub.metadata.userId,
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          stripeSubscriptionId: sub.id,
          planId: plan?.id ?? null,
          status: sub.status,
          currentPeriodStart: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null,
          currentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}

function nextMonthReset(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
