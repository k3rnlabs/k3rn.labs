import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest } from "next/server"
import { validateBody, apiError, apiSuccess } from "@/lib/validate"
import { prisma } from "@/lib/prisma"
import { translateAuthError } from "@/lib/auth-errors"
import { z } from "zod"

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(req: NextRequest) {
  try {
    const result = await validateBody(signupSchema, req)
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

    const { data, error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
    })

    if (error) {
      return apiError(translateAuthError(error.message), 400)
    }
    if (!data.user) return apiError("Échec de l'inscription. Aucun utilisateur créé.", 500)

    // Synchronisation idempotente de l'utilisateur dans la base Prisma
    try {
      const referralCode = cookieStore.get("referral_code")?.value ?? null

      let referredById: string | null = null
      if (referralCode) {
        const ambassador = await prisma.user.findUnique({
          where: { referralCode },
          select: { id: true },
        })
        referredById = ambassador?.id ?? null
      }

      await prisma.user.upsert({
        where: { id: data.user.id },
        update: {},
        create: {
          id: data.user.id,
          email: result.data.email,
          role: "OWNER",
          referredById,
        },
      })

      if (referredById) {
        await prisma.referralLog.create({
          data: {
            userId: data.user.id,
            ambassadorId: referredById,
            type: "SIGNUP",
            missions: 0,
            metadata: { referralCode },
          },
        })
      }
    } catch (dbErr) {
      console.error("[POST /api/auth/signup] Erreur lors de la synchronisation Prisma :", dbErr)
    }

    return apiSuccess({ user: data.user, session: data.session, autoConfirmed: !!data.session }, 201)
  } catch (err: any) {
    console.error("[POST /api/auth/signup] Exception imprévue :", err)
    return apiError(translateAuthError(err?.message ?? "Erreur serveur lors de l'inscription."), 500)
  }
}
