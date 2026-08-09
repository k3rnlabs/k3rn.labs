import {
  describe,
  expect,
  it,
} from "vitest"

import {
  readFileSync,
} from "node:fs"

const capture =
  readFileSync(
    "src/components/studio/mirava-identity-capture.tsx",
    "utf8",
  )

const studio =
  readFileSync(
    "src/components/studio/visual-engine-studio.tsx",
    "utf8",
  )

describe(
  "MIRAVA external image generation consent client",
  () => {
    it(
      "keeps external image generation separate and optional",
      () => {
        expect(capture).toContain(
          "externalGenerationAccepted",
        )

        expect(capture).toContain(
          "externalImageGenerationDisclosureAccepted",
        )

        expect(capture).toContain(
          "Optionnel — J’autorise MIRAVA à transmettre",
        )

        expect(capture).toContain(
          "Opcional — Autorizo a MIRAVA a transmitir",
        )

        expect(capture).toContain(
          "prestataires techniques externes de génération d’images",
        )

        expect(capture).toContain(
          "proveedores técnicos externos de generación de imágenes",
        )

        expect(capture).toContain(
          "Je peux retirer cette autorisation à tout moment.",
        )

        expect(capture).not.toContain(
          "Kie (Seedream)",
        )
      },
    )

    it(
      "does not derive external provider consent from the OpenAI checkbox",
      () => {
        expect(capture).toContain(
          "externalImageGenerationDisclosureAccepted:",
        )

        expect(capture).toContain(
          "externalGenerationAccepted",
        )

        expect(capture).not.toContain(
          "externalImageGenerationDisclosureAccepted: true",
        )
      },
    )

    it(
      "records explicit external consent before identity upload can trigger onboarding generation",
      () => {
        const flowStart =
          studio.indexOf(
            "const uploadIdentityFiles = async",
          )

        const flowEnd =
          studio.indexOf(
            "const saveManagedIdentityView =",
            flowStart,
          )

        const flow =
          studio.slice(
            flowStart,
            flowEnd,
          )

        const consentIndex =
          flow.indexOf(
            '"accept_external_image_generation"',
          )

        const uploadIndex =
          flow.indexOf(
            "await uploadMiravaIdentityProfile({",
          )

        expect(
          flowStart,
        ).toBeGreaterThan(
          -1,
        )

        expect(
          consentIndex,
        ).toBeGreaterThan(
          -1,
        )

        expect(
          uploadIndex,
        ).toBeGreaterThan(
          consentIndex,
        )
      },
    )

    it(
      "hydrates both capture mounts from durable external consent",
      () => {
        const matches =
          studio.match(
            /initialExternalGenerationConsentAccepted=\{\s*privacyStatus\s*\?\.\s*externalImageGenerationAccepted\s*===\s*true\s*\}/g,
          ) ?? []

        expect(
          matches,
        ).toHaveLength(
          2,
        )
      },
    )
  },
)
