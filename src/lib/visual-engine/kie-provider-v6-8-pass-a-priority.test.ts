import {
  describe,
  expect,
  it,
} from "vitest"

import {
  buildMiravaKieReferencePrompt,
  fitMiravaKiePromptForModel,
} from "./kie-provider"

describe(
  "MIRAVA V6.8 Pass A structural priority",
  () => {
    it(
      "preserves detailed pose and camera before secondary direction under the Seedream cap",
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

        const pose = [
          "POSE —",
          "standing on one supporting leg;",
          "opposite leg rises almost vertically;",
          "raised ankle held by the corresponding hand;",
          "torso forms a strong diagonal;",
          "free hand remains anchored to the stair rail;",
          "hips, shoulders and spine keep the reference relationship;",
          "do not replace this with a bent-knee standing pose;",
          "do not lower the raised leg;",
          "do not release the ankle;",
          "POSE_END_SENTINEL",
        ].join(" ")

        const camera = [
          "CAMERA AND COMPOSITION —",
          "vertical full-body frame;",
          "camera below torso level;",
          "strong upward perspective;",
          "wide-angle architectural convergence;",
          "subject fills the staircase height;",
          "preserve exact wall/rail/stair relationships;",
          "CAMERA_END_SENTINEL",
        ].join(" ")

        const wrapped =
          buildMiravaKieReferencePrompt({
            roles: [
              "ART_DIRECTION",
              "IDENTITY",
              "IDENTITY",
              "IDENTITY",
            ],
            bodyIdentity,
            prompt: [
              "TRANSFER_MODE = CAMPAIGN_SAFE_TRANSFER",
              `COMMERCIAL INTENT — ${"premium fashion campaign ".repeat(35)}`,
              `IDENTITY — ${"identity wording ".repeat(40)}`,
              `SAFE REFERENCE DIRECTION — ${"stair architecture reference ".repeat(45)}`,
              `WARDROBE — ${"black mesh bodysuit construction ".repeat(35)}`,
              pose,
              `HEAD AND EXPRESSION — ${"reference head geometry ".repeat(25)}`,
              `HAIR DIRECTION — ${"reference hair styling ".repeat(20)}`,
              camera,
              `LIGHTING — ${"direct flash wall shadow ".repeat(35)}`,
              `COLOR AND FINISH — ${"sharp digital editorial ".repeat(30)}`,
              `OUTPUT — ${"realistic premium fashion photograph ".repeat(25)}`,
            ].join("\n\n"),
          })

        expect(
          wrapped.length,
        ).toBeGreaterThan(
          3000,
        )

        const fitted =
          fitMiravaKiePromptForModel(
            "seedream/4.5-edit",
            wrapped,
          )

        console.info(
          `[mirava-v6-8-pass-a-budget] raw=${wrapped.length} fitted=${fitted.length}`,
        )

        expect(
          fitted.length,
        ).toBeLessThanOrEqual(
          3000,
        )

        expect(fitted).toContain(
          "PASS A: first preserve ART_DIRECTION camera",
        )

        expect(fitted).not.toContain(
          "First preserve FACE_ID facial identity",
        )

        expect(fitted).toContain(
          "POSE_END_SENTINEL",
        )

        expect(fitted).toContain(
          "CAMERA_END_SENTINEL",
        )

        expect(fitted).toContain(
          "- hip width: balanced",
        )

        expect(fitted).toContain(
          "BODY_ID below is the sole authority",
        )

        expect(fitted).toContain(
          "ART DIRECTION ONLY",
        )

        expect(fitted).toContain(
          "FACE IDENTITY AUTHORITY",
        )
      },
    )
  },
)
