import {
  readFileSync,
} from "node:fs"

import {
  describe,
  expect,
  it,
  vi,
} from "vitest"

import {
  runMiravaLookStorageGc,
  type MiravaLookStorageGcDependencies,
  type MiravaLookStorageGcEntry,
} from "./look-storage-gc"

const NOW =
  new Date(
    "2026-08-11T18:00:00.000Z",
  )

const OLD =
  "2026-08-09T12:00:00.000Z"

const RECENT =
  "2026-08-11T17:30:00.000Z"

function file(
  name:
    string,
  createdAt =
    OLD,
): MiravaLookStorageGcEntry {
  return {
    name,
    id:
      `id-${name}`,
    created_at:
      createdAt,
    updated_at:
      createdAt,
  }
}

function folder(
  name:
    string,
): MiravaLookStorageGcEntry {
  return {
    name,
    id:
      null,
  }
}

function dependencies({
  referenced = [
    "user-1/session-look/session-1/look-1/referenced.webp",
  ],
  directories = {},
  listErrorPath,
}: {
  referenced?:
    string[]
  directories?:
    Record<
      string,
      MiravaLookStorageGcEntry[]
    >
  listErrorPath?:
    string
} = {}): {
  value:
    MiravaLookStorageGcDependencies
  remove:
    ReturnType<
      typeof vi.fn
    >
  list:
    ReturnType<
      typeof vi.fn
    >
} {
  const remove =
    vi.fn()
      .mockResolvedValue({
        error:
          null,
      })

  const list =
    vi.fn(
      async (
        path:
          string,
        options: {
          limit:
            number
          offset:
            number
        },
      ) => {
        if (
          path ===
          listErrorPath
        ) {
          return {
            data:
              null,
            error:
              new Error(
                "list failed",
              ),
          }
        }

        const source =
          directories[
            path
          ] ??
          []

        return {
          data:
            source.slice(
              options.offset,
              options.offset +
                options.limit,
            ),
          error:
            null,
        }
      },
    )

  return {
    remove,
    list,
    value: {
      listReferencedPaths:
        async () =>
          referenced,
      listStorage:
        list,
      removeStorage:
        remove,
    },
  }
}

