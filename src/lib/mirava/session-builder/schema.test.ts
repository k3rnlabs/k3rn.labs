import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MIRAVA_SESSION_SHOT_COUNT,
  createDefaultMiravaSessionBuilderDraft,
  isMiravaSessionBuilderReady,
  miravaSessionBuilderDraftSchema,
  miravaSessionBuilderReadySchema,
} from "./schema"

describe("MIRAVA Session Builder contract", () => {
  it("starts as a safe incomplete draft", () => {
    const draft =
      createDefaultMiravaSessionBuilderDraft()

    expect(draft).toEqual({
      version: 1,
      mode: "CUSTOM_SHOOT",
      setPresetId: null,
      lightingPresetId: null,
      shotCount: 6,
      lookMode: "REFERENCE",
    })

    expect(
      miravaSessionBuilderDraftSchema.safeParse(
        draft,
      ).success,
    ).toBe(true)

    expect(
      isMiravaSessionBuilderReady(draft),
    ).toBe(false)
  })

  it("becomes ready only with known set and lighting authorities", () => {
    const ready = {
      version: 1,
      mode: "CUSTOM_SHOOT",
      setPresetId: "grey-cyclorama-v1",
      lightingPresetId:
        "direct-flash-v1",
      shotCount:
        MIRAVA_SESSION_SHOT_COUNT,
      lookMode: "REFERENCE",
    } as const

    expect(
      isMiravaSessionBuilderReady(ready),
    ).toBe(true)

    expect(
      miravaSessionBuilderReadySchema.safeParse(
        ready,
      ).success,
    ).toBe(true)
  })

  it("rejects unknown or unversioned visual authorities", () => {
    expect(
      isMiravaSessionBuilderReady({
        version: 1,
        mode: "CUSTOM_SHOOT",
        setPresetId: "grey-cyclorama",
        lightingPresetId:
          "direct-flash-v1",
        shotCount: 6,
        lookMode: "REFERENCE",
      }),
    ).toBe(false)

    expect(
      isMiravaSessionBuilderReady({
        version: 1,
        mode: "CUSTOM_SHOOT",
        setPresetId:
          "grey-cyclorama-v1",
        lightingPresetId:
          "cinematic-v1",
        shotCount: 6,
        lookMode: "REFERENCE",
      }),
    ).toBe(false)
  })

  it("locks the V1 session to six shots", () => {
    expect(
      isMiravaSessionBuilderReady({
        version: 1,
        mode: "CUSTOM_SHOOT",
        setPresetId:
          "grey-cyclorama-v1",
        lightingPresetId:
          "clean-v1",
        shotCount: 8,
        lookMode: "REFERENCE",
      }),
    ).toBe(false)
  })

  it("rejects undeclared builder fields", () => {
    expect(
      miravaSessionBuilderReadySchema.safeParse({
        version: 1,
        mode: "CUSTOM_SHOOT",
        setPresetId:
          "grey-cyclorama-v1",
        lightingPresetId:
          "clean-v1",
        shotCount: 6,
        lookMode: "REFERENCE",
        studioPresetId:
          "legacy-ambiguous-name",
      }).success,
    ).toBe(false)
  })
})
