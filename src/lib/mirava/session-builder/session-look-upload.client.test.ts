import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks =
  vi.hoisted(() => ({
    createClient:
      vi.fn(),
    from:
      vi.fn(),
    uploadToSignedUrl:
      vi.fn(),
    fetch:
      vi.fn(),
  }))

vi.mock(
  "@supabase/supabase-js",
  () => ({
    createClient:
      mocks.createClient,
  }),
)

import {
  uploadMiravaSessionLookItem,
} from "./session-look-upload.client"

const batchId =
  "11111111-1111-4111-8111-111111111111"

const stagedPath =
  `user-1/session-look-staging/session-1/${batchId}/front.jpg`

function jsonResponse(
  body: unknown,
  status = 200,
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
      },
    },
  )
}

function fakeFile({
  type =
    "image/jpeg",
  size =
    2048,
}: {
  type?: string
  size?: number
} = {}): File {
  return {
    type,
    size,
  } as File
}

const input = {
  category:
    "TOP" as const,
  label:
    "White shirt",
  files: [
    {
      file:
        fakeFile(),
      viewKey:
        "FRONT" as const,
    },
  ],
}

describe(
  "MIRAVA session Look upload client",
  () => {
    beforeEach(() => {
      vi.clearAllMocks()

      process.env
        .NEXT_PUBLIC_SUPABASE_URL =
        "https://supabase.test"

      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY =
        "anon-key"

      vi.stubGlobal(
        "fetch",
        mocks.fetch,
      )

      mocks.createClient
        .mockReturnValue({
          storage: {
            from:
              mocks.from,
          },
        })

      mocks.from
        .mockReturnValue({
          uploadToSignedUrl:
            mocks.uploadToSignedUrl,
        })

      mocks.uploadToSignedUrl
        .mockResolvedValue({
          data: {},
          error: null,
        })
    })

    it("uploads through the signed private bucket then finalizes the look item", async () => {
      mocks.fetch
        .mockResolvedValueOnce(
          jsonResponse({
            batchId,
            bucket:
              "studio-private",
            uploads: [
              {
                path:
                  stagedPath,
                token:
                  "signed-token",
                mimeType:
                  "image/jpeg",
                bytes:
                  2048,
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(
            {
              lookItem: {
                id:
                  "look-item-1",
                category:
                  "TOP",
                label:
                  "White shirt",
                brand: null,
                description:
                  null,
                position: 0,
                assets: [
                  {
                    mimeType:
                      "image/jpeg",
                    bytes:
                      2048,
                    viewKey:
                      "FRONT",
                  },
                ],
              },
              session: {
                id:
                  "session-1",
                identityProfileId:
                  "identity-1",
                lookItemCount: 1,
                configurationReady:
                  true,
                config: {
                  version: 1,
                  mode:
                    "CUSTOM_SHOOT",
                  setPresetId:
                    "white-cyclorama-v1",
                  lightingPresetId:
                    "soft-v1",
                  shotCount: 6,
                  lookMode:
                    "CUSTOM",
                },
                createdAt:
                  "2026-08-08T00:00:00.000Z",
                updatedAt:
                  "2026-08-08T00:20:00.000Z",
              },
            },
            201,
          ),
        )

      const result =
        await uploadMiravaSessionLookItem({
          sessionId:
            "session-1",
          item:
            input,
          locale:
            "fr",
        })

      expect(
        mocks.fetch,
      ).toHaveBeenNthCalledWith(
        1,
        "/api/visual-engine/sessions/session-1/look/upload-session",
        expect.objectContaining({
          method:
            "POST",
        }),
      )

      expect(
        mocks.from,
      ).toHaveBeenCalledWith(
        "studio-private",
      )

      expect(
        mocks.uploadToSignedUrl,
      ).toHaveBeenCalledWith(
        stagedPath,
        "signed-token",
        input.files[0].file,
        {
          contentType:
            "image/jpeg",
          cacheControl:
            "0",
        },
      )

      const finalizeCall =
        mocks.fetch
          .mock.calls[1]

      expect(
        finalizeCall[0],
      ).toBe(
        "/api/visual-engine/sessions/session-1/look",
      )

      const finalizeOptions =
        finalizeCall[1] as
          RequestInit

      expect(
        JSON.parse(
          finalizeOptions
            .body as string,
        ),
      ).toEqual({
        batchId,
        item: {
          category:
            "TOP",
          label:
            "White shirt",
          uploads: [
            {
              path:
                stagedPath,
              mimeType:
                "image/jpeg",
              bytes:
                2048,
              viewKey:
                "FRONT",
            },
          ],
        },
      })

      expect(
        result.session
          .configurationReady,
      ).toBe(true)

      expect(
        result.lookItem.id,
      ).toBe(
        "look-item-1",
      )
    })

    it("aborts the signed batch when direct storage upload fails", async () => {
      mocks.fetch
        .mockResolvedValueOnce(
          jsonResponse({
            batchId,
            bucket:
              "studio-private",
            uploads: [
              {
                path:
                  stagedPath,
                token:
                  "signed-token",
                mimeType:
                  "image/jpeg",
                bytes:
                  2048,
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            aborted: true,
          }),
        )

      mocks.uploadToSignedUrl
        .mockResolvedValue({
          data: null,
          error:
            new Error(
              "network",
            ),
        })

      await expect(
        uploadMiravaSessionLookItem({
          sessionId:
            "session-1",
          item:
            input,
          locale:
            "fr",
        }),
      ).rejects.toThrow(
        "L’envoi privé du look a échoué",
      )

      expect(
        mocks.fetch,
      ).toHaveBeenNthCalledWith(
        2,
        "/api/visual-engine/sessions/session-1/look/upload-session",
        expect.objectContaining({
          method:
            "DELETE",
        }),
      )

      const abortOptions =
        mocks.fetch
          .mock.calls[1][1] as
          RequestInit

      expect(
        JSON.parse(
          abortOptions
            .body as string,
        ),
      ).toEqual({
        batchId,
        paths: [
          stagedPath,
        ],
      })
    })

    it("rejects more than six images before creating an upload session", async () => {
      await expect(
        uploadMiravaSessionLookItem({
          sessionId:
            "session-1",
          locale:
            "fr",
          item: {
            category:
              "TOP",
            files:
              Array.from(
                {
                  length: 7,
                },
                () => ({
                  file:
                    fakeFile(),
                }),
              ),
          },
        }),
      ).rejects.toThrow(
        "MIRAVA_LOOK_INVALID_FILE_COUNT",
      )

      expect(
        mocks.fetch,
      ).not.toHaveBeenCalled()
    })

    it("aborts staging and preserves a human API error when finalization is rejected", async () => {
      mocks.fetch
        .mockResolvedValueOnce(
          jsonResponse({
            batchId,
            bucket:
              "studio-private",
            uploads: [
              {
                path:
                  stagedPath,
                token:
                  "signed-token",
                mimeType:
                  "image/jpeg",
                bytes:
                  2048,
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(
            {
              error:
                "Cette séance n’utilise pas de look personnalisé.",
            },
            409,
          ),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            aborted: true,
          }),
        )

      await expect(
        uploadMiravaSessionLookItem({
          sessionId:
            "session-1",
          item:
            input,
          locale:
            "fr",
        }),
      ).rejects.toThrow(
        "Cette séance n’utilise pas de look personnalisé.",
      )

      expect(
        mocks.fetch,
      ).toHaveBeenCalledTimes(3)

      expect(
        mocks.fetch
          .mock.calls[2][0],
      ).toBe(
        "/api/visual-engine/sessions/session-1/look/upload-session",
      )
    })
  },
)
