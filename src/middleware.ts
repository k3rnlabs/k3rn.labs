import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { hasValidInternalWebhookSecret } from "@/lib/internal-webhook"

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // ─── Court-circuit ABSOLU ───────────────────────────────────────────────────
  // Ces routes n'ont JAMAIS besoin d'une session K3RN Labs.
  // On retourne NextResponse.next() AVANT tout appel réseau Supabase
  // pour éviter le MIDDLEWARE_INVOCATION_TIMEOUT ET les redirections parasites.
  //
  // /auth/callback → liens de confirmation d'email (token_hash ou code PKCE)
  // /visual-engine/studio/* → app MIRAVA Studio, auth gérée par son propre système
  if (
    path === "/visual-engine" ||
    path.startsWith("/visual-engine/studio") ||
    path === "/auth/callback" ||
    path.startsWith("/auth/callback") ||
    path === "/visual-engine/manifest.webmanifest" ||
    path === "/visual-engine/sw.js" ||
    path === "/visual-engine/apple-icon" ||
    path === "/visual-engine/offline"
  ) {
    return NextResponse.next()
  }

  // ─── Configuration Supabase ─────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 })
    }
    return NextResponse.next()
  }

  // ─── Client Supabase + refresh de session ──────────────────────────────────
  // Le pattern recommandé par Supabase SSR : supabaseResponse est créé UNE seule fois,
  // et setAll écrit dessus directement — ce qui propage les tokens rafraîchis au navigateur.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser() fait une requête au serveur Supabase Auth — plus fiable que getSession()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    return NextResponse.next()
  }

  // ─── Classification des routes ─────────────────────────────────────────────
  const isApiRoute = path.startsWith("/api/")
  const isAuthRoute = path.startsWith("/api/auth/")
  const isWebhook = path.startsWith("/api/webhooks/") || path === "/api/billing/webhook"
  const isPublicCampaign = path.startsWith("/api/public/")
  const isPublicInvestment = request.method === "POST" && /^\/api\/crowdfunding\/[^/]+\/invest$/.test(path)
  const isInternalWebhook =
    (request.method === "POST" && /^\/api\/dossiers\/[^/]+\/ingest$/.test(path)) ||
    (request.method === "POST" && path === "/api/documents") ||
    (request.method === "POST" && path === "/api/user/telegram/link") ||
    (request.method === "POST" && /^\/api\/kael\/missions\/[^/]+\/(complete|fail|update)$/.test(path))
  const isOgRoute = path.startsWith("/api/og/")
  const isPublicInvest = path.startsWith("/invest/")
  // /auth/callback et /auth/callback/* sont exclus du isAuthPage pour éviter toute interférence
  const isAuthPage = path.startsWith("/auth/") && !path.startsWith("/auth/callback")

  // ─── Invite / referral ─────────────────────────────────────────────────────
  const inviteMatch = path.match(/^\/invite\/([^/]+)$/)
  if (inviteMatch) {
    const code = inviteMatch[1]
    const redirectUrl = new URL(`/?ref=${code}`, request.url)
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set("referral_code", code, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    })
    return response
  }

  // ─── Routes publiques sans auth ────────────────────────────────────────────
  if (isWebhook || isPublicCampaign || isPublicInvestment || isOgRoute) return supabaseResponse
  if (isInternalWebhook && hasValidInternalWebhookSecret(request)) return supabaseResponse

  // ─── API routes protégées ──────────────────────────────────────────────────
  if (isApiRoute && !isAuthRoute && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ─── Pages protégées ───────────────────────────────────────────────────────
  const isLandingPage = path === "/"
  const isInvitePage = path.startsWith("/invite/")
  if (!isApiRoute && !isAuthPage && !isPublicInvest && !isLandingPage && !isInvitePage && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // ─── Redirection si déjà connecté sur les pages d'auth ────────────────────
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/home", request.url))
  }

  // IMPORTANT : toujours retourner supabaseResponse (pas NextResponse.next())
  // pour que les tokens rafraîchis soient propagés au navigateur via Set-Cookie.
  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)).*)" ],
}