describe(
  "MIRAVA look storage garbage collection",
  () => {
    it(
      "dry-runs old unreferenced durable files and abandoned staging without deleting",
      async () => {
        const deps =
          dependencies({
            directories: {
              "": [
                folder(
                  "user-1",
                ),
              ],
              "user-1/session-look": [
                folder(
                  "session-1",
                ),
              ],
              "user-1/session-look/session-1": [
                folder(
                  "look-1",
                ),
              ],
              "user-1/session-look/session-1/look-1": [
                file(
                  "referenced.webp",
                ),
                file(
                  "orphan.webp",
                ),
                file(
                  "recent.webp",
                  RECENT,
                ),
              ],
              "user-1/session-look-staging": [
                folder(
                  "session-1",
                ),
              ],
              "user-1/session-look-staging/session-1": [
                folder(
                  "batch-1",
                ),
              ],
              "user-1/session-look-staging/session-1/batch-1": [
                file(
                  "abandoned.webp",
                ),
              ],
            },
          })

        const report =
          await runMiravaLookStorageGc({
            dryRun:
              true,
            now:
              NOW,
            durableGraceMs:
              24 * 60 * 60 * 1000,
            stagingGraceMs:
              24 * 60 * 60 * 1000,
            dependencies:
              deps.value,
          })

        expect(
          report.candidates,
        ).toMatchObject({
          durableOrphans:
            1,
          abandonedStaging:
            1,
          total:
            2,
          selected:
            2,
        })

        expect(
          report.skipped,
        ).toMatchObject({
          referenced:
            1,
          recent:
            1,
        })

        expect(
          report.deleted.total,
        ).toBe(
          0,
        )

        expect(
          deps.remove,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "deletes only selected old orphan candidates during an execute run",
      async () => {
        const deps =
          dependencies({
            referenced:
              [],
            directories: {
              "": [
                folder(
                  "user-1",
                ),
              ],
              "user-1/session-look": [
                file(
                  "a.webp",
                ),
                file(
                  "b.webp",
                ),
              ],
            },
          })

        const report =
          await runMiravaLookStorageGc({
            dryRun:
              false,
            now:
              NOW,
            durableGraceMs:
              0,
            stagingGraceMs:
              0,
            maxDeletes:
              1,
            dependencies:
              deps.value,
          })

        expect(
          report.candidates.total,
        ).toBe(
          2,
        )

        expect(
          report.candidates.selected,
        ).toBe(
          1,
        )

        expect(
          report.deleted.total,
        ).toBe(
          1,
        )

        expect(
          deps.remove,
        ).toHaveBeenCalledTimes(
          1,
        )

        expect(
          deps.remove.mock.calls[
            0
          ][
            0
          ],
        ).toHaveLength(
          1,
        )
      },
    )

    it(
      "fails closed before deletion when storage listing fails",
      async () => {
        const deps =
          dependencies({
            referenced:
              [],
            directories: {
              "": [
                folder(
                  "user-1",
                ),
              ],
            },
            listErrorPath:
              "user-1/session-look",
          })

        await expect(
          runMiravaLookStorageGc({
            dryRun:
              false,
            now:
              NOW,
            dependencies:
              deps.value,
          }),
        ).rejects.toMatchObject({
          code:
            "STORAGE_LIST_FAILED",
        })

        expect(
          deps.remove,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "fails closed when the database reference snapshot cannot be read",
      async () => {
        const remove =
          vi.fn()

        const list =
          vi.fn()

        await expect(
          runMiravaLookStorageGc({
            dryRun:
              false,
            dependencies: {
              listReferencedPaths:
                async () => {
                  throw new Error(
                    "db unavailable",
                  )
                },
              listStorage:
                list,
              removeStorage:
                remove,
            },
          }),
        ).rejects.toThrow(
          "db unavailable",
        )

        expect(
          list,
        ).not.toHaveBeenCalled()

        expect(
          remove,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "skips objects without a trustworthy timestamp",
      async () => {
        const deps =
          dependencies({
            referenced:
              [],
            directories: {
              "": [
                folder(
                  "user-1",
                ),
              ],
              "user-1/session-look": [
                {
                  name:
                    "unknown.webp",
                  id:
                    "asset-1",
                },
              ],
            },
          })

        const report =
          await runMiravaLookStorageGc({
            dryRun:
              false,
            now:
              NOW,
            durableGraceMs:
              0,
            dependencies:
              deps.value,
          })

        expect(
          report.skipped
            .unknownTimestamp,
        ).toBe(
          1,
        )

        expect(
          report.deleted.total,
        ).toBe(
          0,
        )

        expect(
          deps.remove,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      "paginates storage directory discovery",
      async () => {
        const deps =
          dependencies({
            referenced:
              [],
            directories: {
              "": [
                folder(
                  "user-1",
                ),
                folder(
                  "user-2",
                ),
                folder(
                  "user-3",
                ),
              ],
            },
          })

        const report =
          await runMiravaLookStorageGc({
            dryRun:
              true,
            pageSize:
              2,
            dependencies:
              deps.value,
          })

        expect(
          report.scanned
            .topLevelFolders,
        ).toBe(
          3,
        )

        const rootCalls =
          deps.list.mock.calls
            .filter(
              (
                call,
              ) =>
                call[0] ===
                "",
            )

        expect(
          rootCalls.length,
        ).toBeGreaterThanOrEqual(
          2,
        )
      },
    )

    it(
      "registers one daily production cron",
      () => {
        const config =
          JSON.parse(
            readFileSync(
              "vercel.json",
              "utf8",
            ),
          )

        expect(
          config.crons,
        ).toEqual([
          {
            path:
              "/api/visual-engine/internal/look-storage-gc",
            schedule:
              "17 3 * * *",
          },
        ])
      },
    )
  },
)
