import {
  readFileSync,
} from "node:fs"
import path from "node:path"
import {
  describe,
  expect,
  it,
} from "vitest"

describe(
  "MIRAVA Stripe fulfillment contract",
  () => {
    const route = readFileSync(
      path.resolve(
        process.cwd(),
        "src/app/api/billing/webhook/route.ts",
      ),
      "utf8",
    )

    it(
      "fulfills paid and zero-cost completed Checkout sessions",
      () => {
        expect(route).toContain(
          'event.type === "checkout.session.completed"',
        )
        expect(route).toContain(
          'event.type === "checkout.session.async_payment_succeeded"',
        )
        expect(route).toContain(
          'checkoutSession.payment_status ===\n        "paid"',
        )
        expect(route).toContain(
          'checkoutSession.payment_status ===\n        "no_payment_required"',
        )
        expect(route).toContain(
          "checkoutSession.amount_total === 0",
        )
      },
    )

    it(
      "keeps MIRAVA fulfillment idempotent by Checkout Session",
      () => {
        expect(route).toContain(
          "`mirava-studio-stripe:${checkoutSession.id}`",
        )
        expect(route).toContain(
          "stripeSessionId:\n              checkoutSession.id",
        )
      },
    )

    it(
      "logs fulfillment failures with enough context",
      () => {
        expect(route).toContain(
          "[billing] MIRAVA Studio credit application failed",
        )
        expect(route).toContain(
          "paymentStatus:",
        )
        expect(route).toContain(
          "amountTotal:",
        )
      },
    )
  },
)
