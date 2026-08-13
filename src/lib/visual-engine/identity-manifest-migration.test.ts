import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"

const migration =
  readFileSync(
    "supabase/migrations/20260809114500_mirava_identity_manifest.sql",
    "utf8",
  )

describe(
  "MIRAVA identity manifest storage boundary",
  () => {
    it(
      "is immutable by version and cascades profile deletion",
      () => {
        expect(migration).toContain(
          'UNIQUE ("identityProfileId", "versionHash")',
        )
        expect(migration).toContain(
          "ON DELETE CASCADE",
        )
      },
    )

    it(
      "is server-only and has no permissive browser policy",
      () => {
        expect(migration).toContain(
          "ENABLE ROW LEVEL SECURITY",
        )
        expect(migration).toMatch(
          /REVOKE ALL[\s\S]*FROM PUBLIC, anon, authenticated/,
        )
        expect(migration).toContain(
          "TO service_role",
        )
        expect(migration).not.toMatch(
          /CREATE POLICY|USING\s*\(\s*true\s*\)/i,
        )
      },
    )
  },
)
