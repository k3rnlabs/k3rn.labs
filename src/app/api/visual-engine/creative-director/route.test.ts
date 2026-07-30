import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
  checkRateLimit: vi.fn(),
  callLLM: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ verifySession: mocks.verifySession }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock("@/lib/llm", () => ({ callLLM: mocks.callLLM }))

import { POST } from "./route"

function request(body: unknown) {
  return new NextRequest("https://mirava.test/api/visual-engine/creative-director", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/visual-engine/creative-director", () => {
  const originalApiKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = "test-key"
    mocks.verifySession.mockResolvedValue({ userId: "user-1" })
    mocks.checkRateLimit.mockResolvedValue({ success: true, remaining: 19 })
  })

  it("requires a session before asking Alma for direction", async () => {
    mocks.verifySession.mockResolvedValue(null)

    const response = await POST(request({ locale: "fr", message: "Plus solaire" }))

    expect(response.status).toBe(401)
    expect(mocks.callLLM).not.toHaveBeenCalled()
  })

  it("uses gpt-5-mini and forwards only approved creative context", async () => {
    mocks.callLLM.mockResolvedValue({ content: JSON.stringify({
      reply: "J’ouvrirais la lumière tout en gardant l’énergie de l’univers.",
      suggestions: {
        location: "Terrasse minérale",
        energy: "Solaire et spontanée",
        framing: "Plein pied",
      },
    }) })

    const response = await POST(request({
      locale: "fr",
      message: "Je veux une série plus solaire.",
      universeId: "escapade-solaire",
      creativeOptions: { beauty: "Peau lumineuse" },
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      reply: "J’ouvrirais la lumière tout en gardant l’énergie de l’univers.",
      suggestions: {
        location: "Terrasse minérale",
        energy: "Solaire et spontanée",
        framing: "Plein pied",
      },
    })
    expect(mocks.callLLM).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ model: "gpt-5-mini", responseFormat: { type: "json_object" } }),
    )
    const messages = mocks.callLLM.mock.calls[0][0]
    expect(JSON.parse(messages[1].content)).toEqual({
      language: "fr",
      universe: "escapade-solaire",
      approvedCreativeOptions: { beauty: "Peau lumineuse" },
      clientRequest: "Je veux une série plus solaire.",
    })
  })

  it("keeps the session available when the provider is rate-limited", async () => {
    mocks.callLLM.mockRejectedValue(new Error("OpenAI chat completion HTTP 429"))

    const response = await POST(request({ locale: "fr", message: "Plus solaire" }))

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toEqual({ error: "Alma reçoit beaucoup de demandes. Réessayez dans un instant." })
  })

  it("does not call the provider when Alma is not configured", async () => {
    delete process.env.OPENAI_API_KEY

    const response = await POST(request({ locale: "fr", message: "Plus solaire" }))

    expect(response.status).toBe(503)
    expect(mocks.callLLM).not.toHaveBeenCalled()
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalApiKey
  })
})
