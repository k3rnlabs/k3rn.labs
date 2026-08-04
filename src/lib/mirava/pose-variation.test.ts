import { describe, expect, it } from "vitest"
import {
  poseDeltaSchema,
  poseVariationRequestSchema,
  regenerationRequestSchema,
  resolveRootCreationId,
} from "@/lib/mirava/pose-variation"

describe("Mirava pose variation contracts", () => {
  it("accepts a structured pose delta", () => {
    const result = poseDeltaSchema.safeParse({
      bodyOrientation: "Turn the torso thirty degrees toward camera-right.",
      gazeDirection: "Look directly into the lens.",
    })

    expect(result.success).toBe(true)
  })

  it("rejects an empty pose delta", () => {
    expect(poseDeltaSchema.safeParse({}).success).toBe(false)
  })

  it("accepts a preset-based pose variation request", () => {
    const result = poseVariationRequestSchema.safeParse({
      sourceResultIndex: 0,
      presetId: "three-quarter-confident",
      idempotencyKey: "pose_variation_01HZZZZZZZZZZZZZ",
    })

    expect(result.success).toBe(true)
  })

  it("rejects a pose variation without an instruction", () => {
    const result = poseVariationRequestSchema.safeParse({
      sourceResultIndex: 0,
      idempotencyKey: "pose_variation_01HZZZZZZZZZZZZZ",
    })

    expect(result.success).toBe(false)
  })

  it("accepts regeneration independently from pose variation", () => {
    const result = regenerationRequestSchema.safeParse({
      sourceResultIndex: 1,
      idempotencyKey: "regeneration_01HZZZZZZZZZZZZZZ",
    })

    expect(result.success).toBe(true)
  })

  it("resolves an existing root creation", () => {
    expect(resolveRootCreationId({
      id: "current",
      rootCreationId: "root",
    })).toBe("root")
  })

  it("uses the source as root for a first child", () => {
    expect(resolveRootCreationId({
      id: "source",
      rootCreationId: null,
    })).toBe("source")
  })
})
