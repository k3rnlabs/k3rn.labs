import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks = vi.hoisted(
  () => ({
    findUser:
      vi.fn(),
    findDiscoveryLedger:
      vi.fn(),
    findPurchases:
      vi.fn(),
    findSubscription:
      vi.fn(),
    findCreation:
      vi.fn(),
    grantCredits:
      vi.fn(),
  }),
)

vi.mock(
  "@/lib/db",
  () => ({
    db: {
      user: {
        findUnique:
          mocks.findUser,
      },
      studioCreditLedger: {
        findUnique:
          mocks.findDiscoveryLedger,
        findMany:
          mocks.findPurchases,
      },
      studioSubscription: {
        findUnique:
          mocks.findSubscription,
      },
      studioCreation: {
        findUnique:
          mocks.findCreation,
      },
    },
  }),
)

vi.mock(
  "@/lib/visual-engine/credits",
  () => ({
    grantMiravaCredits:
      mocks.grantCredits,
  }),
)

import {
  grantMiravaDiscoveryUnlock,
} from "./discovery"

describe(
  "MIRAVA discovery grant",
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mocks.findUser.mockResolvedValue({
        preferences: {
          miravaOnboarding: {
            firstSessionId:
              "creation-1",
          },
        },
      })
      mocks.findDiscoveryLedger
        .mockResolvedValue(null)
      mocks.findPurchases
        .mockResolvedValue([])
      mocks.findSubscription
        .mockResolvedValue(null)
      mocks.findCreation
        .mockResolvedValue({
          id: "creation-2",
          status: "COMPLETED",
        })
      mocks.grantCredits
        .mockResolvedValue(4)
    })

    it(
      "unlocks the completed post-onboarding creation",
      async () => {
        await expect(
          grantMiravaDiscoveryUnlock({
            userId: "user-1",
            creationId:
              "creation-2",
            stripeSessionId:
              "cs_discovery",
          }),
        ).resolves.toBe(4)

        expect(
          mocks.grantCredits,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: "user-1",
            stripeSessionId:
              "cs_discovery",
            metadata:
              expect.objectContaining({
                creationId:
                  "creation-2",
                entitlement:
                  "first_purchase_gate_unlocked",
              }),
          }),
        )
      },
    )

    it(
      "never sells an unlock for the onboarding wow image",
      async () => {
        mocks.findCreation
          .mockResolvedValue({
            id: "creation-1",
            status: "COMPLETED",
          })

        await expect(
          grantMiravaDiscoveryUnlock({
            userId: "user-1",
            creationId:
              "creation-1",
            stripeSessionId:
              "cs_invalid",
          }),
        ).rejects.toThrow(
          "MIRAVA_DISCOVERY_CREATION_INVALID",
        )

        expect(
          mocks.grantCredits,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "replays the same Stripe fulfillment idempotently",
      async () => {
        mocks.findDiscoveryLedger
          .mockResolvedValue({
            metadata: {
              creationId:
                "creation-2",
            },
          })
        mocks.findPurchases
          .mockResolvedValue([
            {
              stripeSessionId:
                "cs_discovery",
            },
          ])

        await expect(
          grantMiravaDiscoveryUnlock({
            userId: "user-1",
            creationId:
              "creation-2",
            stripeSessionId:
              "cs_discovery",
          }),
        ).resolves.toBe(4)

        expect(
          mocks.grantCredits,
        ).toHaveBeenCalledTimes(1)
      },
    )

    it(
      "rejects a different creation after discovery was already used",
      async () => {
        mocks.findDiscoveryLedger
          .mockResolvedValue({
            metadata: {
              creationId:
                "creation-2",
            },
          })
        mocks.findPurchases
          .mockResolvedValue([
            {
              stripeSessionId:
                "cs_discovery",
            },
          ])
        mocks.findCreation
          .mockResolvedValue({
            id: "creation-3",
            status: "COMPLETED",
          })

        await expect(
          grantMiravaDiscoveryUnlock({
            userId: "user-1",
            creationId:
              "creation-3",
            stripeSessionId:
              "cs_other",
          }),
        ).rejects.toThrow(
          "MIRAVA_DISCOVERY_ALREADY_USED",
        )
      },
    )
  },
)
