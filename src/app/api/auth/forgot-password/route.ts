import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { translateAuthError } from "@/lib/auth-errors"
import { z } from "zod"

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  const result = await validateBody(forgotPasswordSchema, req)
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://k3rnlabs.com"
  const redirectTo = `${appUrl}/auth/reset-password`

  const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
    redirectTo,
  })

  if (error) {
    return apiError(translateAuthError(error.message), 400)
  }

  return apiSuccess({
    message: "Si un compte existe avec cet email, un lien de réinitialisation vient de t'être envoyé.",
  })
}
