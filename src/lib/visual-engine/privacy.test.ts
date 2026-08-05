import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    studioConsentEvent: {
      findMany: mocks.findMany,
      create: mocks.create,
    },
  },
}))

import {
  acceptMiravaRequiredConsents,
  getMiravaPrivacyStatus,
  withdrawMiravaIdentityConsent,
} from "./privacy"

describe("MIRAVA privacy evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findMany.mockResolvedValue([])
    mocks.create.mockResolvedValue({ id: "event-1" })
  })

  it("starts with every optional or required choice disabled", async () => {
    await expect(getMiravaPrivacyStatus("user-1")).resolves.toMatchObject({
      termsAccepted: false,
      identityProcessingAccepted: false,
      analyticsAccepted: null,
      requiredAccepted: false,
    })
  })

  it("records terms and identity processing as separate evidence", async () => {
    await acceptMiravaRequiredConsents({ userId: "user-1", locale: "fr", source: "test" })

    expect(mocks.create).toHaveBeenCalledTimes(2)
    expect(mocks.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ purpose: "terms", decision: "accepted" }),
    }))
    expect(mocks.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ purpose: "identity_processing", decision: "accepted" }),
    }))
  })

  it("records withdrawal without deleting the historical evidence", async () => {
    await withdrawMiravaIdentityConsent({ userId: "user-1", source: "test" })

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ purpose: "identity_processing", decision: "withdrawn" }),
    }))
  })
})
