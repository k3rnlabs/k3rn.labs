import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import {
  listMiravaSessionBuilderClientSessions,
} from "./session-builder.client"

const durableSession = {
  id: "session-resume",
  identityProfileId:
    "identity-1",
  config: {
    version: 1,
    mode:
      "CUSTOM_SHOOT",
    setPresetId:
      "white-cyclorama-v1",
    lightingPresetId:
      "soft-v1",
    shotCount: 10,
    lookMode:
      "CUSTOM",
    framing: "FREE",
    pose: "FREE",
    expression: "FREE",
    gaze: "FREE",
    makeup: "NATURAL",
    skinFinish: "NATURAL",
    hair: "PROFILE",
    userInstruction: "",
  },
  lookItemCount: 2,
  lookItems: [
    {
      id:
        "look-item-1",
      category:
        "TOP",
      label:
        "White shirt",
      brand:
        null,
      description:
        "Cotton shirt",
      position:
        0,
      assets: [
        {
          id:
            "look-asset-1",
          mimeType:
            "image/jpeg",
          bytes:
            1234,
          viewKey:
            "FRONT",
          url:
            "https://storage.example.test/object/sign/look-item-1-front.jpg?token=test",
        },
      ],
    },
    {
      id:
        "look-item-2",
      category:
        "BOTTOM",
      label:
        "Black trousers",
      brand:
        null,
      description:
        null,
      position:
        1,
      assets: [
        {
          id:
            "look-asset-2",
          mimeType:
            "image/png",
          bytes:
            2345,
          viewKey:
            "FRONT",
          url:
            "https://storage.example.test/object/sign/look-item-2-front.png?token=test",
        },
      ],
    },
  ],
  configurationReady:
    true,
  createdAt:
    "2026-08-09T06:00:00.000Z",
  updatedAt:
    "2026-08-09T07:00:00.000Z",
} as const

afterEach(() => {
  vi.restoreAllMocks()
})

describe(
  "MIRAVA Session Builder resume client",
  () => {
    it(
      "loads durable builder sessions",
      async () => {
        const fetchMock =
          vi.spyOn(
            globalThis,
            "fetch",
          ).mockResolvedValue(
            new Response(
              JSON.stringify({
                sessions: [
                  durableSession,
                ],
              }),
              {
                status: 200,
                headers: {
                  "Content-Type":
                    "application/json",
                },
              },
            ),
          )

        const sessions =
          await listMiravaSessionBuilderClientSessions()

        expect(
          sessions,
        ).toEqual([
          durableSession,
        ])

        expect(
          sessions[0]
            .config
            .shotCount,
        ).toBe(
          10,
        )

        expect(
          fetchMock,
        ).toHaveBeenCalledWith(
          "/api/visual-engine/sessions",
          {
            method:
              "GET",
          },
        )
      },
    )
  },
)
