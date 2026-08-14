import {
  describe,
  expect,
  it,
} from "vitest"

import {
  type MiravaSessionBuilderClientSession,
} from "@/lib/mirava/session-builder/session-builder.client"

import {
  MIRAVA_SESSION_BUILDER_STEPS,
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
    framing: "FREE",
    pose: "FREE",
    expression: "FREE",
    gaze: "FREE",
    makeup: "NATURAL",
    skinFinish: "NATURAL",
    hair: "PROFILE",
    userInstruction: "",
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

    it("resumes at Direction when Studio and Light are persisted", () => {
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
        "DIRECTION",
      )
    })

    it("keeps Direction as one compact step before wardrobe", () => {
      expect(
        MIRAVA_SESSION_BUILDER_STEPS,
      ).toEqual([
        "SET",
        "LIGHTING",
        "DIRECTION",
        "LOOK",
        "REVIEW",
      ])
    })

    it("resumes an explicitly persisted Look step", () => {
      expect(
        resolveMiravaSessionBuilderStep(
          {
            ...session,
            resumeStep:
              "LOOK",
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

    it("resumes Review only when the session is still launch-ready", () => {
      const configured:
        MiravaSessionBuilderClientSession = {
        ...session,
        resumeStep:
          "REVIEW",
        config: {
          ...session.config,
          setPresetId:
            "white-cyclorama-v1",
          lightingPresetId:
            "soft-v1",
        },
      }

      expect(
        resolveMiravaSessionBuilderStep(
          {
            ...configured,
            configurationReady:
              true,
          },
        ),
      ).toBe(
        "REVIEW",
      )

      expect(
        resolveMiravaSessionBuilderStep(
          configured,
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
