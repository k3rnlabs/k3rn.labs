import {
  describe,
  expect,
  it,
} from "vitest"

import {
  buildMiravaKieIdentityRestorationPrompt,
  fitMiravaKiePromptForModel,
} from "./kie-provider"

describe(
  "MIRAVA V6.8 Pass B eye identity",
  () => {
    it(
      "preserves full eye micro-geometry and scene freeze under the Seedream cap",
      () => {
        const bodyIdentity = [
          "INTRINSIC BODY IDENTITY — Sole authority for intrinsic body morphology.",
          "- neck length: balanced",
          "- shoulder width: balanced",
          "- shoulder slope: balanced",
          "- collarbone definition: moderate",
          "- torso length: balanced",
          "- upper-torso frame: balanced",
          "- natural bust volume: moderate",
          "- waist definition: defined",
          "- hip width: balanced",
          "These observations describe the person's body, not her styling. Never infer or preserve clothing, jewellery, makeup, pose, camera or scene. ART DIRECTION controls wardrobe and pose; do not invent unlisted morphology.",
        ].join("\n")

        const raw =
          buildMiravaKieIdentityRestorationPrompt({
            identityCount: 3,
            bodyIdentity,
          })

        expect(
          raw.length,
        ).toBeLessThanOrEqual(
          3000,
        )

        const fitted =
          fitMiravaKiePromptForModel(
            "seedream/4.5-edit",
            raw,
          )

        console.info(
          `[mirava-v6-8-pass-b-eyes] raw=${raw.length} fitted=${fitted.length}`,
        )

        expect(
          fitted.length,
        ).toBeLessThanOrEqual(
          3000,
        )

        expect(
          fitted,
        ).not.toContain(
          "…",
        )

        expect(fitted).toContain(
          "FACIAL GEOMETRY LOCK",
        )

        expect(fitted).toContain(
          "Do not narrow, lengthen, widen or redesign the face.",
        )

        expect(fitted).toContain(
          "EYE GEOMETRY LOCK",
        )

        expect(fitted).toContain(
          "upper/lower lid contours",
        )

        expect(fitted).toContain(
          "inner/outer canthi and tilt",
        )

        expect(fitted).toContain(
          "iris color/diameter relative to sclera",
        )

        expect(fitted).toContain(
          "Never round/enlarge eyes",
        )

        expect(fitted).toContain(
          "pupil size must remain plausible for its lighting",
        )

        expect(fitted).toContain(
          "liner/lashes/shadow must not redefine eye anatomy.",
        )

        expect(fitted).toContain(
          "Preserve the exact expression state already present in Image 1.",
        )

        expect(fitted).toContain(
          "- hip width: balanced",
        )

        expect(fitted).toContain(
          "Never infer body proportions from FACE_ID portrait references.",
        )

        expect(fitted).toContain(
          "ABSOLUTE SCENE FREEZE",
        )

        expect(fitted).toContain(
          "OUTPUT —",
        )
      },
    )
  },
)
