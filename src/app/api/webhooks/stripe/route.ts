import { NextRequest, NextResponse } from "next/server"
import { db as prisma } from "@/lib/db"
import { constructWebhookEvent } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  const payload = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event
  try {
    event = constructWebhookEvent(payload, signature)
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${String(err)}` }, { status: 400 })
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as { id: string; metadata: { campaignId?: string; investorEmail?: string }; amount: number }
    const { campaignId } = pi.metadata

    if (campaignId) {
      const confirmed = await prisma.investment.updateMany({
        where: { stripePaymentIntentId: pi.id, status: "PENDING" },
        data: { status: "CONFIRMED" },
      })

      if (confirmed.count > 0) {
        const campaign = await prisma.crowdfundingCampaign.findUnique({ where: { id: campaignId } })
        if (!campaign) return NextResponse.json({ received: true })

        const raised = campaign.raised + pi.amount / 100
        await prisma.crowdfundingCampaign.update({
          where: { id: campaignId },
          data: { raised },
        })

        if (raised >= campaign.goal) {
          await prisma.crowdfundingCampaign.update({
            where: { id: campaignId },
            data: { state: "CLOSED", closedAt: new Date() },
          })
        }
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as { id: string }
    await prisma.investment.updateMany({
      where: { stripePaymentIntentId: pi.id },
      data: { status: "FAILED" },
    })
  }

  return NextResponse.json({ received: true })
}
