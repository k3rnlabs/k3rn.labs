import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { db as prisma } from "./db"
import type { UserRole, Plan } from "@prisma/client"

export interface SessionUser {
  userId: string
  email: string
  role: UserRole
  plan: Plan
  onboardingCompleted: boolean
  missionBudget: number
}

/**
 * Vérifie la session Supabase depuis le contexte serveur (Route Handler, Server Component).
 *
 * Utilise `cookies()` de next/headers pour lire les tokens de session envoyés par le navigateur.
 * Le setAll tente d'écrire dans cookieStore (fonctionne dans les Route Handlers, silencieux
 * dans les Server Components). Le middleware est responsable de propager les tokens rafraîchis
 * via Set-Cookie sur chaque réponse — c'est le contrat SSR Supabase standard.
 */
export async function verifySession(): Promise<SessionUser | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) return null

    const cookieStore = await cookies()

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Dans un Route Handler, cookieStore.set() fonctionne et met à jour les cookies
          // sur la réponse interne Next.js. Dans un Server Component, ça lance une erreur
          // que l'on avale silencieusement — le middleware gère le refresh dans ce cas.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* server component — middleware prend le relais */ }
        },
      },
    })

    // getUser() vérifie le JWT auprès du serveur Supabase Auth (pas de cache local).
    // C'est la méthode recommandée pour les vérifications d'accès.
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    // Synchronisation idempotente et résiliente avec la base Prisma
    return await ensureUserSynced(user.id, user.email!)
  } catch (err) {
    console.error("[verifySession] Exception lors de la vérification de session :", err)
    return null
  }
}

/**
 * Garantit de manière idempotente et concurrente-safe qu'un utilisateur Supabase
 * est bien présent et synchronisé dans la base Prisma.
 */
export async function ensureUserSynced(userId: string, email: string): Promise<SessionUser | null> {
  try {
    let dbUser = await prisma.user.findUnique({ where: { id: userId } })
    if (!dbUser && email) {
      dbUser = await prisma.user.findUnique({ where: { email } })
    }

    if (!dbUser && email) {
      try {
        dbUser = await prisma.user.create({
          data: { id: userId, email, role: "OWNER" },
        })
      } catch {
        // En cas de création concurrente simultanée (P2002), on récupère l'utilisateur tout juste inséré
        dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { id: userId },
              { email },
            ],
          },
        })
      }
    }

    if (!dbUser) return null

    return {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      plan: dbUser.plan,
      onboardingCompleted: dbUser.onboardingCompleted,
      missionBudget: dbUser.missionBudget,
    }
  } catch (err) {
    console.error("[ensureUserSynced] Erreur de synchronisation utilisateur :", err)
    return null
  }
}

export function requireAuth(session: SessionUser | null): SessionUser {
  if (!session) throw new Error("UNAUTHORIZED")
  return session
}

export function requireRole(session: SessionUser, role: UserRole): SessionUser {
  const hierarchy: Record<UserRole, number> = { OWNER: 3, COLLABORATOR: 2, VIEWER: 1 }
  if (hierarchy[session.role] < hierarchy[role]) throw new Error("FORBIDDEN")
  return session
}
