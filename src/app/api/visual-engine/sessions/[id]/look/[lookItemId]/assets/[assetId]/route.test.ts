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
      verify:
        vi.fn(),
      launch:
        vi.fn(),
      rate:
        vi.fn(),
      replaceAsset:
        vi.fn(),
      deleteAsset:
        vi.fn(),
      getDraft:
        vi.fn(),
    }),
  )

vi.mock(
  "@/lib/auth",
  () => ({
    verifySession:
      mocks.verify,
  }),
)

vi.mock(
  "@/lib/mirava/server-config",
  () => ({
    isMiravaPublicLaunchEnabled:
      mocks.launch,
  }),
)

vi.mock(
  "@/lib/rate-limit",
  () => ({
    checkRateLimit:
      mocks.rate,
  }),
)

vi.mock(
  "@/lib/mirava/session-builder/look-store",
  () => {
    class MockLookStoreError
      extends Error {
      code: string

      constructor(
        code: string,
      ) {
        super(code)
        this.name =
          "MiravaSessionLookStoreError"
        this.code =
          code
      }
    }

    return {
      MiravaSessionLookStoreError:
        MockLookStoreError,
      replaceMiravaSessionLookAsset:
        mocks.replaceAsset,
      deleteMiravaSessionLookAsset:
        mocks.deleteAsset,
    }
  },
)

vi.mock(
  "@/lib/mirava/session-builder/session-store",
  () => ({
    getMiravaSessionBuilderDraft:
      mocks.getDraft,
  }),
)

import {
  MiravaSessionLookStoreError,
} from "@/lib/mirava/session-builder/look-store"

import {
  DELETE,
  PATCH,
} from "./route"

describe(
  "MIRAVA persisted look asset route",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks()

        mocks.verify
          .mockResolvedValue({
            userId:
              "user-1",
          })

        mocks.launch
          .mockReturnValue(
            true,
          )

        mocks.rate
          .mockResolvedValue({
            success:
              true,
          })

        mocks.replaceAsset
          .mockResolvedValue(
            undefined,
          )

        mocks.deleteAsset
          .mockResolvedValue(
            undefined,
          )

        mocks.getDraft
          .mockResolvedValue({
            id:
              "session-1",
            lookItems:
              [],
          })
      },
    )

    it(
      "replaces the exact asset and returns the refreshed session",
      async () => {
        const request =
          new Request(
            "http://localhost/test",
            {
              method:
                "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  batchId:
                    "batch-1",
                  upload: {
                    path:
                      "staged.webp",
                    mimeType:
                      "image/webp",
                    bytes:
                      1234,
                    viewKey:
                      "BACK",
                  },
                }),
            },
          )

        const response =
          await PATCH(
            request as never,
            {
              params: {
                id:
                  "session-1",
                lookItemId:
                  "look-1",
                assetId:
                  "asset-1",
              },
            },
          )

        expect(
          response.status,
        ).toBe(
          200,
        )

        expect(
          mocks.replaceAsset,
        ).toHaveBeenCalledWith({
          userId:
            "user-1",
          sessionId:
            "session-1",
          lookItemId:
            "look-1",
          assetId:
            "asset-1",
          batchId:
            "batch-1",
          input: {
            path:
              "staged.webp",
            mimeType:
              "image/webp",
            bytes:
              1234,
            viewKey:
              "BACK",
          },
        })
      },
    )

    it(
      "maps concurrent replacement to conflict",
      async () => {
        mocks.replaceAsset
          .mockRejectedValue(
            new MiravaSessionLookStoreError(
              "ASSET_CONFLICT",
              "conflict",
            ),
          )

        const response =
          await PATCH(
            new Request(
              "http://localhost/test",
              {
                method:
                  "PATCH",
                body:
                  JSON.stringify({
                    batchId:
                      "batch-1",
                    upload:
                      {},
                  }),
              },
            ) as never,
            {
              params: {
                id:
                  "session-1",
                lookItemId:
                  "look-1",
                assetId:
                  "asset-1",
              },
            },
          )

        expect(
          response.status,
        ).toBe(
          409,
        )
      },
    )

    it(
      "keeps the existing delete action available",
      async () => {
        const response =
          await DELETE(
            new Request(
              "http://localhost/test",
              {
                method:
                  "DELETE",
              },
            ) as never,
            {
              params: {
                id:
                  "session-1",
                lookItemId:
                  "look-1",
                assetId:
                  "asset-1",
              },
            },
          )

        expect(
          response.status,
        ).toBe(
          200,
        )

        expect(
          mocks.deleteAsset,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )
  },
)
