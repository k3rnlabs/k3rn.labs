import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks =
  vi.hoisted(() => ({
    findSession:
      vi.fn(),
    findItems:
      vi.fn(),
    createItem:
      vi.fn(),
    deleteItem:
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
  }))

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
      studioSessionLookItem: {
        findMany:
          mocks.findItems,
        create:
          mocks.createItem,
        delete:
          mocks.deleteItem,
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
        from: () => ({
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
  MiravaSessionLookStoreError,
  finalizeMiravaSessionLookItem,
} from "./look-store"

const batchId =
  "3f6bece2-1ef2-47d7-8bc4-79e0d8e896b7"

const uploadPath =
  "user-1/session-look-staging/session-1/" +
  `${batchId}/front.jpg`

const validInput = {
  category:
    "TOP",
  label:
    "White shirt",
  uploads: [
    {
      path:
        uploadPath,
      mimeType:
        "image/jpeg",
      bytes:
        1000,
      viewKey:
        "FRONT",
    },
  ],
}

describe(
  "MIRAVA Session Builder look store",
  () => {
    beforeEach(() => {
      vi.clearAllMocks()

      mocks.findSession
        .mockResolvedValue({
          id:
            "session-1",
          builderConfig: {
            mode:
              "CUSTOM_SHOOT",
            shotCount: 6,
            lookMode:
              "CUSTOM",
          },
        })

      mocks.findItems
        .mockResolvedValue([])

      mocks.listStorage
        .mockResolvedValue({
          data: [
            {
              name:
                "front.jpg",
              metadata: {
                size:
                  1000,
                mimetype:
                  "image/jpeg",
              },
            },
          ],
          error: null,
        })

      mocks.moveStorage
        .mockResolvedValue({
          data: {},
          error: null,
        })

      mocks.removeStorage
        .mockResolvedValue({
          data: [],
          error: null,
        })

      mocks.createItem
        .mockImplementation(
          async ({
            data,
          }) => data,
        )

      mocks.createAssets
        .mockResolvedValue({
          count: 1,
        })

      mocks.updateSession
        .mockResolvedValue({
          id:
            "session-1",
        })

      mocks.deleteItem
        .mockResolvedValue(null)
    })

    it("moves a verified staged upload into durable private storage and persists it", async () => {
      const item =
        await finalizeMiravaSessionLookItem({
          userId:
            "user-1",
          sessionId:
            "session-1",
          batchId,
          input:
            validInput,
        })

      expect(
        mocks.moveStorage,
      ).toHaveBeenCalledTimes(1)

      const [
        source,
        destination,
      ] =
        mocks.moveStorage
          .mock.calls[0]

      expect(source).toBe(
        uploadPath,
      )

      expect(
        destination,
      ).toMatch(
        /^user-1\/session-look\/session-1\/[0-9a-f-]+\/[0-9a-f-]+\.jpg$/,
      )

      expect(
        mocks.createItem,
      ).toHaveBeenCalledWith({
        data:
          expect.objectContaining({
            sessionId:
              "session-1",
            category:
              "TOP",
            position: 0,
          }),
      })

      expect(
        mocks.createAssets,
      ).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            storagePath:
              destination,
            mimeType:
              "image/jpeg",
            bytes:
              1000,
            viewKey:
              "FRONT",
          }),
        ],
      })

      expect(
        item.assets,
      ).toHaveLength(1)

      expect(
        mocks.updateSession,
      ).toHaveBeenCalledTimes(1)
    })

    it("refuses a custom item when the session uses the artistic-reference look", async () => {
      mocks.findSession
        .mockResolvedValue({
          id:
            "session-1",
          builderConfig: {
            lookMode:
              "REFERENCE",
          },
        })

      await expect(
        finalizeMiravaSessionLookItem({
          userId:
            "user-1",
          sessionId:
            "session-1",
          batchId,
          input:
            validInput,
        }),
      ).rejects.toMatchObject({
        code:
          "CUSTOM_LOOK_REQUIRED",
      })

      expect(
        mocks.moveStorage,
      ).not.toHaveBeenCalled()
    })

    it("refuses a path outside the authenticated user's exact session and batch", async () => {
      await expect(
        finalizeMiravaSessionLookItem({
          userId:
            "user-1",
          sessionId:
            "session-1",
          batchId,
          input: {
            ...validInput,
            uploads: [
              {
                ...validInput
                  .uploads[0],
                path:
                  "other-user/session-look-staging/session-1/" +
                  `${batchId}/front.jpg`,
              },
            ],
          },
        }),
      ).rejects.toMatchObject({
        code:
          "INVALID_STORAGE_PATH",
      })

      expect(
        mocks.listStorage,
      ).not.toHaveBeenCalled()
    })

    it("rejects staged-object metadata that does not match the upload receipt", async () => {
      mocks.listStorage
        .mockResolvedValue({
          data: [
            {
              name:
                "front.jpg",
              metadata: {
                size:
                  999,
                mimetype:
                  "image/jpeg",
              },
            },
          ],
          error: null,
        })

      await expect(
        finalizeMiravaSessionLookItem({
          userId:
            "user-1",
          sessionId:
            "session-1",
          batchId,
          input:
            validInput,
        }),
      ).rejects.toMatchObject({
        code:
          "STAGED_OBJECT_MISMATCH",
      })
    })

    it("cleans durable and staged objects if persistence fails after the move", async () => {
      mocks.createAssets
        .mockRejectedValue(
          new Error(
            "db failed",
          ),
        )

      await expect(
        finalizeMiravaSessionLookItem({
          userId:
            "user-1",
          sessionId:
            "session-1",
          batchId,
          input:
            validInput,
        }),
      ).rejects.toBeInstanceOf(
        MiravaSessionLookStoreError,
      )

      expect(
        mocks.deleteItem,
      ).toHaveBeenCalledTimes(1)

      expect(
        mocks.removeStorage,
      ).toHaveBeenCalledTimes(1)

      const removed =
        mocks.removeStorage
          .mock.calls[0][0]

      expect(
        removed,
      ).toContain(
        uploadPath,
      )

      expect(
        removed.some(
          (path: string) =>
            path.startsWith(
              "user-1/session-look/session-1/",
            ),
        ),
      ).toBe(true)
    })
  },
)
