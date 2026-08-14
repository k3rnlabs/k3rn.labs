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
      createAssets:
        vi.fn(),
      updateSession:
        vi.fn(),
      listStorage:
        vi.fn(),
      moveStorage:
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
        createMany:
          mocks.createAssets,
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
  addMiravaSessionLookAssets,
} from "./look-store"

const batchId =
  "3f6bece2-1ef2-47d7-8bc4-79e0d8e896b7"

const stagedPath =
  "user-1/session-look-staging/" +
  `session-1/${batchId}/front.jpg`

const input = [
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
]

describe(
  "MIRAVA add persisted look assets",
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
                  "asset-existing",
              },
            ],
          })

        mocks.listStorage
          .mockResolvedValue({
            data: [
              {
                name:
                  "front.jpg",
                metadata: {
                  size:
                    2048,
                  mimetype:
                    "image/jpeg",
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

        mocks.createAssets
          .mockResolvedValue({
            count:
              1,
          })

        mocks.updateSession
          .mockResolvedValue({
            id:
              "session-1",
          })
      },
    )

    it(
      "moves and persists a new view on the existing item",
      async () => {
        await addMiravaSessionLookAssets({
          userId:
            "user-1",
          sessionId:
            "session-1",
          lookItemId:
            "look-1",
          batchId,
          input,
        })

        expect(
          mocks.moveStorage,
        ).toHaveBeenCalledTimes(
          1,
        )

        const [
          source,
          destination,
        ] =
          mocks.moveStorage
            .mock.calls[0]

        expect(
          source,
        ).toBe(
          stagedPath,
        )

        expect(
          destination,
        ).toContain(
          "user-1/session-look/session-1/look-1/",
        )

        expect(
          mocks.createAssets,
        ).toHaveBeenCalledTimes(
          1,
        )

        const payload =
          mocks.createAssets
            .mock.calls[0][0]

        expect(
          payload.data[0],
        ).toMatchObject({
          lookItemId:
            "look-1",
          mimeType:
            "image/jpeg",
          bytes:
            2048,
          viewKey:
            "FRONT",
        })
      },
    )

    it(
      "refuses to exceed six persisted views",
      async () => {
        mocks.findItem
          .mockResolvedValue({
            id:
              "look-1",
            assets:
              Array.from(
                {
                  length:
                    6,
                },
                (
                  _,
                  index,
                ) => ({
                  id:
                    `asset-${index}`,
                }),
              ),
          })

        await expect(
          addMiravaSessionLookAssets({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            batchId,
            input,
          }),
        ).rejects.toMatchObject({
          code:
            "ASSET_LIMIT_REACHED",
        })

        expect(
          mocks.moveStorage,
        ).not.toHaveBeenCalled()

        expect(
          mocks.createAssets,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "rejects staged paths outside the owned session batch",
      async () => {
        await expect(
          addMiravaSessionLookAssets({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            batchId,
            input: [
              {
                ...input[0],
                path:
                  "other-user/session-look-staging/" +
                  `session-1/${batchId}/front.jpg`,
              },
            ],
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
      "cleans moved private objects if persistence fails",
      async () => {
        mocks.createAssets
          .mockRejectedValue(
            new Error(
              "db failed",
            ),
          )

        await expect(
          addMiravaSessionLookAssets({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            batchId,
            input,
          }),
        ).rejects.toMatchObject({
          code:
            "FINALIZE_FAILED",
        })

        expect(
          mocks.removeStorage,
        ).toHaveBeenCalledTimes(
          1,
        )
      },
    )
  },
)
