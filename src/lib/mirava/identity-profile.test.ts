import { describe, expect, it } from "vitest"
import { isMiravaIdentityProfileReady, MIRAVA_MAX_IDENTITY_PHOTOS, MIRAVA_MIN_IDENTITY_PHOTOS } from "./identity-profile"

describe("MIRAVA identity onboarding contract", () => {
  it("requires the frontal and two three-quarter portraits", () => {
    expect(MIRAVA_MIN_IDENTITY_PHOTOS).toBe(3)
    expect(isMiravaIdentityProfileReady(null)).toBe(false)
    expect(isMiravaIdentityProfileReady({ assetCount: 2 })).toBe(false)
    expect(isMiravaIdentityProfileReady({ assetCount: 3 })).toBe(true)
  })

  it("keeps hair and full-body references within the six-photo profile", () => {
    expect(MIRAVA_MAX_IDENTITY_PHOTOS).toBe(6)
    expect(isMiravaIdentityProfileReady({ assetCount: 6 })).toBe(true)
  })
})
