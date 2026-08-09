import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const prisma =
  readFileSync(
    "prisma/migrations/20260809091000_mirava_session_shoot_return_fix/migration.sql",
    "utf8",
  )

const supabase =
  readFileSync(
    "supabase/migrations/20260809091000_mirava_session_shoot_return_fix.sql",
    "utf8",
  )

describe(
  "MIRAVA Session shoot RPC SQL",
  () => {
    for (
      const [
        label,
        sql,
      ] of [
        ["prisma", prisma],
        ["supabase", supabase],
      ] as const
    ) {
      it(
        `${label} qualifies the returned shotIndex column`,
        () => {
          expect(sql).toContain(
            'creation."shotIndex"',
          )

          expect(sql).toContain(
            'FROM "StudioCreation" AS creation',
          )

          expect(sql).not.toContain(
            'RETURN QUERY SELECT "id", "shotIndex" FROM "StudioCreation"',
          )
        },
      )

      it(
        `${label} keeps the six-shot transaction and credit contract`,
        () => {
          expect(sql).toContain(
            "jsonb_array_length(p_shots) <> 6",
          )

          expect(sql).toContain(
            "public.reserve_mirava_credit(",
          )

          expect(sql).toContain(
            "public.debit_mirava_credit_reservation(",
          )

          expect(sql).toContain(
            "'GENERATE'",
          )
        },
      )
    }

    it(
      "keeps Prisma and Supabase corrective migrations identical",
      () => {
        expect(prisma).toBe(
          supabase,
        )
      },
    )
  },
)
