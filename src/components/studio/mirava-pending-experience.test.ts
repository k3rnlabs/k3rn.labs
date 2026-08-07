import {
  readFileSync,
} from "node:fs"
import {
  describe,
  expect,
  it,
} from "vitest"

const studio =
  readFileSync(
    "src/components/studio/visual-engine-studio.tsx",
    "utf-8",
  )

const capture =
  readFileSync(
    "src/components/studio/mirava-identity-capture.tsx",
    "utf-8",
  )

describe(
  "MIRAVA pending creation experience",
  () => {
    it(
      "opens a continuation directly in a pending darkroom",
      () => {
        expect(studio).toContain(
          '"GENERATION_QUEUED"',
        )
        expect(studio).toContain(
          "const optimisticDetail:",
        )
        expect(studio).toContain(
          "await refreshCreation(",
        )
        expect(studio).toContain(
          "data.creation.id",
        )
      },
    )

    it(
      "keeps a pending creation inside the Portfolio image grid",
      () => {
        expect(studio).toContain(
          "function MiravaDarkroomThumbnail",
        )
        expect(studio).toContain(
          "data-mirava-darkroom-thumbnail",
        )
        expect(studio).toContain(
          "(creation.shotIndex ?? 0) + 1",
        )
        expect(studio).toContain(
          "<MiravaDarkroomThumbnail",
        )
        expect(studio).toContain(
          "activeCreations.length > 0 ||",
        )
      },
    )

    it(
      "hydrates the pending Portfolio tile with the final result",
      () => {
        expect(studio).toContain(
          "detail.resultUrl",
        )
        expect(studio).toContain(
          "detail.resultUrls",
        )
        expect(studio).toContain(
          "detail.completedResultCount",
        )
      },
    )

    it(
      "never leaves identity replacement with a silent disabled save action",
      () => {
        expect(capture).toContain(
          "Corriger les photos requises",
        )
        expect(capture).toContain(
          "firstInvalidRequiredIndex",
        )
        expect(capture).toContain(
          "data-mirava-identity-submit-status",
        )
        expect(capture).toContain(
          "data-mirava-identity-submit-error",
        )
        expect(capture).toContain(
          "!legalAccepted",
        )
        expect(capture).toContain(
          "disabled: submitting,",
        )
        expect(capture).not.toContain(
          "disabled: submitting || !legalAccepted || !requiredPhotosDone",
        )
      },
    )
  },
)
