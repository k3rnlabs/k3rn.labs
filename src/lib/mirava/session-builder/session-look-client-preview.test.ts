import {
  describe,
  expect,
  it,
} from "vitest"

import {
  parseMiravaSessionBuilderClientSession,
} from "./session-builder.client"

const baseSession = {
  id:
    "session-preview",
  identityProfileId:
    "identity-1",
  config: {
    version:
      1,
    mode:
      "CUSTOM_SHOOT",
    setPresetId:
      "white-cyclorama-v1",
    lightingPresetId:
      "clean-v1",
    shotCount:
      6,
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
      "NATURAL",
    skinFinish:
      "NATURAL",
    hair:
      "PROFILE",
    userInstruction:
      "",
  },
  resumeStep:
    "LOOK",
  lookItemCount:
    1,
  configurationReady:
    true,
  createdAt:
    "2026-08-11T00:00:00.000Z",
  updatedAt:
    "2026-08-11T00:00:00.000Z",
}

describe(
  "MIRAVA Session Builder client look preview boundary",
  () => {
    it(
      "accepts the signed URL and preserves no private path",
      () => {
        const parsed =
          parseMiravaSessionBuilderClientSession({
            ...baseSession,
            lookItems: [
              {
                id:
                  "look-1",
                category:
                  "DRESS",
                label:
                  null,
                brand:
                  null,
                description:
                  null,
                position:
                  0,
                assets: [
                  {
                    mimeType:
                      "image/webp",
                    bytes:
                      1234,
                    viewKey:
                      "FRONT",
                    url:
                      "https://storage.example.test/object/sign/look.webp?token=test",
                  },
                ],
              },
            ],
          })

        expect(
          parsed.lookItems?.[0]
            ?.assets[0]?.url,
        ).toBe(
          "https://storage.example.test/object/sign/look.webp?token=test",
        )

        expect(
          JSON.stringify(
            parsed,
          ),
        ).not.toContain(
          "storagePath",
        )
      },
    )

    it(
      "rejects any public asset response containing storagePath",
      () => {
        expect(
          () =>
            parseMiravaSessionBuilderClientSession({
              ...baseSession,
              lookItems: [
                {
                  id:
                    "look-1",
                  category:
                    "DRESS",
                  label:
                    null,
                  brand:
                    null,
                  description:
                    null,
                  position:
                    0,
                  assets: [
                    {
                      storagePath:
                        "private/path.webp",
                      mimeType:
                        "image/webp",
                      bytes:
                        1234,
                      viewKey:
                        "FRONT",
                      url:
                        "https://storage.example.test/object/sign/look.webp?token=test",
                    },
                  ],
                },
              ],
            }),
        ).toThrow(
          "MIRAVA_SESSION_CLIENT_INVALID_RESPONSE",
        )
      },
    )
  },
)
