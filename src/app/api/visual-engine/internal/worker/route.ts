import {
  isMiravaWorkerRequestAuthorized,
  scheduleMiravaStudioWork,
} from "@/lib/visual-engine/vercel-worker"

export const runtime = "nodejs"
export const maxDuration = 300

export async function POST(
  request: Request,
) {
  if (
    !isMiravaWorkerRequestAuthorized(
      request,
    )
  ) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    )
  }

  const body = await request
    .json()
    .catch(() => null) as {
      creationId?: unknown
    } | null

  const creationId =
    typeof body?.creationId === "string"
      ? body.creationId
      : ""

  if (
    !/^[0-9a-f-]{36}$/i.test(
      creationId,
    )
  ) {
    return Response.json(
      {
        error: "Invalid creation",
      },
      {
        status: 400,
      },
    )
  }

  scheduleMiravaStudioWork(
    request,
    creationId,
  )

  return Response.json(
    {
      accepted: true,
    },
    {
      status: 202,
    },
  )
}
