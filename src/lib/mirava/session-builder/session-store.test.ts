import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks = vi.hoisted(() => ({
  findIdentity:
    vi.fn(),
  createSession:
    vi.fn(),
  listSessions:
    vi.fn(),
  findSession:
    vi.fn(),
  updateSession:
    vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    studioIdentityProfile: {
      findUnique:
        mocks.findIdentity,
    },
    studioSession: {
      create:
        mocks.createSession,
      findMany:
        mocks.listSessions,
      findUnique:
        mocks.findSession,
      update:
        mocks.updateSession,
    },
  },
}))

import {
  MiravaSessionBuilderStoreError,
  createMiravaSessionBuilderDraft,
  getMiravaSessionBuilderDraft,
  listMiravaSessionBuilderDrafts,
  updateMiravaSessionBuilderDraft,
} from "./session-store"

const baseRow = {
  id: "session-1",
  userId: "user-1",
  identityProfileId:
    "identity-1",
  builderVersion: 1,
  setPresetId: null,
  lightingPresetId: null,
  builderConfig: {
    mode:
      "CUSTOM_SHOOT",
    shotCount: 6,
    lookMode:
      "REFERENCE",
  },
  lookItems: [],
  createdAt:
    "2026-08-07T20:00:00.000Z",
  updatedAt:
    "2026-08-07T20:00:00.000Z",
}

describe(
  "MIRAVA Session Builder store",
  () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it("creates a builder draft bound to the current identity profile", async () => {
      mocks.findIdentity
        .mockResolvedValue({
          id: "identity-1",
        })

      mocks.createSession
        .mockResolvedValue(
          baseRow,
        )

      const session =
        await createMiravaSessionBuilderDraft(
          "user-1",
        )

      expect(
        mocks.createSession,
      ).toHaveBeenCalledWith({
        data: {
          userId:
            "user-1",
          identityProfileId:
            "identity-1",
          builderVersion: 1,
          setPresetId: null,
          lightingPresetId:
            null,
          builderConfig: {
            mode:
              "CUSTOM_SHOOT",
            shotCount: 6,
            lookMode:
              "REFERENCE",
          },
        },
      })

      expect(
        session.configurationReady,
      ).toBe(false)

      expect(
        session.identityProfileId,
      ).toBe("identity-1")
    })

    it("lists only V1 builder sessions for the authenticated user", async () => {
      mocks.listSessions
        .mockResolvedValue([
          baseRow,
        ])

      const sessions =
        await listMiravaSessionBuilderDrafts(
          "user-1",
        )

      expect(
        mocks.listSessions,
      ).toHaveBeenCalledWith({
        where: {
          userId:
            "user-1",
          builderVersion: 1,
        },
        orderBy: {
          updatedAt:
            "desc",
        },
        include: {
          lookItems: {
            select: {
              id: true,
            },
          },
        },
        take: 20,
      })

      expect(sessions).toHaveLength(
        1,
      )
    })

    it("reads one builder session without exposing another user's session", async () => {
      mocks.findSession
        .mockResolvedValue(
          baseRow,
        )

      const session =
        await getMiravaSessionBuilderDraft(
          "user-1",
          "session-1",
        )

      expect(
        mocks.findSession,
      ).toHaveBeenCalledWith({
        where: {
          id:
            "session-1",
          userId:
            "user-1",
          builderVersion: 1,
        },
        include: {
          lookItems: {
            select: {
              id: true,
            },
          },
        },
      })

      expect(session?.id).toBe(
        "session-1",
      )
    })

    it("persists set, lighting and look mode while keeping builder metadata canonical", async () => {
      mocks.findSession
        .mockResolvedValue(
          baseRow,
        )

      mocks.updateSession
        .mockResolvedValue({
          ...baseRow,
          setPresetId:
            "grey-cyclorama-v1",
          lightingPresetId:
            "direct-flash-v1",
          builderConfig: {
            mode:
              "CUSTOM_SHOOT",
            shotCount: 6,
            lookMode:
              "CUSTOM",
          },
        })

      const updated =
        await updateMiravaSessionBuilderDraft(
          "user-1",
          "session-1",
          {
            setPresetId:
              "grey-cyclorama-v1",
            lightingPresetId:
              "direct-flash-v1",
            lookMode:
              "CUSTOM",
          },
        )

      expect(
        mocks.updateSession,
      ).toHaveBeenCalledWith({
        where: {
          id:
            "session-1",
          userId:
            "user-1",
          builderVersion: 1,
        },
        data: {
          setPresetId:
            "grey-cyclorama-v1",
          lightingPresetId:
            "direct-flash-v1",
          builderConfig: {
            mode:
              "CUSTOM_SHOOT",
            shotCount: 6,
            lookMode:
              "CUSTOM",
          },
        },
      })

      expect(
        updated.configurationReady,
      ).toBe(false)
    })

    it("marks a complete CUSTOM session ready only when a persisted look item exists", async () => {
      mocks.findSession
        .mockResolvedValue({
          ...baseRow,
          setPresetId:
            "white-cyclorama-v1",
          lightingPresetId:
            "soft-v1",
          builderConfig: {
            mode:
              "CUSTOM_SHOOT",
            shotCount: 6,
            lookMode:
              "CUSTOM",
          },
          lookItems: [
            {
              id:
                "look-item-1",
            },
          ],
        })

      const session =
        await getMiravaSessionBuilderDraft(
          "user-1",
          "session-1",
        )

      expect(
        session?.lookItemCount,
      ).toBe(1)

      expect(
        session?.configurationReady,
      ).toBe(true)
    })

    it("rejects invalid updates and missing sessions", async () => {
      await expect(
        updateMiravaSessionBuilderDraft(
          "user-1",
          "session-1",
          {
            setPresetId:
              "not-a-set",
          },
        ),
      ).rejects.toMatchObject({
        code:
          "INVALID_PATCH",
      })

      mocks.findSession
        .mockResolvedValue(null)

      await expect(
        updateMiravaSessionBuilderDraft(
          "user-1",
          "missing",
          {
            lookMode:
              "CUSTOM",
          },
        ),
      ).rejects.toBeInstanceOf(
        MiravaSessionBuilderStoreError,
      )
    })
  },
)
