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
      findCurrentAsset:
        vi.fn(),
      updateAsset:
        vi.fn(),
      updateSession:
        vi.fn(),
      transaction:
        vi.fn(),
      listStorage:
        vi.fn(),
      moveStorage:
        vi.fn(),
      removeStorage:
        vi.fn(),
    }),
  )

const tx = {
  studioSessionLookAsset: {
    findUnique:
      mocks.findCurrentAsset,
    update:
      mocks.updateAsset,
  },
  studioSession: {
    update:
      mocks.updateSession,
  },
}

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
        findUnique:
          mocks.findCurrentAsset,
        update:
          mocks.updateAsset,
      },
      $transaction:
        mocks.transaction,
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
            list:
              mocks.listStorage,
            move:
              mocks.moveStorage,
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
  replaceMiravaSessionLookAsset,
} from "./look-store"

const batchId =
  "3f6bece2-1ef2-47d7-8bc4-79e0d8e896b7"

const stagedPath =
  "user-1/session-look-staging/" +
  `session-1/${batchId}/replacement.webp`

const replacement = {
  path:
    stagedPath,
  mimeType:
    "image/webp",
  bytes:
    3072,
  viewKey:
    "BACK",
}

describe(
  "MIRAVA persisted look asset replacement",
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
                  "private/old-front.jpg",
                mimeType:
                  "image/jpeg",
                bytes:
                  2048,
                viewKey:
                  "FRONT",
              },
              {
                id:
                  "asset-2",
                storagePath:
                  "private/side.jpg",
                mimeType:
                  "image/jpeg",
                bytes:
                  1900,
                viewKey:
                  "SIDE",
              },
            ],
          })

        mocks.findCurrentAsset
          .mockResolvedValue({
            id:
              "asset-1",
            storagePath:
              "private/old-front.jpg",
          })

        mocks.listStorage
          .mockResolvedValue({
            data: [
              {
                name:
                  "replacement.webp",
                metadata: {
                  size:
                    3072,
                  mimetype:
                    "image/webp",
                },
              },
            ],
            error:
              null,
          })

        mocks.moveStorage
          .mockResolvedValue({
            data:
              null,
            error:
              null,
          })

        mocks.removeStorage
          .mockResolvedValue({
            data:
              [],
            error:
              null,
          })

        mocks.updateAsset
          .mockResolvedValue({
            id:
              "asset-1",
          })

        mocks.updateSession
          .mockResolvedValue({
            id:
              "session-1",
          })

        mocks.transaction
          .mockImplementation(
            async (
              callback:
                (
                  value:
                    typeof tx,
                ) =>
                  Promise<unknown>,
            ) =>
              callback(
                tx,
              ),
          )
      },
    )

    it(
      "switches the exact asset to the new durable object before cleaning the old one",
      async () => {
        await replaceMiravaSessionLookAsset({
          userId:
            "user-1",
          sessionId:
            "session-1",
          lookItemId:
            "look-1",
          assetId:
            "asset-1",
          batchId,
          input:
            replacement,
        })

        expect(
          mocks.moveStorage,
        ).toHaveBeenCalledTimes(
          1,
        )

        const destination =
          mocks.moveStorage
            .mock.calls[0][1]

        expect(
          destination,
        ).toContain(
          "user-1/session-look/session-1/look-1/",
        )

        expect(
          mocks.updateAsset,
        ).toHaveBeenCalledWith({
          where: {
            id:
              "asset-1",
          },
          data: {
            storagePath:
              destination,
            mimeType:
              "image/webp",
            bytes:
              3072,
            viewKey:
              "BACK",
          },
        })

        expect(
          mocks.removeStorage,
        ).toHaveBeenLastCalledWith([
          "private/old-front.jpg",
        ])
      },
    )

    it(
      "rejects an asset outside the requested article",
      async () => {
        await expect(
          replaceMiravaSessionLookAsset({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "asset-missing",
            batchId,
            input:
              replacement,
          }),
        ).rejects.toMatchObject({
          code:
            "ASSET_NOT_FOUND",
        })

        expect(
          mocks.moveStorage,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "rejects a staged path outside the owned batch",
      async () => {
        await expect(
          replaceMiravaSessionLookAsset({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "asset-1",
            batchId,
            input: {
              ...replacement,
              path:
                "other-user/session-look-staging/" +
                `session-1/${batchId}/replacement.webp`,
            },
          }),
        ).rejects.toMatchObject({
          code:
            "INVALID_STORAGE_PATH",
        })

        expect(
          mocks.moveStorage,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "does not touch the database if the durable move fails",
      async () => {
        mocks.moveStorage
          .mockResolvedValue({
            data:
              null,
            error:
              new Error(
                "move failed",
              ),
          })

        await expect(
          replaceMiravaSessionLookAsset({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "asset-1",
            batchId,
            input:
              replacement,
          }),
        ).rejects.toMatchObject({
          code:
            "STORAGE_MOVE_FAILED",
        })

        expect(
          mocks.transaction,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "removes the new durable object if the database switch fails",
      async () => {
        mocks.transaction
          .mockRejectedValue(
            new Error(
              "db failed",
            ),
          )

        await expect(
          replaceMiravaSessionLookAsset({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "asset-1",
            batchId,
            input:
              replacement,
          }),
        ).rejects.toMatchObject({
          code:
            "FINALIZE_FAILED",
        })

        const destination =
          mocks.moveStorage
            .mock.calls[0][1]

        expect(
          mocks.removeStorage,
        ).toHaveBeenCalledWith([
          stagedPath,
          destination,
        ])

        expect(
          mocks.removeStorage,
        ).not.toHaveBeenCalledWith([
          "private/old-front.jpg",
        ])
      },
    )

    it(
      "rejects a concurrent replacement and compensates its new object",
      async () => {
        mocks.findCurrentAsset
          .mockResolvedValue({
            id:
              "asset-1",
            storagePath:
              "private/already-replaced.webp",
          })

        await expect(
          replaceMiravaSessionLookAsset({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "asset-1",
            batchId,
            input:
              replacement,
          }),
        ).rejects.toMatchObject({
          code:
            "ASSET_CONFLICT",
        })

        expect(
          mocks.updateAsset,
        ).not.toHaveBeenCalled()

        expect(
          mocks.removeStorage,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )

    it(
      "keeps the committed replacement valid if old-object cleanup fails",
      async () => {
        mocks.removeStorage
          .mockResolvedValue({
            data:
              null,
            error:
              new Error(
                "cleanup failed",
              ),
          })

        await expect(
          replaceMiravaSessionLookAsset({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            assetId:
              "asset-1",
            batchId,
            input:
              replacement,
          }),
        ).resolves.toBeUndefined()

        expect(
          mocks.updateAsset,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          mocks.removeStorage,
        ).toHaveBeenCalledWith([
          "private/old-front.jpg",
        ])
      },
    )
  },
)
