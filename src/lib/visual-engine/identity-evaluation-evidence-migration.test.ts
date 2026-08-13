import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const prismaMigration =
  readFileSync(
    "prisma/migrations/20260809123000_mirava_identity_evaluation_evidence/migration.sql",
    "utf8",
  )
const supabaseMigration =
  readFileSync(
    "supabase/migrations/20260809123000_mirava_identity_evaluation_evidence.sql",
    "utf8",
  )
const prismaSecurityHardening =
  readFileSync(
    "prisma/migrations/20260809133000_mirava_identity_evaluation_security_hardening/migration.sql",
    "utf8",
  )
const supabaseSecurityHardening =
  readFileSync(
    "supabase/migrations/20260809133000_mirava_identity_evaluation_security_hardening.sql",
    "utf8",
  )
const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf8",
  )

describe(
  "MIRAVA private identity evaluation evidence",
  () => {
    it(
      "cascades evidence with creation, profile and user deletion",
      () => {
        expect(prismaMigration.match(
          /ON DELETE CASCADE/g,
        )).toHaveLength(3)
        expect(supabaseMigration.match(
          /ON DELETE CASCADE/g,
        )).toHaveLength(3)
      },
    )

    it(
      "is private to service_role with RLS enabled",
      () => {
        for (const migration of [
          prismaSecurityHardening,
          supabaseSecurityHardening,
        ]) {
          expect(migration).toContain(
            'ENABLE ROW LEVEL SECURITY',
          )
          expect(migration).toMatch(
            /REVOKE ALL ON TABLE public\."StudioIdentityEvaluation"\s+FROM PUBLIC, anon, authenticated/,
          )
          expect(migration).toMatch(
            /GRANT ALL ON TABLE public\."StudioIdentityEvaluation"\s+TO service_role/,
          )
          expect(migration).not.toMatch(
            /CREATE POLICY/i,
          )
        }
      },
    )

    it(
      "constrains stages and gate decisions to the versioned contract",
      () => {
        for (const migration of [
          prismaMigration,
          supabaseMigration,
        ]) {
          expect(migration).toContain(
            "CHECK (\"stage\" IN ('pass-a', 'pass-b'))",
          )
          expect(migration).toContain(
            "CHECK (\"decision\" IN ('PASS', 'FAIL', 'UNSCORABLE'))",
          )
        }
      },
    )

    it(
      "persists replayable decisions without embeddings or image payloads",
      () => {
        expect(core).toContain(
          '"StudioIdentityEvaluation"',
        )
        expect(core).toContain(
          "identityManifestVersion:",
        )
        expect(core).toContain(
          "perReferenceSimilarity:",
        )
        expect(
          prismaMigration,
        ).not.toMatch(
          /embedding|imageBuffer|storagePath/i,
        )
      },
    )

    it(
      "keeps candidate face geometry out of operational logs",
      () => {
        expect(core).not.toContain(
          "candidateFaceBox:",
        )
        expect(core).toContain(
          "candidateFaceCount:",
        )
      },
    )
  },
)
