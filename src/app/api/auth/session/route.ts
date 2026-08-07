import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { validateBody, apiError } from "@/lib/validate"
import { translateAuthError } from "@/lib/auth-errors"
import { z } from "zod"

import { ensureUserSynced } from "@/lib/auth"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  locale: z
    .enum(["fr", "es"])
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    const result = await validateBody(loginSchema, req)
    if ("error" in result) return result.error

    const cookieStore = await cookies()

    // La réponse finale est créée d'abord. Le setAll y écrit directement.
    const res = NextResponse.json({ success: true })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // Écriture sur les deux cibles : next/headers (pour Server Components éventuels)
            // ET directement sur la réponse JSON (ce qui compte vraiment pour le navigateur).
            cookiesToSet.forEach(({ name, value, options }) => {
              try { cookieStore.set(name, value, options) } catch { /* server component context */ }
              res.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    })

    if (error) {
      return apiError(
        translateAuthError(
          error.message,
          result.data.locale ??
            "fr",
        ),
        401,
      )
    }

    if (!data.session || !data.user) {
      return apiError(
        translateAuthError(
          "Échec de la connexion. Session non créée.",
          result.data.locale ??
            "fr",
        ),
        401,
      )
    }

    // Synchronisation immédiate et atomique avec Prisma avant de renvoyer la réponse au navigateur
    await ensureUserSynced(data.user.id, data.user.email!)

    return res
  } catch (err: any) {
    console.error("[POST /api/auth/session] Exception imprévue :", err)
    return apiError(translateAuthError(err?.message ?? "Erreur serveur lors de la connexion."), 500)
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  const res = NextResponse.json({ success: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options) } catch { /* server component context */ }
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  await supabase.auth.signOut()
  return res
}
