import {
  describe,
  expect,
  it,
} from "vitest"

import {
  type MiravaSessionBuilderClientSession,
} from "@/lib/mirava/session-builder/session-builder.client"

import {
  canReviewMiravaSessionBuilderSession,
  resolveMiravaSessionBuilderStep,
} from "./session-builder-flow"

const session = {
  id:
    "session-1",
  identityProfileId:
    "identity-1",
  config: {
    version: 1,
    mode:
      "CUSTOM_SHOOT",
    setPresetId:
      null,
    lightingPresetId:
      null,
    shotCount: 6,
    lookMode:
      "REFERENCE",
  },
  lookItemCount: 0,
  configurationReady:
    false,
  createdAt:
    "",
  updatedAt:
    "",
} as const

describe(
  "MIRAVA Session Builder flow",
  () => {
    it("resumes at Studio when no set is persisted", () => {
      expect(
        resolveMiravaSessionBuilderStep(
          session,
        ),
      ).toBe(
        "SET",
      )
    })

    it("resumes at Light when the set is persisted", () => {
      expect(
        resolveMiravaSessionBuilderStep(
          {
            ...session,
            config: {
              ...session.config,
              setPresetId:
                "white-cyclorama-v1",
            },
          },
        ),
      ).toBe(
        "LIGHTING",
      )
    })

    it("resumes at Look when Studio and Light are persisted", () => {
      expect(
        resolveMiravaSessionBuilderStep(
          {
            ...session,
            config: {
              ...session.config,
              setPresetId:
                "white-cyclorama-v1",
              lightingPresetId:
                "soft-v1",
            },
          },
        ),
      ).toBe(
        "LOOK",
      )
    })

    it("only opens Review for a server-ready complete session", () => {
      const configured:
        MiravaSessionBuilderClientSession = {
          ...session,
          config: {
            ...session.config,
            setPresetId:
              "white-cyclorama-v1",
            lightingPresetId:
              "soft-v1",
          },
        }

      expect(
        canReviewMiravaSessionBuilderSession(
          configured,
        ),
      ).toBe(false)

      expect(
        canReviewMiravaSessionBuilderSession(
          {
            ...configured,
            configurationReady:
              true,
          },
        ),
      ).toBe(true)
    })
  },
)
