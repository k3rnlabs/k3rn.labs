import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { validateBody, apiError } from "@/lib/validate"
import { translateAuthError } from "@/lib/auth-errors"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  try {
    const result = await validateBody(loginSchema, req)
    if ("error" in result) return result.error

    let res = NextResponse.json({ success: true })

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
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    })

    if (error) {
      return apiError(translateAuthError(error.message), 401)
    }

    const payload = { success: true, data: { user: data.user, session: data.session } }
    const finalResponse = NextResponse.json(payload)
    res.cookies.getAll().forEach((c) => {
      finalResponse.cookies.set(c.name, c.value, c)
    })
    return finalResponse
  } catch (err: any) {
    console.error("[POST /api/auth/session] Exception imprévue :", err)
    return apiError(translateAuthError(err?.message ?? "Erreur serveur lors de la connexion."), 500)
  }
}

export async function DELETE() {
  let res = NextResponse.json({ success: true })

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
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  await supabase.auth.signOut()
  return res
}
