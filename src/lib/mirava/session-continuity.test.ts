import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_MAX_CONTINUATION_INSTRUCTION_CHARS,
  buildMiravaSessionContinuationPrompt,
  miravaContinuationDirectiveSchema,
  miravaShotIntentSchema,
  readMiravaContinuationDirective,
} from "./session-continuity"

describe(
  "MIRAVA session continuity",
  () => {
    it("accepts the four bounded continuation intents", () => {
      expect(miravaShotIntentSchema.options).toEqual([
        "pose",
        "framing",
        "sub_location",
        "candid",
      ])
    })

    it("locks wardrobe, jewelry, environment and lighting", () => {
      const prompt = buildMiravaSessionContinuationPrompt({
        masterPrompt: "Approved premium editorial.",
        negativePrompt: "watermarks",
        intent: "pose",
        shotIndex: 1,
        hasContinuityImage: true,
      })
      expect(prompt.positivePrompt).toContain("exact same real photographic session")
      expect(prompt.positivePrompt).toContain("same wardrobe construction")
      expect(prompt.positivePrompt).toContain("same jewelry")
      expect(prompt.positivePrompt).toContain("same architectural environment")
      expect(prompt.positivePrompt).toContain("same time of day")
    })

    it("combines several variation axes in one continuation", () => {
      const prompt = buildMiravaSessionContinuationPrompt({
        masterPrompt: "Approved editorial.",
        intents: ["pose", "framing"],
        shotIndex: 2,
        hasContinuityImage: true,
      })
      expect(prompt.positivePrompt).toContain("AUTHORIZED VARIATION AXES — pose, framing.")
      expect(prompt.positivePrompt).toContain("POSE VARIATION")
      expect(prompt.positivePrompt).toContain("FRAMING VARIATION")
    })

    it("supports a bounded custom correction with or without a preset axis", () => {
      const prompt = buildMiravaSessionContinuationPrompt({
        masterPrompt: "Approved editorial.",
        customInstruction: "Keep the same scene, remove the handbag and make the smile slightly softer.",
        shotIndex: 2,
        hasContinuityImage: true,
      })
      expect(prompt.positivePrompt).toContain("CLIENT-DIRECTED CORRECTION")
      expect(prompt.positivePrompt).toContain("remove the handbag")
      expect(prompt.positivePrompt).toContain("Every unmentioned element remains locked")
      expect(prompt.positivePrompt).toContain("AUTHORIZED VARIATION AXES — none selected")
      expect(
        miravaContinuationDirectiveSchema.safeParse({
          intents: [],
          customInstruction: "x".repeat(MIRAVA_MAX_CONTINUATION_INSTRUCTION_CHARS + 1),
        }).success,
      ).toBe(false)
    })

    it("rejects an empty continuation request and duplicate axes", () => {
      expect(miravaContinuationDirectiveSchema.safeParse({ intents: [] }).success).toBe(false)
      expect(miravaContinuationDirectiveSchema.safeParse({ intents: ["pose", "pose"] }).success).toBe(false)
    })

    it("reads the durable composite directive and preserves legacy shotIntent continuations", () => {
      expect(
        readMiravaContinuationDirective(
          {
            continuation: {
              intents: ["framing", "candid"],
              customInstruction: "Move the crop closer.",
            },
          },
          "pose",
        ),
      ).toEqual({
        intents: ["framing", "candid"],
        customInstruction: "Move the crop closer.",
      })
      expect(readMiravaContinuationDirective({}, "pose")).toEqual({ intents: ["pose"] })
    })

    it("keeps lingerie-style continuations commercial and coverage-stable", () => {
      const prompt = buildMiravaSessionContinuationPrompt({
        masterPrompt: "Premium lingerie campaign.",
        intent: "candid",
        shotIndex: 2,
        hasContinuityImage: true,
      })
      expect(prompt.positivePrompt).toContain("Keep the exact approved garment coverage")
      expect(prompt.positivePrompt).toContain("Do not undress the subject")
      expect(prompt.positivePrompt).toContain("premium commercial fashion, beauty or lingerie campaign")
    })

    it("explicitly unlocks requested hair styling without unlocking identity", () => {
      const prompt =
        buildMiravaSessionContinuationPrompt({
          masterPrompt:
            "Approved lingerie campaign with tied hair.",
          customInstruction:
            "cheveux relâchés",
          shotIndex: 2,
          hasContinuityImage: true,
        })

      expect(
        prompt.positivePrompt,
      ).toContain(
        "HAIR DELTA",
      )

      expect(
        prompt.positivePrompt,
      ).toContain(
        'CLIENT DIRECTIVE: "cheveux relâchés"',
      )

      expect(
        prompt.positivePrompt,
      ).toContain(
        "previous hairstyle arrangement is NOT a continuity constraint",
      )

      expect(
        prompt.positivePrompt,
      ).not.toContain(
        "different hairstyle unless explicitly requested",
      )

      expect(
        prompt.positivePrompt,
      ).toContain(
        "natural hairline",
      )
    })

    it("supports a text-only safety fallback", () => {
      const prompt = buildMiravaSessionContinuationPrompt({
        masterPrompt: "Approved editorial.",
        intent: "framing",
        shotIndex: 3,
        hasContinuityImage: false,
      })
      expect(prompt.positivePrompt).toContain("TEXT-ONLY CONTINUITY FALLBACK")
      expect(prompt.positivePrompt).not.toContain("first attached image is the previous approved result")
    })
  },
)
