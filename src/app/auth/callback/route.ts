import { createServerClient } from "@supabase/ssr"
import { type EmailOtpType } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { ensureUserSynced } from "@/lib/auth"

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

  // Flux 1 : Token Hash (OTP direct — Supabase envoie token_hash + type dans l'email)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      const user = data.session?.user ?? (await supabase.auth.getUser().catch(() => ({ data: { user: null } }))).data.user
      if (user && user.email) {
        await ensureUserSynced(user.id, user.email)
        return successResponse
      }
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
    }

    console.error("[GET /auth/callback] exchangeCodeForSession échoué :", error?.message)
    errorUrl.searchParams.set("error", error?.message ?? "confirmation_failed")
    return NextResponse.redirect(errorUrl)
  }

  // Flux 3 : Aucun paramètre d'auth — vérifier s'il y a déjà une session active
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  if (user && user.email) {
    await ensureUserSynced(user.id, user.email)
    return successResponse
  }

  errorUrl.searchParams.set("error", "confirmation_failed")
  return NextResponse.redirect(errorUrl)
}
