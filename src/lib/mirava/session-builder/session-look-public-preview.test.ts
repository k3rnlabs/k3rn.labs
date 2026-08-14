import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks =
  vi.hoisted(
    () => ({
      findSession:
        vi.fn(),
      createPreview:
        vi.fn(),
    }),
  )

vi.mock(
  "@/lib/db",
  () => ({
    db: {
      studioSession: {
        findUnique:
          mocks.findSession,
      },
    },
  }),
)

vi.mock(
  "./session-look-preview",
  () => ({
    createMiravaSessionLookPreviewUrl:
      mocks.createPreview,
  }),
)

import {
  getMiravaSessionBuilderDraft,
} from "./session-store"

describe(
  "MIRAVA Session Builder public look preview DTO",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks()
      },
    )

    it(
      "signs private look assets without exposing storagePath",
      async () => {
        mocks.createPreview
          .mockResolvedValue(
            "https://storage.example.test/object/sign/look.webp?token=test",
          )

        mocks.findSession
          .mockResolvedValue({
            id:
              "session-preview",
            userId:
              "user-1",
            identityProfileId:
              "identity-1",
            builderVersion:
              1,
            setPresetId:
              "white-cyclorama-v1",
            lightingPresetId:
              "clean-v1",
            builderConfig: {
              mode:
                "CUSTOM_SHOOT",
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
              resumeStep:
                "LOOK",
            },
            lookItems: [
              {
                id:
                  "look-1",
                category:
                  "DRESS",
                label:
                  "Black dress",
                brand:
                  null,
                description:
                  null,
                position:
                  0,
                assets: [
                  {
                    id:
                      "asset-1",
                    storagePath:
                      "user-1/session-look/session-preview/look-1/front.webp",
                    mimeType:
                      "image/webp",
                    bytes:
                      1234,
                    viewKey:
                      "FRONT",
                  },
                ],
              },
            ],
            createdAt:
              "2026-08-11T00:00:00.000Z",
            updatedAt:
              "2026-08-11T00:00:00.000Z",
          })

        const result =
          await getMiravaSessionBuilderDraft(
            "user-1",
            "session-preview",
          )

        expect(
          result?.lookItems[0]
            ?.assets[0],
        ).toEqual({
          id:
            "asset-1",
          mimeType:
            "image/webp",
          bytes:
            1234,
          viewKey:
            "FRONT",
          url:
            "https://storage.example.test/object/sign/look.webp?token=test",
        })

        expect(
          mocks.createPreview,
        ).toHaveBeenCalledWith(
          "user-1/session-look/session-preview/look-1/front.webp",
        )

        expect(
          JSON.stringify(
            result,
          ),
        ).not.toContain(
          "storagePath",
        )
      },
    )
  },
)
