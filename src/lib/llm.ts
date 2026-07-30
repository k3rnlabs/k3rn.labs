/**
 * Direct OpenAI gateway for server-side K3RN intelligence.
 *
 * Keeping this small, typed boundary makes provider changes explicit without
 * routing product data through an automation platform.
 */
export interface LLMMessage {
  role: "system" | "user" | "assistant"
  content: string | Array<{ type: string; [key: string]: unknown }>
}

export type LLMOptions = {
  model?: string
  maxTokens?: number
  responseFormat?: { type: "json_object" | "text" }
  timeoutMs?: number
  temperature?: number
}

type OpenAIChatCompletion = {
  choices?: Array<{ message?: { content?: string | null } }>
}

export async function callLLM(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<{ content: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured")

  const responseFormat = options.responseFormat ?? { type: "json_object" as const }
  const model = options.model ?? "gpt-4o"
  const tokenLimit = options.maxTokens ?? 1024
  const isGpt5 = model.startsWith("gpt-5")
  // GPT-5 models reject the legacy `max_tokens` parameter. Keep the gateway
  // compatible with existing GPT-4o callers while allowing focused products
  // such as Alma to use the current low-latency GPT-5 Mini model.
  const completionTokenLimit = isGpt5
    ? { max_completion_tokens: tokenLimit }
    : { max_tokens: tokenLimit }
  const sampling = isGpt5 ? {} : { temperature: options.temperature ?? 0.3 }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      store: false,
      ...completionTokenLimit,
      ...(responseFormat.type === "json_object" ? { response_format: responseFormat } : {}),
      ...sampling,
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`OpenAI chat completion HTTP ${res.status} — ${body.slice(0, 300)}`)
  }

  const data = await res.json() as OpenAIChatCompletion
  return { content: data.choices?.[0]?.message?.content ?? "" }
}

/** Sends a completion notice directly through the Telegram Bot API. */
export async function notifyTelegram(chatId: string, message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) throw new Error(`Telegram sendMessage HTTP ${res.status}`)
}
