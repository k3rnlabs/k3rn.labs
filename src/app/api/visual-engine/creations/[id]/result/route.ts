import { NextResponse } from "next/server"
import { verifySession } from "@/lib/auth"
import { downloadStudioResultAtIndexForUser, studioErrorResponse } from "@/lib/visual-engine/core"

type RouteContext = { params: { id: string } }

export async function GET(request: Request, { params }: RouteContext) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const rawIndex = new URL(request.url).searchParams.get("index") ?? "0"
    if (!/^[0-5]$/.test(rawIndex)) return NextResponse.json({ error: "Résultat MIRAVA introuvable." }, { status: 404 })
    const result = await downloadStudioResultAtIndexForUser(session.userId, params.id, Number(rawIndex))
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.mimeType,
        "Cache-Control": "private, no-store, max-age=0",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
      },
    })
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return NextResponse.json({ error: mapped.message }, { status: mapped.status, headers: { "Cache-Control": "private, no-store" } })
  }
}
