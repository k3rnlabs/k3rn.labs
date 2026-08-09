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
    "utf8",
  )

const capture =
  readFileSync(
    "src/components/studio/mirava-identity-capture.tsx",
    "utf8",
  )

const uploader =
  readFileSync(
    "src/lib/mirava/identity-profile-upload.client.ts",
    "utf8",
  )

describe(
  "MIRAVA explicit OpenAI identity-analysis consent client",
  () => {
    it(
      "keeps the OpenAI disclosure explicit in capture",
      () => {
        expect(capture).toContain(
          "prestataires techniques utilisés par MIRAVA",
        )

        expect(capture).toContain(
          "proveedores técnicos utilizados por MIRAVA",
        )

        expect(capture).not.toContain(
          "traitement par OpenAI",
        )

        expect(capture).not.toContain(
          "tratamiento por OpenAI",
        )

        expect(capture).toContain(
          '!legalAccepted',
        )

        expect(capture).toContain(
          "openaiDisclosureAccepted: true",
        )
      },
    )

    it(
      "records durable OpenAI evidence before the explicit capture upload",
      () => {
        const uploadStart =
          studio.indexOf(
            "const uploadIdentityFiles = async",
          )

        const uploadEnd =
          studio.indexOf(
            "const saveManagedIdentityView =",
            uploadStart,
          )

        const flow =
          studio.slice(
            uploadStart,
            uploadEnd,
          )

        const explicitConsentIndex =
          flow.indexOf(
            "consent\n          ?.openaiDisclosureAccepted",
          )

        const evidenceIndex =
          flow.indexOf(
            '"accept_openai_identity_analysis"',
          )

        const profileUploadIndex =
          flow.indexOf(
            "await uploadMiravaIdentityProfile({",
          )

        expect(uploadStart).toBeGreaterThan(
          -1,
        )

        expect(uploadEnd).toBeGreaterThan(
          uploadStart,
        )

        expect(explicitConsentIndex).toBeGreaterThan(
          -1,
        )

        expect(evidenceIndex).toBeGreaterThan(
          explicitConsentIndex,
        )

        expect(profileUploadIndex).toBeGreaterThan(
          evidenceIndex,
        )

        expect(flow).toContain(
          "disclosureAccepted:",
        )

        expect(flow).toContain(
          "openaiIdentityAnalysisAccepted",
        )
      },
    )

    it(
      "does not let the generic uploader manufacture OpenAI consent evidence",
      () => {
        expect(uploader).not.toContain(
          '"accept_openai_identity_analysis"',
        )
      },
    )

    it(
      "does not create new OpenAI consent evidence inside manage mode",
      () => {
        const manageStart =
          studio.indexOf(
            "const saveManagedIdentityView =",
          )

        const manageEnd =
          studio.indexOf(
            "\n  const ",
            manageStart + 20,
          )

        const manage =
          studio.slice(
            manageStart,
            manageEnd > manageStart
              ? manageEnd
              : undefined,
          )

        expect(manageStart).toBeGreaterThan(
          -1,
        )

        expect(manage).not.toContain(
          '"accept_openai_identity_analysis"',
        )
      },
    )
  },
)
