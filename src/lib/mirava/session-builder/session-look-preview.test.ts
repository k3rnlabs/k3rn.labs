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
      from:
        vi.fn(),
      createSignedUrl:
        vi.fn(),
    }),
  )

vi.mock(
  "@/lib/supabase-admin",
  () => ({
    supabaseAdmin: {
      storage: {
        from:
          mocks.from,
      },
    },
  }),
)

import {
  MIRAVA_SESSION_LOOK_PREVIEW_TTL_SECONDS,
  createMiravaSessionLookPreviewUrl,
} from "./session-look-preview"

describe(
  "MIRAVA Session Builder signed look previews",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks()

        mocks.from
          .mockReturnValue({
            createSignedUrl:
              mocks.createSignedUrl,
          })
      },
    )

    it(
      "uses a short-lived signed URL from the private visual-engine bucket",
      async () => {
        mocks.createSignedUrl
          .mockResolvedValue({
            data: {
              signedUrl:
                "https://storage.example.test/object/sign/look.webp?token=test",
            },
            error: null,
          })

        await expect(
          createMiravaSessionLookPreviewUrl(
            "user/session/look/item/front.webp",
          ),
        ).resolves.toBe(
          "https://storage.example.test/object/sign/look.webp?token=test",
        )

        expect(
          MIRAVA_SESSION_LOOK_PREVIEW_TTL_SECONDS,
        ).toBe(600)

        expect(
          mocks.from,
        ).toHaveBeenCalledWith(
          "visual-engine-private",
        )

        expect(
          mocks.createSignedUrl,
        ).toHaveBeenCalledWith(
          "user/session/look/item/front.webp",
          600,
        )
      },
    )

    it(
      "does not attempt storage access without a private storage path",
      async () => {
        await expect(
          createMiravaSessionLookPreviewUrl(
            null,
          ),
        ).resolves.toBeNull()

        await expect(
          createMiravaSessionLookPreviewUrl(
            "",
          ),
        ).resolves.toBeNull()

        expect(
          mocks.from,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "fails closed when private storage cannot sign the asset",
      async () => {
        mocks.createSignedUrl
          .mockResolvedValue({
            data: null,
            error:
              new Error(
                "storage unavailable",
              ),
          })

        await expect(
          createMiravaSessionLookPreviewUrl(
            "user/session/look/item/front.webp",
          ),
        ).resolves.toBeNull()
      },
    )

    it(
      "rejects malformed or non-http signed URLs",
      async () => {
        for (
          const signedUrl of [
            "javascript:alert(1)",
            "data:image/png;base64,test",
            "not-a-url",
          ]
        ) {
          mocks.createSignedUrl
            .mockResolvedValue({
              data: {
                signedUrl,
              },
              error: null,
            })

          await expect(
            createMiravaSessionLookPreviewUrl(
              "user/session/look/item/front.webp",
            ),
          ).resolves.toBeNull()
        }
      },
    )
  },
)
