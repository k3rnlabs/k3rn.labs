import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import {
  createMiravaSessionBuilderClientSession,
  getMiravaSessionBuilderClientSession,
  parseMiravaSessionBuilderClientSession,
  patchMiravaSessionBuilderClientSession,
} from "./session-builder.client"

const publicSession = {
  id:
    "session-1",
  identityProfileId:
    "identity-1",
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
      "REFERENCE",
  },
  lookItemCount: 0,
  configurationReady:
    true,
  createdAt:
    "2026-08-08T00:00:00.000Z",
  updatedAt:
    "2026-08-08T00:00:00.000Z",
}

afterEach(
  () => {
    vi.restoreAllMocks()
  },
)

describe(
  "MIRAVA Session Builder client",
  () => {
    it("parses the canonical public session contract", () => {
      expect(
        parseMiravaSessionBuilderClientSession(
          publicSession,
        ),
      ).toEqual(
        publicSession,
      )
    })

    it("rejects malformed public sessions", () => {
      expect(
        () =>
          parseMiravaSessionBuilderClientSession(
            {
              ...publicSession,
              lookItemCount:
                -1,
            },
          ),
      ).toThrow(
        "MIRAVA_SESSION_CLIENT_INVALID_RESPONSE",
      )
    })

    it("creates a builder draft through POST /sessions", async () => {
      const fetchMock =
        vi.spyOn(
          globalThis,
          "fetch",
        ).mockResolvedValue(
          new Response(
            JSON.stringify({
              session:
                publicSession,
            }),
            {
              status:
                201,
              headers: {
                "Content-Type":
                  "application/json",
              },
            },
          ),
        )

      const result =
        await createMiravaSessionBuilderClientSession()

      expect(
        result.id,
      ).toBe(
        "session-1",
      )

      expect(
        fetchMock,
      ).toHaveBeenCalledWith(
        "/api/visual-engine/sessions",
        {
          method:
            "POST",
        },
      )
    })

    it("loads an existing builder session through GET", async () => {
      const fetchMock =
        vi.spyOn(
          globalThis,
          "fetch",
        ).mockResolvedValue(
          new Response(
            JSON.stringify({
              session:
                publicSession,
            }),
            {
              status:
                200,
              headers: {
                "Content-Type":
                  "application/json",
              },
            },
          ),
        )

      await getMiravaSessionBuilderClientSession(
        "session-1",
      )

      expect(
        fetchMock,
      ).toHaveBeenCalledWith(
        "/api/visual-engine/sessions/session-1",
        {
          method:
            "GET",
        },
      )
    })

    it("persists builder selections through PATCH", async () => {
      const fetchMock =
        vi.spyOn(
          globalThis,
          "fetch",
        ).mockResolvedValue(
          new Response(
            JSON.stringify({
              session:
                publicSession,
            }),
            {
              status:
                200,
              headers: {
                "Content-Type":
                  "application/json",
              },
            },
          ),
        )

      await patchMiravaSessionBuilderClientSession(
        "session-1",
        {
          lightingPresetId:
            "soft-v1",
        },
      )

      expect(
        fetchMock,
      ).toHaveBeenCalledWith(
        "/api/visual-engine/sessions/session-1",
        expect.objectContaining({
          method:
            "PATCH",
          body:
            JSON.stringify({
              lightingPresetId:
                "soft-v1",
            }),
        }),
      )
    })
  },
)
