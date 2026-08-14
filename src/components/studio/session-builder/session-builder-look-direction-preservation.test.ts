import {
  describe,
  expect,
  it,
} from "vitest"

import {
  mergeMiravaSessionAfterLookMutation,
} from "./session-builder-flow"
import type {
  MiravaSessionBuilderClientSession,
} from "@/lib/mirava/session-builder/session-builder.client"

describe(
  "MIRAVA Builder direction through Look mutation",
  () => {
    it(
      "does not let a reduced Look response reset Direction V2 fields to defaults",
      () => {
        const current:
          MiravaSessionBuilderClientSession = {
            id:
              "session-1",
            identityProfileId:
              "identity-1",
            config: {
              version: 1,
              mode:
                "CUSTOM_SHOOT",
              setPresetId:
                "pro-fashion-studio-v1",
              lightingPresetId:
                "direct-flash-v1",
              shotCount: 6,
              lookMode:
                "CUSTOM",
              framing:
                "FULL_BODY",
              pose:
                "MOVEMENT",
              expression:
                "CONFIDENT",
              gaze:
                "CAMERA",
              makeup:
                "STRONG",
              skinFinish:
                "SMOOTH",
              hair:
                "LOOSE",
              userInstruction:
                "Ambiance minimaliste.",
            },
            lookItemCount: 0,
            lookItems: [],
            configurationReady:
              false,
            createdAt:
              "2026-08-09T20:00:00.000Z",
            updatedAt:
              "2026-08-09T20:00:00.000Z",
          }

        const reducedLookResponse = {
          id:
            "session-1",
          identityProfileId:
            "identity-1",
          config: {
            version: 1,
            mode:
              "CUSTOM_SHOOT",
            setPresetId:
              "pro-fashion-studio-v1",
            lightingPresetId:
              "direct-flash-v1",
            shotCount: 6,
            lookMode:
              "CUSTOM",
          },
          lookItemCount: 1,
          configurationReady:
            true,
          createdAt:
            "2026-08-09T20:00:00.000Z",
          updatedAt:
            "2026-08-09T20:01:00.000Z",
        }

        const merged =
          mergeMiravaSessionAfterLookMutation(
            current,
            reducedLookResponse,
          )

        expect(
          merged.config,
        ).toMatchObject({
          framing:
            "FULL_BODY",
          pose:
            "MOVEMENT",
          expression:
            "CONFIDENT",
          gaze:
            "CAMERA",
          makeup:
            "STRONG",
          skinFinish:
            "SMOOTH",
          hair:
            "LOOSE",
          userInstruction:
            "Ambiance minimaliste.",
        })

        expect(
          merged.lookItemCount,
        ).toBe(1)

        expect(
          merged.configurationReady,
        ).toBe(true)

        expect(
          merged.updatedAt,
        ).toBe(
          "2026-08-09T20:01:00.000Z",
        )
      },
    )
  },
)
