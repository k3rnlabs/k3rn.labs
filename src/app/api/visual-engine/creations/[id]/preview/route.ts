import { NextResponse } from "next/server"
import { verifySession } from "@/lib/auth"
import {
  previewStudioResultAtIndexForUser,
  studioErrorResponse,
} from "@/lib/visual-engine/core"
import {
  MIRAVA_PRIVATE_NO_STORE_HEADERS,
} from "@/lib/visual-engine/http"

type RouteContext = {
  params: {
    id: string
  }
}

export async function GET(
  request: Request,
  { params }: RouteContext,
) {
  const session =
    await verifySession()

  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
        headers:
          MIRAVA_PRIVATE_NO_STORE_HEADERS,
      },
    )
  }

  try {
    const rawIndex =
      new URL(request.url)
        .searchParams
        .get("index") ?? "0"

    if (!/^[0-5]$/.test(rawIndex)) {
      return NextResponse.json(
        {
          error:
            "Aperçu MIRAVA introuvable.",
        },
        {
          status: 404,
          headers:
            MIRAVA_PRIVATE_NO_STORE_HEADERS,
        },
      )
    }

    const result =
      await previewStudioResultAtIndexForUser(
        session.userId,
        params.id,
        Number(rawIndex),
      )

    return new NextResponse(
      new Uint8Array(
        result.buffer,
      ),
      {
        headers: {
          "Content-Type":
            result.mimeType,
          ...MIRAVA_PRIVATE_NO_STORE_HEADERS,
          "X-Content-Type-Options":
            "nosniff",
          "Content-Security-Policy":
            "default-src 'none'; img-src 'self'; sandbox",
        },
      },
    )
  } catch (error) {
    const mapped =
      studioErrorResponse(error)

    return NextResponse.json(
      {
        error:
          mapped.message,
      },
      {
        status:
          mapped.status,
        headers:
          MIRAVA_PRIVATE_NO_STORE_HEADERS,
      },
    )
  }
}
