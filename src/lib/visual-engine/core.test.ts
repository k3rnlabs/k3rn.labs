import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { buildMiravaGenerationPrompt, canAutoGenerateMiravaCreation, createStudioCreation, cropMiravaResult, isMiravaGenerationAlreadyDurable, isStudioImageMimeType, studioCreationPublic, studioErrorResponse, type StudioCreationRecord, validateStudioImage } from "./core"

describe("MIRAVA private creation engine", () => {
  it("allows only private Studio image formats", () => {
    expect(isStudioImageMimeType("image/jpeg")).toBe(true)
    expect(isStudioImageMimeType("image/png")).toBe(true)
    expect(isStudioImageMimeType("image/webp")).toBe(true)
    expect(isStudioImageMimeType("image/svg+xml")).toBe(false)
    expect(isStudioImageMimeType("application/pdf")).toBe(false)
  })

  it("never exposes provider implementation detail in unexpected errors", () => {
    expect(studioErrorResponse(new Error("provider payload containing private data"))).toEqual({
      message: "Une erreur Studio est survenue.",
      status: 500,
    })
  })

  it("never serializes artistic prompts or analysis text into a public creation", () => {
    const creation: StudioCreationRecord = {
      id: "creation-1",
      userId: "user-1",
      dossierId: "legacy-dossier-kept-server-side",
      status: "MASTER_PROMPT_READY",
      creativeDirectionSummary: "private creative direction",
      masterPrompt: "private master prompt",
      negativePrompt: "private negative prompt",
      failureCode: null,
      failureMessage: null,
      creditReservationKey: "private-reservation-key",
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z",
      completedAt: null,
      creativeOptions: { seriesSize: 3 },
    }

    expect(studioCreationPublic(creation)).toEqual({
      id: "creation-1",
      status: "IDENTITY_READY",
      failureMessage: null,
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z",
      completedAt: null,
      requestedResultCount: 3,
    })
  })

  it("uses identity photos only for identity and forces real variation between series frames", () => {
    const prompt = buildMiravaGenerationPrompt({
      masterPrompt: "A premium destination campaign in Dubai with coherent warm architectural styling and a believable social-editorial finish.",
      negativePrompt: "identity drift, repeated pose",
      creativeOptions: { seriesSize: 3, location: "Dubai", energy: "Spontanée" },
    }, 1)

    expect(prompt).toContain("biometric references only")
    expect(prompt).toContain("Do not copy the identity photos’ pose")
    expect(prompt).toContain("SERIES FRAME 2/3")
    expect(prompt).toContain("must not repeat another frame’s pose")
    expect(prompt).toContain("same adult identity, destination family")
  })

  it("requires the complete adult, image-rights and provider consent before creating a Studio record", async () => {
    await expect(createStudioCreation({
      userId: "user-1",
      ageConfirmed: true,
      rightsConfirmed: false,
      privacyAccepted: true,
      openaiDisclosureAccepted: true,
    })).rejects.toMatchObject({ code: "CONSENT_REQUIRED" })
  })

  it("rejects an image whose declared format does not match its bytes", async () => {
    const png = await sharp({ create: { width: 128, height: 128, channels: 4, background: "#111111" } }).png().toBuffer()
    await expect(validateStudioImage(png, "image/png")).resolves.toBeUndefined()
    await expect(validateStudioImage(png, "image/jpeg")).rejects.toMatchObject({ code: "INVALID_IMAGE" })
  })

  it("always crops a vertical generation to the delivery-safe 4:5 format", async () => {
    const original = await sharp({ create: { width: 1024, height: 1536, channels: 4, background: "#111111" } }).png().toBuffer()
    const cropped = await cropMiravaResult(original)
    await expect(sharp(cropped).metadata()).resolves.toMatchObject({ width: 1024, height: 1280, format: "png" })
  })

  it("only auto-continues a creation after its required identity views exist", () => {
    expect(canAutoGenerateMiravaCreation(2)).toBe(false)
    expect(canAutoGenerateMiravaCreation(3)).toBe(true)
    expect(canAutoGenerateMiravaCreation(6)).toBe(true)
    expect(canAutoGenerateMiravaCreation(7)).toBe(false)
  })

  it("makes a recovered first-session generation idempotent once it is durable", () => {
    expect(isMiravaGenerationAlreadyDurable("GENERATION_QUEUED")).toBe(true)
    expect(isMiravaGenerationAlreadyDurable("GENERATING")).toBe(true)
    expect(isMiravaGenerationAlreadyDurable("COMPLETED")).toBe(true)
    expect(isMiravaGenerationAlreadyDurable("MASTER_PROMPT_READY")).toBe(false)
    expect(isMiravaGenerationAlreadyDurable("FAILED")).toBe(false)
  })
})
