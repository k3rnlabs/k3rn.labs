import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
  findUnique: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  verifySession: mocks.verifySession,
}))

vi.mock("@/lib/db", () => ({
  db: {
    card: {
      findUnique: mocks.findUnique,
    },
  },
}))

vi.mock("@/lib/audit", () => ({
  createAuditLog: vi.fn(),
}))

import { GET } from "./route"

const request = new NextRequest("https://k3rn.test/api/cards/card-1")
const params = { params: Promise.resolve({ id: "card-1" }) }

describe("GET /api/cards/[id] authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects anonymous access before reading the database", async () => {
    mocks.verifySession.mockResolvedValue(null)

    const response = await GET(request, params)

    expect(response.status).toBe(401)
    expect(mocks.findUnique).not.toHaveBeenCalled()
  })

  it("rejects access to a card owned by another user", async () => {
    mocks.verifySession.mockResolvedValue({ userId: "user-b" })
    mocks.findUnique.mockResolvedValue({
      id: "card-1",
      subFolderId: "subfolder-1",
      subFolder: {
        dossierId: "dossier-a",
        dossier: { ownerId: "user-a" },
      },
      dossier: null,
    })

    const response = await GET(request, params)

    expect(response.status).toBe(403)
    expect(mocks.findUnique).toHaveBeenCalledTimes(1)
  })

  it("allows the owner through the indirect dossier relation", async () => {
    mocks.verifySession.mockResolvedValue({ userId: "user-a" })
    mocks.findUnique
      .mockResolvedValueOnce({
        id: "card-1",
        subFolderId: "subfolder-1",
        subFolder: {
          dossierId: "dossier-a",
          dossier: { ownerId: "user-a" },
        },
        dossier: null,
      })
      .mockResolvedValueOnce({
        id: "card-1",
        title: "Owned card",
        transitionLogs: [],
        outgoingRelations: [],
        incomingRelations: [],
      })

    const response = await GET(request, params)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      id: "card-1",
      title: "Owned card",
    })
    expect(mocks.findUnique).toHaveBeenCalledTimes(2)
  })
})
