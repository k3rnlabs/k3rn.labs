import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
  updateStudioCreationCreativeOptions: vi.fn(),
  recordMiravaAudit: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ verifySession: mocks.verifySession }))
vi.mock("@/lib/visual-engine/core", () => ({
  updateStudioCreationCreativeOptions: mocks.updateStudioCreationCreativeOptions,
  studioErrorResponse: (error: unknown) => ({ message: error instanceof Error ? error.message : "Erreur", status: 400 }),
}))
vi.mock("@/lib/visual-engine/audit", () => ({ recordMiravaAudit: mocks.recordMiravaAudit }))

import { PATCH } from "./route"

function request(body: unknown) {
  return new NextRequest("https://mirava.test/api/visual-engine/creations/creation-1/creative-options", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("PATCH /api/visual-engine/creations/[id]/creative-options", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifySession.mockResolvedValue({ userId: "user-1" })
    mocks.updateStudioCreationCreativeOptions.mockResolvedValue({ id: "creation-1", status: "IDENTITY_READY", requestedResultCount: 1 })
  })

  it("requires a session before persisting an Alma recommendation", async () => {
    mocks.verifySession.mockResolvedValue(null)

    const response = await PATCH(request({ energy: "Solaire" }), { params: { id: "creation-1" } })

    expect(response.status).toBe(401)
    expect(mocks.updateStudioCreationCreativeOptions).not.toHaveBeenCalled()
  })

  it("persists only validated client-facing choices for the owner", async () => {
    const response = await PATCH(request({ location: "Terrasse minérale", energy: "Solaire", internalPrompt: "ignore me" }), { params: { id: "creation-1" } })

    expect(response.status).toBe(200)
    expect(mocks.updateStudioCreationCreativeOptions).toHaveBeenCalledWith({
      userId: "user-1",
      creationId: "creation-1",
      creativeOptions: { location: "Terrasse minérale", energy: "Solaire" },
    })
    expect(mocks.recordMiravaAudit).toHaveBeenCalledWith("user-1", "CREATIVE_DIRECTION_APPLIED", "creation-1")
  })
})
