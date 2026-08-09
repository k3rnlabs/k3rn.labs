import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

describe(
  "MIRAVA landmark evidence migration",
  () => {
    it(
      "keeps Prisma and Supabase evidence columns in parity",
      () => {
        const prisma =
          readFileSync(
            "prisma/migrations/20260809131500_mirava_identity_landmark_evidence/migration.sql",
            "utf8",
          )
        const supabase =
          readFileSync(
            "supabase/migrations/20260809131500_mirava_identity_landmark_evidence.sql",
            "utf8",
          )

        for (const migration of [
          prisma,
          supabase,
        ]) {
          expect(migration).toContain(
            '"landmarkResidual" DOUBLE PRECISION',
          )
          expect(migration).toContain(
            '"landmarkThreshold" DOUBLE PRECISION',
          )
        }
      },
    )
  },
)
