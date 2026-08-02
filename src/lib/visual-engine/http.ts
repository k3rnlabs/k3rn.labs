import { NextResponse } from "next/server"

// MIRAVA responses are session-bound and can include private account state,
// identity-profile metadata or a Stripe hand-off URL. Keep the policy local to
// MIRAVA rather than changing K3RN's shared API defaults.
export const MIRAVA_PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Vary: "Cookie",
} as const

export function miravaApiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: MIRAVA_PRIVATE_NO_STORE_HEADERS })
}

export function miravaApiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: MIRAVA_PRIVATE_NO_STORE_HEADERS })
}

export function withMiravaPrivateHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(MIRAVA_PRIVATE_NO_STORE_HEADERS)) response.headers.set(name, value)
  return response
}
