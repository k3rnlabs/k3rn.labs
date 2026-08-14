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
      updateSession:
        vi.fn(),
      findCreation:
        vi.fn(),
      findItem:
        vi.fn(),
      findItems:
        vi.fn(),
      updateItem:
        vi.fn(),
      deleteItem:
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
        findMany:
          mocks.findItems,
        update:
          mocks.updateItem,
        delete:
          mocks.deleteItem,
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
  deleteMiravaSessionLookItem,
  updateMiravaSessionLookItem,
} from "./look-store"

describe(
  "MIRAVA persisted look item mutations",
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
            position:
              0,
            assets: [
              {
                storagePath:
                  "user-1/session-look/session-1/look-1/front.webp",
              },
            ],
          })

        mocks.findItems
          .mockResolvedValue([])

        mocks.updateItem
          .mockResolvedValue({
            id:
              "look-1",
          })

        mocks.deleteItem
          .mockResolvedValue({
            id:
              "look-1",
          })

        mocks.updateSession
          .mockResolvedValue({
            id:
              "session-1",
          })

        mocks.removeStorage
          .mockResolvedValue({
            data: [],
            error: null,
          })
      },
    )

    it(
      "updates only explicit editable article metadata",
      async () => {
        await updateMiravaSessionLookItem({
          userId:
            "user-1",
          sessionId:
            "session-1",
          lookItemId:
            "look-1",
          input: {
            category:
              "DRESS",
            label:
              null,
            brand:
              "MIRAVA",
          },
        })

        expect(
          mocks.updateItem,
        ).toHaveBeenCalledWith({
          where: {
            id:
              "look-1",
            sessionId:
              "session-1",
          },
          data: {
            category:
              "DRESS",
            label:
              null,
            brand:
              "MIRAVA",
          },
        })
      },
    )

    it(
      "refuses article mutations after the session has launched",
      async () => {
        mocks.findCreation
          .mockResolvedValue({
            id:
              "creation-1",
          })

        await expect(
          updateMiravaSessionLookItem({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
            input: {
              label:
                "New label",
            },
          }),
        ).rejects.toMatchObject({
          code:
            "SESSION_ALREADY_LAUNCHED",
        })

        expect(
          mocks.updateItem,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "removes private files, deletes the article, then compacts positions",
      async () => {
        mocks.findItem
          .mockResolvedValue({
            id:
              "look-1",
            position:
              0,
            assets: [
              {
                storagePath:
                  "private/front.webp",
              },
              {
                storagePath:
                  "private/back.webp",
              },
            ],
          })

        mocks.findItems
          .mockResolvedValue([
            {
              id:
                "look-2",
              position:
                1,
            },
            {
              id:
                "look-3",
              position:
                4,
            },
          ])

        await deleteMiravaSessionLookItem({
          userId:
            "user-1",
          sessionId:
            "session-1",
          lookItemId:
            "look-1",
        })

        expect(
          mocks.removeStorage,
        ).toHaveBeenCalledWith([
          "private/front.webp",
          "private/back.webp",
        ])

        expect(
          mocks.deleteItem,
        ).toHaveBeenCalledWith({
          where: {
            id:
              "look-1",
            sessionId:
              "session-1",
          },
        })

        expect(
          mocks.updateItem,
        ).toHaveBeenNthCalledWith(
          1,
          {
            where: {
              id:
                "look-2",
              sessionId:
                "session-1",
            },
            data: {
              position:
                0,
            },
          },
        )

        expect(
          mocks.updateItem,
        ).toHaveBeenNthCalledWith(
          2,
          {
            where: {
              id:
                "look-3",
              sessionId:
                "session-1",
            },
            data: {
              position:
                1,
            },
          },
        )
      },
    )

    it(
      "keeps the database article when private storage deletion fails",
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
          deleteMiravaSessionLookItem({
            userId:
              "user-1",
            sessionId:
              "session-1",
            lookItemId:
              "look-1",
          }),
        ).rejects.toMatchObject({
          code:
            "STORAGE_DELETE_FAILED",
        })

        expect(
          mocks.deleteItem,
        ).not.toHaveBeenCalled()
      },
    )
  },
)
