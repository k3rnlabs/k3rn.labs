import { NextResponse } from "next/server"
import { verifySession } from "@/lib/auth"
import { downloadStudioResultAtIndexForUser, studioErrorResponse } from "@/lib/visual-engine/core"

type RouteContext = { params: { id: string } }
const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache" }

export async function GET(request: Request, { params }: RouteContext) {
  const session = await verifySession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_NO_STORE_HEADERS })
  try {
    const rawIndex = new URL(request.url).searchParams.get("index") ?? "0"
    if (!/^[0-5]$/.test(rawIndex)) return NextResponse.json({ error: "Résultat MIRAVA introuvable." }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS })
    const result = await downloadStudioResultAtIndexForUser(session.userId, params.id, Number(rawIndex))
    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.mimeType,
        ...PRIVATE_NO_STORE_HEADERS,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
      },
    })
  } catch (error) {
    const mapped = studioErrorResponse(error)
    return NextResponse.json({ error: mapped.message }, { status: mapped.status, headers: PRIVATE_NO_STORE_HEADERS })
  }
}
