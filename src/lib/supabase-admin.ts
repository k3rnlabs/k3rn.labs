import { createClient } from "@supabase/supabase-js"

let _supabaseAdmin: any = null

export const supabaseAdmin = new Proxy({} as any, {
  get(_, prop) {
    if (!_supabaseAdmin) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!url || !key) {
        throw new Error(
          `Supabase Admin Client accessed but NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. ` +
          `This usually happens during build time if the module is imported but the client is not actually used.`
        )
      }

      _supabaseAdmin = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    }
    return _supabaseAdmin[prop]
  },
})
