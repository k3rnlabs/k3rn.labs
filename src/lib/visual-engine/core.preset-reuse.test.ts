import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  identityProfile: { findUnique: vi.fn() },
  studioProfile: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  studioCreation: { create: vi.fn() },
  studioSession: {
    create:
      vi.fn().mockResolvedValue({
        id:
          "session-1",
      }),
    delete:
      vi.fn().mockResolvedValue(null),
  },
  studioConsent: { create: vi.fn() },
}))

vi.mock("@/lib/db", () => ({
  db: {
    studioIdentityProfile: mocks.identityProfile,
    studioProfile: mocks.studioProfile,
    studioCreation: mocks.studioCreation,
    studioSession: mocks.studioSession,
    studioConsent: mocks.studioConsent,
  },
}))

import {
  createCreationFromStudioProfile,
  createStudioCreation,
} from "./core"

describe("MIRAVA signed-universe reuse", () => {
  it("reuses a previously acquired universe instead of adding a duplicate studio", async () => {
    mocks.identityProfile.findUnique.mockResolvedValue(null)
    mocks.studioProfile.findFirst.mockResolvedValue({
      id: "existing-studio",
      creativeDirectionSummary: null,
      masterPrompt: "legacy short prompt",
      negativePrompt: "legacy guardrails",
    })
    mocks.studioProfile.update.mockImplementation(
      async ({ data }) => ({
        id: "existing-studio",
        ...data,
      }),
    )
    mocks.studioCreation.create.mockResolvedValue({
      id: "creation-1",
      studioProfileId: "existing-studio",
    })
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
    expect(
      mocks.studioProfile.create,
    ).not.toHaveBeenCalled()

    expect(
      mocks.studioProfile.update,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "existing-studio",
          userId: "user-1",
        },
        data:
          expect.objectContaining({
            creativeDirectionSummary:
              expect.stringContaining(
                "night-glamour@1.0.0",
              ),
            masterPrompt:
              expect.stringContaining(
                "OFFICIAL MIRAVA UNIVERSE",
              ),
          }),
      }),
    )

    expect(mocks.studioCreation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ studioProfileId: "existing-studio" }),
    }))
  })

  it(
    "refreshes a legacy signed universe before reusing it from the private library",
    async () => {
      mocks.studioProfile.findUnique.mockResolvedValue({
        id:
          "legacy-night-studio",
        userId:
          "user-1",
        presetId:
          "night-glamour",
        creativeDirectionSummary:
          null,
        masterPrompt:
          "legacy short prompt",
        negativePrompt:
          "legacy exclusions",
      })

      mocks.studioProfile.update.mockImplementation(
        async ({ data }) => ({
          id:
            "legacy-night-studio",
          userId:
            "user-1",
          presetId:
            "night-glamour",
          ...data,
        }),
      )

      mocks.identityProfile.findUnique.mockResolvedValue({
        id:
          "identity-profile-1",
      })

      mocks.studioCreation.create.mockImplementation(
        async ({ data }) => ({
          id:
            "creation-from-library",
          ...data,
        }),
      )

      await createCreationFromStudioProfile({
        userId:
          "user-1",
        studioProfileId:
          "legacy-night-studio",
        creativeOptions: {
          location:
            "Private hotel entrance",
          seriesSize:
            1,
        },
      })

      expect(
        mocks.studioProfile.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id:
              "legacy-night-studio",
            userId:
              "user-1",
          },
          data:
            expect.objectContaining({
              creativeDirectionSummary:
                expect.stringContaining(
                  "night-glamour@1.0.0",
                ),
              masterPrompt:
                expect.stringContaining(
                  "OFFICIAL MIRAVA UNIVERSE",
                ),
            }),
        }),
      )

      expect(
        mocks.studioCreation.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data:
            expect.objectContaining({
              presetId:
                "night-glamour",
              creativeDirectionSummary:
                expect.stringContaining(
                  "night-glamour@1.0.0",
                ),
              masterPrompt:
                expect.stringContaining(
                  "OFFICIAL MIRAVA UNIVERSE",
                ),
              creativeOptions: {
                location:
                  "Private hotel entrance",
                seriesSize:
                  1,
              },
            }),
        }),
      )
    },
  )

})
