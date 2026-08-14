import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks =
  vi.hoisted(
    () => ({
      uploadToSignedUrl:
        vi.fn(),
      createClient:
        vi.fn(),
    }),
  )

vi.mock(
  "@supabase/supabase-js",
  () => ({
    createClient:
      mocks.createClient,
  }),
)

import {
  uploadMiravaSessionLookAssets,
} from "./session-look-upload.client"

describe(
  "MIRAVA add look asset client",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks()

        process.env
          .NEXT_PUBLIC_SUPABASE_URL =
          "https://example.supabase.co"

        process.env
          .NEXT_PUBLIC_SUPABASE_ANON_KEY =
          "anon-key"

        mocks.uploadToSignedUrl
          .mockResolvedValue({
            error:
              null,
          })

        mocks.createClient
          .mockReturnValue({
            storage: {
              from:
                () => ({
                  uploadToSignedUrl:
                    mocks.uploadToSignedUrl,
                }),
            },
          })
      },
    )

    afterEach(
      () => {
        vi.unstubAllGlobals()
      },
    )

    it(
      "stages, uploads and finalizes a new view on the existing item",
      async () => {
        const file =
          new File(
            [
              "image",
            ],
            "side.webp",
            {
              type:
                "image/webp",
            },
          )

        const fetchMock =
          vi.fn()
            .mockResolvedValueOnce({
              ok:
                true,
              json:
                async () => ({
                  batchId:
                    "123e4567-e89b-42d3-a456-426614174000",
                  bucket:
                    "private",
                  uploads: [
                    {
                      path:
                        "user/session-look-staging/session/batch/side.webp",
                      token:
                        "signed-token",
                    },
                  ],
                }),
            })
            .mockResolvedValueOnce({
              ok:
                true,
              json:
                async () => ({
                  added:
                    1,
                  session: {
                    id:
                      "session-1",
                    lookItems:
                      [],
                  },
                }),
            })

        vi.stubGlobal(
          "fetch",
          fetchMock,
        )

        const result =
          await uploadMiravaSessionLookAssets({
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            locale:
              "fr",
            files: [
              {
                file,
                viewKey:
                  "SIDE",
              },
            ],
          })

        expect(
          result.id,
        ).toBe(
          "session-1",
        )

        expect(
          mocks.uploadToSignedUrl,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          fetchMock,
        ).toHaveBeenNthCalledWith(
          2,
          "/api/visual-engine/sessions/session-1/look/look-1/assets",
          expect.objectContaining({
            method:
              "POST",
            cache:
              "no-store",
          }),
        )

        const finalizeCall =
          fetchMock.mock.calls[
            1
          ][
            1
          ] as {
            body?: string
          }

        expect(
          JSON.parse(
            finalizeCall.body ??
            "{}",
          ),
        ).toMatchObject({
          uploads: [
            {
              mimeType:
                "image/webp",
              viewKey:
                "SIDE",
            },
          ],
        })
      },
    )

    it(
      "rejects an invalid item before creating an upload session",
      async () => {
        const fetchMock =
          vi.fn()

        vi.stubGlobal(
          "fetch",
          fetchMock,
        )

        await expect(
          uploadMiravaSessionLookAssets({
            sessionId:
              "session-1",
            lookItemId:
              "",
            locale:
              "fr",
            files: [],
          }),
        ).rejects.toThrow(
          "MIRAVA_LOOK_INVALID_ITEM",
        )

        expect(
          fetchMock,
        ).not.toHaveBeenCalled()
      },
    )
  },
)
