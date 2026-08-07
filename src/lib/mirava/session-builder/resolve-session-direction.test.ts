import {
  describe,
  expect,
  it,
} from "vitest"

import {
  MiravaSessionDirectionError,
  resolveMiravaSessionDirection,
} from "./resolve-session-direction"

const readyConfig = {
  version: 1,
  mode: "CUSTOM_SHOOT",
  setPresetId:
    "grey-cyclorama-v1",
  lightingPresetId:
    "direct-flash-v1",
  shotCount: 6,
  lookMode: "REFERENCE",
} as const

describe("MIRAVA session direction resolver", () => {
  it("resolves a deterministic visual authority contract", () => {
    const resolved =
      resolveMiravaSessionDirection(
        readyConfig,
      )

    expect(resolved).toMatchObject({
      builderVersion: 1,
      mode: "CUSTOM_SHOOT",
      shotCount: 6,
      lookMode: "REFERENCE",
      authority: {
        identity:
          "IDENTITY_PROFILE",
        environment:
          "SESSION_SET",
        lighting:
          "SESSION_LIGHTING",
        wardrobe:
          "ARTISTIC_REFERENCE",
        pose: "SHOT_PLAN",
        composition:
          "SHOT_PLAN",
        framing: "SHOT_PLAN",
        photographicCharacter:
          "ARTISTIC_REFERENCE",
      },
      set: {
        presetId:
          "grey-cyclorama-v1",
        version: 1,
      },
      lighting: {
        presetId:
          "direct-flash-v1",
        version: 1,
      },
    })

    expect(
      resolved.set.constraints,
    ).toContain(
      "no outdoor environment",
    )

    expect(
      resolved.lighting.constraints,
    ).toContain(
      "no soft window-light appearance",
    )
  })

  it("gives custom wardrobe authority only to the session look", () => {
    const resolved =
      resolveMiravaSessionDirection({
        ...readyConfig,
        lookMode: "CUSTOM",
      })

    expect(
      resolved.authority.wardrobe,
    ).toBe("SESSION_LOOK")
  })

  it("rejects an incomplete draft before resolving presets", () => {
    expect(() =>
      resolveMiravaSessionDirection({
        ...readyConfig,
        setPresetId: null,
      }),
    ).toThrowError(
      MiravaSessionDirectionError,
    )

    try {
      resolveMiravaSessionDirection({
        ...readyConfig,
        setPresetId: null,
      })
    } catch (error) {
      expect(error).toMatchObject({
        code:
          "INVALID_SESSION_CONFIG",
      })
    }
  })

  it("does not mutate preset-owned constraint arrays", () => {
    const first =
      resolveMiravaSessionDirection(
        readyConfig,
      )
    const second =
      resolveMiravaSessionDirection(
        readyConfig,
      )

    expect(first).toEqual(second)
    expect(first).not.toBe(second)
    expect(first.set.constraints).not.toBe(
      second.set.constraints,
    )
    expect(
      first.lighting.constraints,
    ).not.toBe(
      second.lighting.constraints,
    )
  })
})
