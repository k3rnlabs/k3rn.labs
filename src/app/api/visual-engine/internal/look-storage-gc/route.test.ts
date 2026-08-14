import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks =
  vi.hoisted(
    () => ({
      run:
        vi.fn(),
    }),
  )

vi.mock(
  "@/lib/mirava/session-builder/look-storage-gc",
  () => {
    class MockGcError
      extends Error {
      code:
        string

      constructor(
        code:
          string,
        message:
          string,
      ) {
        super(
          message,
        )

        this.code =
          code
      }
    }

    return {
      MiravaLookStorageGcError:
        MockGcError,
      runMiravaLookStorageGc:
        mocks.run,
    }
  },
)

import {
  GET,
} from "./route"

const originalCronSecret =
  process.env
    .CRON_SECRET

const originalInternalSecret =
  process.env
    .INTERNAL_WEBHOOK_SECRET

describe(
  "MIRAVA look storage GC route",
  () => {
    beforeEach(
      () => {
        vi.clearAllMocks()

        process.env
          .CRON_SECRET =
          "cron-secret"

        process.env
          .INTERNAL_WEBHOOK_SECRET =
          "internal-secret"

        mocks.run
          .mockResolvedValue({
            dryRun:
              true,
            deleted: {
              total:
                0,
            },
          })
      },
    )

    afterEach(
      () => {
        if (
          originalCronSecret ===
          undefined
        ) {
          delete process.env
            .CRON_SECRET
        } else {
          process.env
            .CRON_SECRET =
            originalCronSecret
        }

        if (
          originalInternalSecret ===
          undefined
        ) {
          delete process.env
            .INTERNAL_WEBHOOK_SECRET
        } else {
          process.env
            .INTERNAL_WEBHOOK_SECRET =
            originalInternalSecret
        }
      },
    )

    it(
      "rejects unauthenticated maintenance requests",
      async () => {
        const response =
          await GET(
            new Request(
              "http://localhost/api/visual-engine/internal/look-storage-gc",
            ) as never,
          )

        expect(
          response.status,
        ).toBe(
          401,
        )

        expect(
          mocks.run,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "accepts the internal secret for an explicit dry run",
      async () => {
        const response =
          await GET(
            new Request(
              "http://localhost/api/visual-engine/internal/look-storage-gc?dryRun=1",
              {
                headers: {
                  "x-internal-secret":
                    "internal-secret",
                },
              },
            ) as never,
          )

        expect(
          response.status,
        ).toBe(
          200,
        )

        expect(
          mocks.run,
        ).toHaveBeenCalledWith({
          dryRun:
            true,
        })
      },
    )

    it(
      "accepts the Vercel cron bearer secret for an execute run",
      async () => {
        const response =
          await GET(
            new Request(
              "http://localhost/api/visual-engine/internal/look-storage-gc",
              {
                headers: {
                  authorization:
                    "Bearer cron-secret",
                },
              },
            ) as never,
          )

        expect(
          response.status,
        ).toBe(
          200,
        )

        expect(
          mocks.run,
        ).toHaveBeenCalledWith({
          dryRun:
            false,
        })
      },
    )

    it(
      "returns a maintenance error without exposing private paths",
      async () => {
        const consoleError =
          vi.spyOn(
            console,
            "error",
          )
            .mockImplementation(
              () => undefined,
            )

        mocks.run
          .mockRejectedValue(
            new Error(
              "private/path/file.webp",
            ),
          )

        const response =
          await GET(
            new Request(
              "http://localhost/api/visual-engine/internal/look-storage-gc?dryRun=1",
              {
                headers: {
                  "x-internal-secret":
                    "internal-secret",
                },
              },
            ) as never,
          )

        expect(
          response.status,
        ).toBe(
          503,
        )

        const body =
          await response.text()

        expect(
          body,
        ).not.toContain(
          "private/path",
        )

        const logged =
          consoleError
            .mock
            .calls
            .flat()
            .map(
              (value) =>
                String(
                  value,
                ),
            )
            .join(
              " ",
            )

        expect(
          logged,
        ).not.toContain(
          "private/path",
        )

        expect(
          logged,
        ).toContain(
          "UNKNOWN_ERROR",
        )

        consoleError
          .mockRestore()
      },
    )
  },
)
