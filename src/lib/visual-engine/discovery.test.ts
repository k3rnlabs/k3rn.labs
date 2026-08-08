import {
  describe,
  expect,
  it,
} from "vitest"
import {
  hasVerifiedMiravaPurchase,
  isMiravaDiscoveryCreationLocked,
} from "./discovery"

describe(
  "MIRAVA discovery entitlement",
  () => {
    it(
      "shows the onboarding image and locks the next creation before purchase",
      () => {
        const access = {
          firstSessionId:
            "creation-1",
          discoveryCreationId:
            null,
          hasVerifiedPurchase:
            false,
        }

        expect(
          isMiravaDiscoveryCreationLocked(
            access,
            "creation-1",
          ),
        ).toBe(false)

        expect(
          isMiravaDiscoveryCreationLocked(
            access,
            "creation-2",
          ),
        ).toBe(true)
      },
    )

    it(
      "unlocks the protected post-onboarding creation after purchase",
      () => {
        expect(
          isMiravaDiscoveryCreationLocked(
            {
              firstSessionId:
                "creation-1",
              discoveryCreationId:
                null,
              hasVerifiedPurchase:
                true,
            },
            "creation-2",
          ),
        ).toBe(false)
      },
    )

    it(
      "does not lock accounts without a completed onboarding session",
      () => {
        expect(
          isMiravaDiscoveryCreationLocked(
            {
              firstSessionId:
                null,
              discoveryCreationId:
                null,
              hasVerifiedPurchase:
                false,
            },
            "creation-2",
          ),
        ).toBe(false)
      },
    )

    it(
      "recognizes either a paid pack or a paid subscription",
      () => {
        expect(
          hasVerifiedMiravaPurchase({
            purchaseStripeSessionIds: [
              null,
              "cs_paid_pack",
            ],
            subscriptionFirstPaidAt:
              null,
          }),
        ).toBe(true)

        expect(
          hasVerifiedMiravaPurchase({
            purchaseStripeSessionIds: [],
            subscriptionFirstPaidAt:
              "2026-08-08T18:00:00.000Z",
          }),
        ).toBe(true)

        expect(
          hasVerifiedMiravaPurchase({
            purchaseStripeSessionIds: [
              null,
            ],
            subscriptionFirstPaidAt:
              null,
          }),
        ).toBe(false)
      },
    )
  },
)
