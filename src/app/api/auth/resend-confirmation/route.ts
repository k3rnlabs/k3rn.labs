import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { translateAuthError } from "@/lib/auth-errors"
import { z } from "zod"

const resendSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const result = await validateBody(resendSchema, req)
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
    const redirectTo = `${appUrl}/auth/callback?next=/visual-engine/studio`

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: result.data.email,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      return apiError(translateAuthError(error.message), 400)
    }

    return apiSuccess({ message: "resend_success" })
  } catch (err: any) {
    console.error("[POST /api/auth/resend-confirmation] Exception imprévue :", err)
    return apiError(translateAuthError(err?.message ?? "Erreur lors du renvoi de l'email."), 500)
  }
}
