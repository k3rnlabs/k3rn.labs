import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { translateAuthError } from "@/lib/auth-errors"
import { z } from "zod"

const resetPasswordSchema = z.object({
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  const result = await validateBody(resetPasswordSchema, req)
  if ("error" in result) return result.error

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
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

  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  })

  if (error) {
    return apiError(translateAuthError(error.message), 400)
  }

  return apiSuccess({ message: "Mot de passe réinitialisé avec succès !" })
}
