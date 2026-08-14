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
      findCreation:
        vi.fn(),
      findItem:
        vi.fn(),
      deleteAsset:
        vi.fn(),
      updateSession:
        vi.fn(),
      removeStorage:
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
        update:
          mocks.updateSession,
      },
      studioCreation: {
        findFirst:
          mocks.findCreation,
      },
      studioSessionLookItem: {
        findUnique:
          mocks.findItem,
      },
      studioSessionLookAsset: {
        delete:
          mocks.deleteAsset,
      },
    },
  }),
)

vi.mock(
  "@/lib/supabase-admin",
  () => ({
    supabaseAdmin: {
      storage: {
        from:
          () => ({
            remove:
              mocks.removeStorage,
          }),
      },
    },
  }),
)

vi.mock(
  "@/lib/visual-engine/core",
  () => ({
    MAX_STUDIO_IMAGE_BYTES:
      10_000,
    STUDIO_BUCKET:
      "studio-private",
  }),
)

import {
  deleteMiravaSessionLookAsset,
} from "./look-store"

describe(
  "MIRAVA persisted look asset deletion",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks()

        mocks.findSession
          .mockResolvedValue({
            id:
              "session-1",
            builderConfig: {
              lookMode:
                "CUSTOM",
            },
          })

        mocks.findCreation
          .mockResolvedValue(
            null,
          )

        mocks.findItem
          .mockResolvedValue({
            id:
              "look-1",
            assets: [
              {
                id:
                  "asset-1",
                storagePath:
                  "private/front.webp",
              },
              {
                id:
                  "asset-2",
                storagePath:
                  "private/back.webp",
              },
            ],
          })

        mocks.removeStorage
          .mockResolvedValue({
            data: [],
            error: null,
          })

        mocks.deleteAsset
          .mockResolvedValue({
            id:
              "asset-1",
          })

        mocks.updateSession
          .mockResolvedValue({
            id:
              "session-1",
          })
      },
    )

    it(
      "deletes only the requested persisted asset",
      async () => {
        await deleteMiravaSessionLookAsset({
          userId:
            "user-1",
          sessionId:
            "session-1",
          lookItemId:
            "look-1",
          assetId:
            "asset-1",
        })

        expect(
          mocks.removeStorage,
        ).toHaveBeenCalledWith([
          "private/front.webp",
        ])

        expect(
          mocks.deleteAsset,
        ).toHaveBeenCalledWith({
          where: {
            id:
              "asset-1",
          },
        })
      },
    )

    it(
      "refuses to delete the final remaining image",
      async () => {
        mocks.findItem
          .mockResolvedValue({
            id:
              "look-1",
            assets: [
              {
                id:
                  "asset-1",
                storagePath:
                  "private/front.webp",
              },
            ],
          })

        await expect(
          deleteMiravaSessionLookAsset({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "asset-1",
          }),
        ).rejects.toMatchObject({
          code:
            "LAST_ASSET_REQUIRED",
        })

        expect(
          mocks.removeStorage,
        ).not.toHaveBeenCalled()

        expect(
          mocks.deleteAsset,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "rejects an asset that does not belong to the item",
      async () => {
        await expect(
          deleteMiravaSessionLookAsset({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "asset-missing",
          }),
        ).rejects.toMatchObject({
          code:
            "ASSET_NOT_FOUND",
        })

        expect(
          mocks.removeStorage,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "keeps the database asset when storage deletion fails",
      async () => {
        mocks.removeStorage
          .mockResolvedValue({
            data: null,
            error:
              new Error(
                "storage unavailable",
              ),
          })

        await expect(
          deleteMiravaSessionLookAsset({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "asset-1",
          }),
        ).rejects.toMatchObject({
          code:
            "STORAGE_DELETE_FAILED",
        })

        expect(
          mocks.deleteAsset,
        ).not.toHaveBeenCalled()
      },
    )
  },
)
