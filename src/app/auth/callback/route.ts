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

  // Instance de réponse pour propager les cookies Set-Cookie sur la redirection HTTP
  let response = NextResponse.redirect(successUrl)

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
          response = NextResponse.redirect(successUrl)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Flux Jeton OTP / Token Hash (Confirmation d'email directe Supabase, insensible au navigateur)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return response
    }
    console.error("[GET /auth/callback] Erreur verifyOtp :", error.message)
    // Si l'utilisateur est déjà connecté (ex: clic secondaire sur le lien), on l'envoie sur le studio
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    if (user) {
      return NextResponse.redirect(successUrl)
    }
    errorUrl.searchParams.set("error", error.message)
    return NextResponse.redirect(errorUrl)
  }
  // 2. Flux Code PKCE (Supabase Auth SSR standard)
  else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
    console.error("[GET /auth/callback] Erreur exchangeCodeForSession :", error.message)
    // Si l'utilisateur est déjà connecté (ex: clic secondaire sur le lien), on l'envoie sur le studio
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    if (user) {
      return NextResponse.redirect(successUrl)
    }
    errorUrl.searchParams.set("error", error.message)
    return NextResponse.redirect(errorUrl)
  } else {
    const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    if (user) {
      return NextResponse.redirect(successUrl)
    }
    errorUrl.searchParams.set("error", "confirmation_failed")
    return NextResponse.redirect(errorUrl)
  }
}
