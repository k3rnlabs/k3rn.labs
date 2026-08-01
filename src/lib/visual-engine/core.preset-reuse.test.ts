import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  identityProfile: { findUnique: vi.fn() },
  studioProfile: { findFirst: vi.fn(), create: vi.fn() },
  studioCreation: { create: vi.fn() },
  studioConsent: { create: vi.fn() },
}))

vi.mock("@/lib/db", () => ({
  db: {
    studioIdentityProfile: mocks.identityProfile,
    studioProfile: mocks.studioProfile,
    studioCreation: mocks.studioCreation,
    studioConsent: mocks.studioConsent,
  },
}))

import { createStudioCreation } from "./core"

describe("MIRAVA signed-universe reuse", () => {
  it("reuses a previously acquired universe instead of adding a duplicate studio", async () => {
    mocks.identityProfile.findUnique.mockResolvedValue(null)
    mocks.studioProfile.findFirst.mockResolvedValue({ id: "existing-studio" })
    mocks.studioCreation.create.mockResolvedValue({ id: "creation-1", studioProfileId: "existing-studio" })
    mocks.studioConsent.create.mockResolvedValue({ id: "consent-1" })

    await createStudioCreation({
      userId: "user-1",
      ageConfirmed: true,
      rightsConfirmed: true,
      privacyAccepted: true,
      openaiDisclosureAccepted: true,
      presetId: "night-glamour",
      creativeOptions: { seriesSize: 1 },
    })

    expect(mocks.studioProfile.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", presetId: "night-glamour", sourceCreationId: null },
      orderBy: { createdAt: "asc" },
    })
    expect(mocks.studioProfile.create).not.toHaveBeenCalled()
    expect(mocks.studioCreation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ studioProfileId: "existing-studio" }),
    }))
  })
})
