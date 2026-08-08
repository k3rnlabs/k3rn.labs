import {
  readFileSync,
} from "node:fs"
import path from "node:path"
import {
  describe,
  expect,
  it,
} from "vitest"

describe(
  "MIRAVA onboarding launch idempotency",
  () => {
    const migration = readFileSync(
      path.resolve(
        process.cwd(),
        "prisma/migrations/20260808110000_mirava_onboarding_entitlement_idempotency/migration.sql",
      ),
      "utf8",
    )

    const core = readFileSync(
      path.resolve(
        process.cwd(),
        "src/lib/visual-engine/core.ts",
      ),
      "utf8",
    )

    const studio = readFileSync(
      path.resolve(
        process.cwd(),
        "src/components/studio/visual-engine-studio.tsx",
      ),
      "utf8",
    )

    it(
      "creates or resumes one durable onboarding creation in the database",
      () => {
        expect(migration).toContain(
          "create_mirava_onboarding_creation",
        )
        expect(migration).toContain(
          'ON CONFLICT ("onboardingKey") DO NOTHING',
        )
        expect(migration).toContain(
          '"StudioSession_onboardingKey_key"',
        )
        expect(core).toContain(
          '"create_mirava_onboarding_creation"',
        )
        expect(studio).toContain(
          "onboarding: true",
        )
      },
    )

    it(
      "allows only one worker job of each kind per creation",
      () => {
        expect(migration).toContain(
          '"StudioJob_creationId_kind_key"',
        )
        expect(core).toContain(
          'onConflict:\n              "creationId,kind"',
        )
        expect(core).toContain(
          "ignoreDuplicates:\n              true",
        )
      },
    )
  },
)
