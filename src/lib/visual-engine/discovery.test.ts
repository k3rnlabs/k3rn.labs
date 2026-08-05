import {
  describe,
  expect,
  it,
} from "vitest"
import {
  isMiravaDiscoveryCreationLocked,
} from "./discovery"

describe(
  "MIRAVA discovery entitlement",
  () => {
    it(
      "locks only the onboarding first session before purchase",
      () => {
        const access = {
          firstSessionId:
            "creation-1",
          unlockedCreationId:
            null,
        }

        expect(
          isMiravaDiscoveryCreationLocked(
            access,
            "creation-1",
          ),
        ).toBe(true)

        expect(
          isMiravaDiscoveryCreationLocked(
            access,
            "creation-2",
          ),
        ).toBe(false)
      },
    )

    it(
      "unlocks the exact purchased first session",
      () => {
        expect(
          isMiravaDiscoveryCreationLocked(
            {
              firstSessionId:
                "creation-1",
              unlockedCreationId:
                "creation-1",
            },
            "creation-1",
          ),
        ).toBe(false)
      },
    )
  },
)
