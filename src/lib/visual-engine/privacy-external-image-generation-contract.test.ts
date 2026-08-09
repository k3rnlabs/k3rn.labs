import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"

const privacy =
  readFileSync(
    "src/lib/visual-engine/privacy.ts",
    "utf8",
  )

const route =
  readFileSync(
    "src/app/api/visual-engine/privacy/route.ts",
    "utf8",
  )

const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf8",
  )

describe(
  "MIRAVA external image generation consent contract",
  () => {
    it(
      "keeps external image generation separate and versioned",
      () => {
        expect(privacy).toContain(
          '"external_image_generation"',
        )

        expect(privacy).toContain(
          "MIRAVA_EXTERNAL_IMAGE_GENERATION_CONSENT_VERSION",
        )

        expect(privacy).toContain(
          "externalImageGenerationAccepted",
        )
      },
    )

    it(
      "requires explicit durable acceptance through the privacy API",
      () => {
        expect(route).toContain(
          '"accept_external_image_generation"',
        )

        expect(route).toContain(
          "acceptMiravaExternalImageGenerationConsent",
        )

        expect(route).toContain(
          "disclosureAccepted:",
        )
      },
    )

    it(
      "gates every Kie routing decision on per-user consent",
      () => {
        expect(core).toContain(
          "await hasMiravaExternalImageGenerationConsent(",
        )

        expect(
          (
            core.match(
              /hasMiravaExternalImageGenerationConsent/g,
            ) ?? []
          ).length,
        ).toBeGreaterThanOrEqual(3)

        expect(core).toContain(
          "const kieProviderEnabled =",
        )

        expect(core).toContain(
          "const retainReferenceForKieGeneration =",
        )
      },
    )

    it(
      "revokes provider authorization when identity processing is withdrawn",
      () => {
        expect(privacy).toContain(
          "current\n      .externalImageGenerationAccepted",
        )

        expect(privacy).toContain(
          'purpose:\n        "external_image_generation"',
        )

        expect(privacy).toContain(
          'decision:\n        "withdrawn"',
        )
      },
    )
  },
)
