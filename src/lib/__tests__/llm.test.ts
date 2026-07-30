import { afterEach, describe, expect, it, vi } from "vitest"
import { callLLM } from "@/lib/llm"

const originalApiKey = process.env.OPENAI_API_KEY

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalApiKey
})

describe("callLLM", () => {
  it("calls OpenAI directly and preserves structured-output requests", async () => {
    process.env.OPENAI_API_KEY = "test-key"
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"ok":true}' } }],
    }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(callLLM([{ role: "user", content: "Hello" }])).resolves.toEqual({ content: '{"ok":true}' })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-key" }) })
    )
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(payload).toMatchObject({
      model: "gpt-4o",
      response_format: { type: "json_object" },
    })
  })

  it("does not force a JSON response for conversational expert replies", async () => {
    process.env.OPENAI_API_KEY = "test-key"
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "Réponse libre" } }],
    }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await callLLM([{ role: "user", content: "Hello" }], { responseFormat: { type: "text" } })

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(payload.response_format).toBeUndefined()
  })

  it("uses max_completion_tokens for GPT-5 models", async () => {
    process.env.OPENAI_API_KEY = "test-key"
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"ok":true}' } }],
    }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await callLLM([{ role: "user", content: "Hello" }], { model: "gpt-5-mini", maxTokens: 42 })

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(payload).toMatchObject({ model: "gpt-5-mini", max_completion_tokens: 42 })
    expect(payload.max_tokens).toBeUndefined()
    expect(payload.temperature).toBeUndefined()
  })
})
