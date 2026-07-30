import { NextRequest, NextResponse } from "next/server"
import { linkTelegramChat } from "@/lib/telegram"

type TelegramUpdate = {
  message?: { text?: string; chat?: { id?: number | string } }
}

/** Telegram Bot API webhook. Configure it with TELEGRAM_WEBHOOK_SECRET. */
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token")
  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const update = await req.json() as TelegramUpdate
  const text = update.message?.text?.trim() ?? ""
  const chatId = update.message?.chat?.id
  const match = text.match(/^\/link(?:@\w+)?\s+(\S+)$/i)

  if (!match || chatId === undefined) return NextResponse.json({ ok: true })

  try {
    const linked = await linkTelegramChat(match[1], String(chatId))
    return NextResponse.json({ ok: true, linked: linked.ok })
  } catch (error) {
    console.error("Telegram link webhook failed", error)
    return NextResponse.json({ error: "Link failed" }, { status: 500 })
  }
}
