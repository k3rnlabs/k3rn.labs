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
        expect(supabaseMigration).toContain(
          'ENABLE ROW LEVEL SECURITY',
        )
        expect(supabaseMigration).toContain(
          'REVOKE ALL ON TABLE public."StudioIdentityEvaluation" FROM PUBLIC, anon, authenticated',
        )
        expect(supabaseMigration).toContain(
          'GRANT ALL ON TABLE public."StudioIdentityEvaluation" TO service_role',
        )
        expect(supabaseMigration).not.toMatch(
          /CREATE POLICY/i,
        )
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
  },
)
