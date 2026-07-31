import { createServerClient } from "@supabase/ssr"
import { type EmailOtpType } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { ensureUserSynced } from "@/lib/auth"

function isPkceOrConsumedError(message?: string): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return (
    lower.includes("code challenge does not match") ||
    lower.includes("code verifier") ||
    lower.includes("flow_state_not_found") ||
    lower.includes("pkce_cookie_missing") ||
    lower.includes("invalid grant") ||
    lower.includes("invalid_grant") ||
    lower.includes("already been used") ||
    lower.includes("already confirmed") ||
    lower.includes("token has expired") ||
    lower.includes("link is invalid")
  )
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/visual-engine/studio"

  // Valider la cible de redirection pour éviter les open redirects
  const redirectTarget = next.startsWith("/") ? next : "/visual-engine/studio"
  const successUrl = new URL(redirectTarget, origin)
  successUrl.searchParams.set("confirmed", "true")

  // Cible de redirection quand l'email est confirmé mais nécessite une connexion manuelle (ex: lien ouvert sur mobile ou autre navigateur)
  const loginConfirmedUrl = new URL("/visual-engine/studio/login", origin)
  loginConfirmedUrl.searchParams.set("confirmed", "true")

  const errorUrl = new URL("/visual-engine/studio/login", origin)

  // IMPORTANT: La réponse de redirection est créée UNE SEULE FOIS ici.
  // Le setAll du client Supabase écrit directement sur cet objet,
  // sans jamais le recréer — ce qui garantit que tous les cookies
  // de session sont propagés au navigateur.
  const successResponse = NextResponse.redirect(successUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Lecture depuis la requête entrante (les cookies que le navigateur a envoyés)
        getAll() {
          return request.cookies.getAll()
        },
        // Écriture DIRECTEMENT sur successResponse — jamais de recréation de l'objet
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            successResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 0. Si le navigateur a DÉJÀ une session active
  const { data: { user: existingUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  if (existingUser && existingUser.email) {
    await ensureUserSynced(existingUser.id, existingUser.email)
    return successResponse
  }

  // Flux 1 : Token Hash (OTP direct — Supabase envoie token_hash + type dans l'email)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      const user = data.session?.user ?? (await supabase.auth.getUser().catch(() => ({ data: { user: null } }))).data.user
      if (user && user.email) {
        await ensureUserSynced(user.id, user.email)
        return successResponse
      }
      return NextResponse.redirect(loginConfirmedUrl)
    }

    if (isPkceOrConsumedError(error.message)) {
      return NextResponse.redirect(loginConfirmedUrl)
    }

    console.error("[GET /auth/callback] verifyOtp échoué :", error?.message)
    errorUrl.searchParams.set("error", error?.message ?? "confirmation_failed")
    return NextResponse.redirect(errorUrl)
  }

  // Flux 2 : Code PKCE (flux standard Supabase SSR via son endpoint de vérification)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const user = data.session?.user ?? (await supabase.auth.getUser().catch(() => ({ data: { user: null } }))).data.user
      if (user && user.email) {
        await ensureUserSynced(user.id, user.email)
        return successResponse
      }
      return NextResponse.redirect(loginConfirmedUrl)
    }

    if (isPkceOrConsumedError(error.message)) {
      return NextResponse.redirect(loginConfirmedUrl)
    }

    console.error("[GET /auth/callback] exchangeCodeForSession échoué :", error?.message)
    errorUrl.searchParams.set("error", error?.message ?? "confirmation_failed")
    return NextResponse.redirect(errorUrl)
  }

  // Flux 3 : Aucun paramètre d'auth ou session sans code
  return NextResponse.redirect(loginConfirmedUrl)
}
