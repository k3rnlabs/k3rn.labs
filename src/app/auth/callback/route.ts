import { createServerClient } from "@supabase/ssr"
import { type EmailOtpType } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/visual-engine/studio"

  const redirectTarget = next.startsWith("/") ? next : "/visual-engine/studio"
  const successUrl = new URL(redirectTarget, origin)
  successUrl.searchParams.set("confirmed", "true")

  const errorUrl = new URL("/visual-engine/studio/login", origin)

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  // 1. Flux Jeton OTP / Token Hash (Confirmation d'email directe Supabase, insensible au navigateur)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(successUrl.toString())
    }
    console.error("[GET /auth/callback] Erreur verifyOtp :", error.message)
    errorUrl.searchParams.set("error", error.message)
  }
  // 2. Flux Code PKCE (Supabase Auth SSR standard)
  else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(successUrl.toString())
    }
    console.error("[GET /auth/callback] Erreur exchangeCodeForSession :", error.message)
    errorUrl.searchParams.set("error", error.message)
  } else {
    errorUrl.searchParams.set("error", "confirmation_failed")
  }

  return NextResponse.redirect(errorUrl.toString())
}
