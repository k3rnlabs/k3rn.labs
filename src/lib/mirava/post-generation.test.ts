import { describe, expect, it } from "vitest"
import {
  buildPoseVariationChildDraft,
  buildRegenerationChildDraft,
  isMatchingPostGenerationReplay,
  postGenerationCreationId,
  postGenerationDebitKey,
  postGenerationReservationKey,
  type PostGenerationSource,
} from "@/lib/mirava/post-generation"

const source: PostGenerationSource = {
  id: "cmiravasource00000000000001",
  userId: "user-1",
  dossierId: null,
  studioProfileId: "studio-1",
  identityProfileId: "cmiravaidentity000000000001",
  presetId: "sport-glow",
  creativeOptions: {
    seriesSize: 4,
    location: "Clay tennis court",
    energy: "Confident",
  },
  creativeDirectionSummary: "Private summary",
  masterPrompt: "A sufficiently long private MIRAVA master prompt for a coherent premium tennis campaign.",
  negativePrompt: "identity drift",
  rootCreationId: null,
}

describe("MIRAVA post-generation planning", () => {
  it("derives a stable child id from the user and idempotency key", () => {
    const first = postGenerationCreationId("user-1", "regeneration_01HZZZZZZZZZZZZZZ")
    const replay = postGenerationCreationId("user-1", "regeneration_01HZZZZZZZZZZZZZZ")
    const otherUser = postGenerationCreationId("user-2", "regeneration_01HZZZZZZZZZZZZZZ")

    expect(first).toBe(replay)
    expect(first).not.toBe(otherUser)
    expect(first).toMatch(/^pg_[a-f0-9]{24}$/)
  })

  it("creates a one-result regeneration child with correct lineage", () => {
    const draft = buildRegenerationChildDraft(source, {
      sourceResultIndex: 2,
      idempotencyKey: "regeneration_01HZZZZZZZZZZZZZZ",
    })

    expect(draft).toMatchObject({
      generationIntent: "REGENERATE",
      parentCreationId: source.id,
      rootCreationId: source.id,
      sourceResultIndex: 2,
      identityProfileId: source.identityProfileId,
      variationRequest: null,
      status: "MASTER_PROMPT_READY",
    })
    expect(draft.creativeOptions).toMatchObject({
      seriesSize: 1,
      location: "Clay tennis court",
      energy: "Confident",
    })
  })

  it("inherits an existing root across multiple generations", () => {
    const draft = buildRegenerationChildDraft({
      ...source,
      rootCreationId: "cmiravaroot000000000000001",
    }, {
      sourceResultIndex: 0,
      idempotencyKey: "regeneration_01HZZZZZZZZZZZZZY",
    })

    expect(draft.rootCreationId).toBe("cmiravaroot000000000000001")
  })

  it("stores a pose-only request with an explicit continuity contract", () => {
    const draft = buildPoseVariationChildDraft(source, {
      sourceResultIndex: 0,
      presetId: "three-quarter-confident",
      poseDelta: {
        bodyOrientation: "Turn three quarters toward camera-right.",
        gazeDirection: "Look into the lens.",
        minorCropAdjustment: false,
      },
      idempotencyKey: "pose_variation_01HZZZZZZZZZZZZZ",
    })

    expect(draft.generationIntent).toBe("POSE_VARIATION")
    expect(draft.variationRequest).toMatchObject({
      version: "1.0.0",
      presetId: "three-quarter-confident",
      continuityContract: {
        sourceCreationId: source.id,
        identityProfileId: source.identityProfileId,
        locked: {
          identity: true,
          wardrobe: { coverage: true },
          scene: { location: true },
          lighting: { direction: true },
          photography: { aspectRatio: true },
        },
        variable: {
          bodyPose: true,
          gazeDirection: true,
          minorCropAdjustment: false,
        },
      },
    })
  })

  it("accepts an exact idempotent replay", () => {
    const draft = buildPoseVariationChildDraft(source, {
      sourceResultIndex: 0,
      userInstruction: "Shift the weight onto the back leg and turn the shoulders.",
      idempotencyKey: "pose_variation_01HZZZZZZZZZZZZY",
    })

    expect(isMatchingPostGenerationReplay({ ...draft }, draft)).toBe(true)
  })

  it("rejects reuse of an idempotency key for another source result", () => {
    const draft = buildRegenerationChildDraft(source, {
      sourceResultIndex: 0,
      idempotencyKey: "regeneration_01HZZZZZZZZZZZZZX",
    })

    expect(isMatchingPostGenerationReplay({
      ...draft,
      sourceResultIndex: 1,
    }, draft)).toBe(false)
  })

  it("uses deterministic reservation and debit keys per child", () => {
    expect(postGenerationReservationKey("pg_123"))
      .toBe("mirava-post-generation-reservation:pg_123")
    expect(postGenerationDebitKey("pg_123"))
      .toBe("mirava-post-generation-debit:pg_123")
  })
})
