import {
  supabaseAdmin,
} from "@/lib/supabase-admin"

export const MIRAVA_LOOK_GC_DEFAULT_GRACE_MS =
  24 * 60 * 60 * 1000

export const MIRAVA_LOOK_GC_DEFAULT_MAX_DELETES =
  200

const MIRAVA_LOOK_GC_DEFAULT_PAGE_SIZE =
  100

const MIRAVA_LOOK_GC_DELETE_BATCH_SIZE =
  100

const STUDIO_BUCKET =
  process.env
    .SUPABASE_STORAGE_VISUAL_ENGINE_BUCKET ??
  "visual-engine-private"

export type MiravaLookStorageGcErrorCode =
  | "REFERENCE_QUERY_FAILED"
  | "STORAGE_LIST_FAILED"
  | "STORAGE_DELETE_FAILED"
  | "UNSAFE_STORAGE_ENTRY"

export class MiravaLookStorageGcError
  extends Error {
  code:
    MiravaLookStorageGcErrorCode

  constructor(
    code:
      MiravaLookStorageGcErrorCode,
    message: string,
  ) {
    super(message)
    this.name =
      "MiravaLookStorageGcError"
    this.code =
      code
  }
}

export type MiravaLookStorageGcEntry =
  Readonly<{
    name: string
    id?:
      | string
      | null
    created_at?:
      | string
      | null
    updated_at?:
      | string
      | null
  }>

export type MiravaLookStorageGcDependencies =
  Readonly<{
    listReferencedPaths:
      () => Promise<
        string[]
      >
    listStorage:
      (
        path: string,
        options: {
          limit: number
          offset: number
        },
      ) => Promise<{
        data:
          | MiravaLookStorageGcEntry[]
          | null
        error:
          unknown
      }>
    removeStorage:
      (
        paths:
          string[],
      ) => Promise<{
        error:
          unknown
      }>
  }>

export type MiravaLookStorageGcReport =
  Readonly<{
    dryRun: boolean
    bucket: string
    graceHours: {
      durable:
        number
      staging:
        number
    }
    referencedAssets:
      number
    scanned: {
      topLevelFolders:
        number
      durableFiles:
        number
      stagingFiles:
        number
    }
    candidates: {
      durableOrphans:
        number
      abandonedStaging:
        number
      total:
        number
      selected:
        number
    }
    skipped: {
      referenced:
        number
      recent:
        number
      unknownTimestamp:
        number
    }
    deleted: {
      durableOrphans:
        number
      abandonedStaging:
        number
      total:
        number
    }
  }>

type StorageObject =
  Readonly<{
    path:
      string
    createdAtMs:
      number | null
  }>

type DeleteCandidate =
  Readonly<{
    path:
      string
    kind:
      | "durable"
      | "staging"
  }>

function positiveInteger(
  value:
    string | undefined,
  fallback:
    number,
): number {
  const parsed =
    Number.parseInt(
      value ?? "",
      10,
    )

  return Number.isInteger(
    parsed,
  ) &&
    parsed > 0
    ? parsed
    : fallback
}

function graceMsFromEnv(
  name:
    string,
): number {
  const hours =
    positiveInteger(
      process.env[
        name
      ],
      24,
    )

  return (
    hours *
    60 *
    60 *
    1000
  )
}

function maxDeletesFromEnv():
  number {
  return Math.min(
    positiveInteger(
      process.env
        .MIRAVA_LOOK_GC_MAX_DELETES,
      MIRAVA_LOOK_GC_DEFAULT_MAX_DELETES,
    ),
    1000,
  )
}

function safeSegment(
  value:
    string,
): boolean {
  return (
    value.length > 0 &&
    value !== "." &&
    value !== ".." &&
    !value.includes(
      "/",
    ) &&
    !value.includes(
      "\\",
    )
  )
}

function joinStoragePath(
  parent:
    string,
  child:
    string,
): string {
  if (
    !safeSegment(
      child,
    )
  ) {
    throw new MiravaLookStorageGcError(
      "UNSAFE_STORAGE_ENTRY",
      "Unsafe MIRAVA storage entry.",
    )
  }

  return parent
    ? `${parent}/${child}`
    : child
}

function timestampMs(
  entry:
    MiravaLookStorageGcEntry,
): number | null {
  const values = [
    entry.created_at,
    entry.updated_at,
  ]
    .filter(
      (
        value,
      ): value is string =>
        typeof value ===
          "string" &&
        value.length > 0,
    )
    .map(
      (value) =>
        Date.parse(
          value,
        ),
    )
    .filter(
      (value) =>
        Number.isFinite(
          value,
        ),
    )

  if (
    values.length < 1
  ) {
    return null
  }

  return Math.max(
    ...values,
  )
}

function isFileEntry(
  entry:
    MiravaLookStorageGcEntry,
): boolean {
  return (
    typeof entry.id ===
      "string" &&
    entry.id.length > 0
  )
}

async function defaultReferencedPaths():
  Promise<string[]> {
  const paths:
    string[] = []

  const pageSize =
    1000

  let offset =
    0

  while (true) {
    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "StudioSessionLookAsset",
        )
        .select(
          "id,storagePath",
        )
        .order(
          "id",
          {
            ascending:
              true,
          },
        )
        .range(
          offset,
          offset +
            pageSize -
            1,
        )

    if (error) {
      throw new MiravaLookStorageGcError(
        "REFERENCE_QUERY_FAILED",
        "MIRAVA could not read persisted look asset references.",
      )
    }

    const rows =
      Array.isArray(
        data,
      )
        ? data
        : []

    for (
      const row
      of rows
    ) {
      const value =
        (
          row as {
            storagePath?:
              unknown
          }
        )
          .storagePath

      if (
        typeof value ===
          "string" &&
        value.length > 0
      ) {
        paths.push(
          value,
        )
      }
    }

    if (
      rows.length <
      pageSize
    ) {
      break
    }

    offset +=
      pageSize
  }

  return paths
}

function defaultDependencies():
  MiravaLookStorageGcDependencies {
  const storage =
    supabaseAdmin
      .storage
      .from(
        STUDIO_BUCKET,
      )

  return {
    listReferencedPaths:
      defaultReferencedPaths,

    listStorage:
      async (
        path,
        options,
      ) => {
        const result =
          await storage
            .list(
              path,
              {
                limit:
                  options.limit,
                offset:
                  options.offset,
                sortBy: {
                  column:
                    "name",
                  order:
                    "asc",
                },
              },
            )

        return {
          data:
            result.data,
          error:
            result.error,
        }
      },

    removeStorage:
      async (
        paths,
      ) => {
        const result =
          await storage
            .remove(
              paths,
            )

        return {
          error:
            result.error,
        }
      },
  }
}

async function listDirectory(
  dependencies:
    MiravaLookStorageGcDependencies,
  path:
    string,
  pageSize:
    number,
): Promise<
  MiravaLookStorageGcEntry[]
> {
  const entries:
    MiravaLookStorageGcEntry[] =
    []

  let offset =
    0

  while (true) {
    const result =
      await dependencies
        .listStorage(
          path,
          {
            limit:
              pageSize,
            offset,
          },
        )

    if (
      result.error
    ) {
      throw new MiravaLookStorageGcError(
        "STORAGE_LIST_FAILED",
        "MIRAVA could not list private look storage.",
      )
    }

    const page =
      Array.isArray(
        result.data,
      )
        ? result.data
        : []

    entries.push(
      ...page,
    )

    if (
      page.length <
      pageSize
    ) {
      break
    }

    offset +=
      pageSize
  }

  return entries
}

async function listFilesRecursively(
  dependencies:
    MiravaLookStorageGcDependencies,
  path:
    string,
  pageSize:
    number,
): Promise<
  StorageObject[]
> {
  const entries =
    await listDirectory(
      dependencies,
      path,
      pageSize,
    )

  const files:
    StorageObject[] = []

  for (
    const entry
    of entries
  ) {
    const childPath =
      joinStoragePath(
        path,
        entry.name,
      )

    if (
      isFileEntry(
        entry,
      )
    ) {
      files.push({
        path:
          childPath,
        createdAtMs:
          timestampMs(
            entry,
          ),
      })

      continue
    }

    files.push(
      ...await listFilesRecursively(
        dependencies,
        childPath,
        pageSize,
      ),
    )
  }

  return files
}

async function discoverLookStorage(
  dependencies:
    MiravaLookStorageGcDependencies,
  pageSize:
    number,
): Promise<{
  topLevelFolders:
    number
  durable:
    StorageObject[]
  staging:
    StorageObject[]
}> {
  const rootEntries =
    await listDirectory(
      dependencies,
      "",
      pageSize,
    )

  const userFolders =
    rootEntries.filter(
      (entry) =>
        !isFileEntry(
          entry,
        ),
    )

  const durable:
    StorageObject[] = []

  const staging:
    StorageObject[] = []

  for (
    const userFolder
    of userFolders
  ) {
    const userPrefix =
      joinStoragePath(
        "",
        userFolder.name,
      )

    durable.push(
      ...await listFilesRecursively(
        dependencies,
        `${userPrefix}/session-look`,
        pageSize,
      ),
    )

    staging.push(
      ...await listFilesRecursively(
        dependencies,
        `${userPrefix}/session-look-staging`,
        pageSize,
      ),
    )
  }

  return {
    topLevelFolders:
      userFolders.length,
    durable,
    staging,
  }
}

function evaluateCandidate({
  object,
  cutoff,
}: {
  object:
    StorageObject
  cutoff:
    number
}):
  | "old"
  | "recent"
  | "unknown" {
  if (
    object.createdAtMs ===
    null
  ) {
    return "unknown"
  }

  if (
    object.createdAtMs >
    cutoff
  ) {
    return "recent"
  }

  return "old"
}

async function removeCandidates(
  dependencies:
    MiravaLookStorageGcDependencies,
  candidates:
    readonly DeleteCandidate[],
): Promise<{
  durable:
    number
  staging:
    number
}> {
  let durable =
    0

  let staging =
    0

  for (
    let index = 0;
    index <
      candidates.length;
    index +=
      MIRAVA_LOOK_GC_DELETE_BATCH_SIZE
  ) {
    const batch =
      candidates.slice(
        index,
        index +
          MIRAVA_LOOK_GC_DELETE_BATCH_SIZE,
      )

    const result =
      await dependencies
        .removeStorage(
          batch.map(
            (candidate) =>
              candidate.path,
          ),
        )

    if (
      result.error
    ) {
      throw new MiravaLookStorageGcError(
        "STORAGE_DELETE_FAILED",
        "MIRAVA could not delete orphaned look storage.",
      )
    }

    for (
      const candidate
      of batch
    ) {
      if (
        candidate.kind ===
        "durable"
      ) {
        durable +=
          1
      } else {
        staging +=
          1
      }
    }
  }

  return {
    durable,
    staging,
  }
}

export async function runMiravaLookStorageGc({
  dryRun = true,
  now =
    new Date(),
  durableGraceMs =
    graceMsFromEnv(
      "MIRAVA_LOOK_GC_DURABLE_GRACE_HOURS",
    ),
  stagingGraceMs =
    graceMsFromEnv(
      "MIRAVA_LOOK_GC_STAGING_GRACE_HOURS",
    ),
  maxDeletes =
    maxDeletesFromEnv(),
  pageSize =
    MIRAVA_LOOK_GC_DEFAULT_PAGE_SIZE,
  dependencies =
    defaultDependencies(),
}: {
  dryRun?:
    boolean
  now?:
    Date
  durableGraceMs?:
    number
  stagingGraceMs?:
    number
  maxDeletes?:
    number
  pageSize?:
    number
  dependencies?:
    MiravaLookStorageGcDependencies
} = {}):
  Promise<
    MiravaLookStorageGcReport
  > {
  const referencedPaths =
    await dependencies
      .listReferencedPaths()

  const referenced =
    new Set(
      referencedPaths.filter(
        (value) =>
          typeof value ===
            "string" &&
          value.length > 0,
      ),
    )

  const storage =
    await discoverLookStorage(
      dependencies,
      Math.max(
        1,
        pageSize,
      ),
    )

  const durableCutoff =
    now.getTime() -
    Math.max(
      0,
      durableGraceMs,
    )

  const stagingCutoff =
    now.getTime() -
    Math.max(
      0,
      stagingGraceMs,
    )

  const durableCandidates:
    DeleteCandidate[] = []

  const stagingCandidates:
    DeleteCandidate[] = []

  let skippedReferenced =
    0

  let skippedRecent =
    0

  let skippedUnknownTimestamp =
    0

  for (
    const object
    of storage.durable
  ) {
    if (
      referenced.has(
        object.path,
      )
    ) {
      skippedReferenced +=
        1
      continue
    }

    const state =
      evaluateCandidate({
        object,
        cutoff:
          durableCutoff,
      })

    if (
      state ===
      "recent"
    ) {
      skippedRecent +=
        1
      continue
    }

    if (
      state ===
      "unknown"
    ) {
      skippedUnknownTimestamp +=
        1
      continue
    }

    durableCandidates.push({
      path:
        object.path,
      kind:
        "durable",
    })
  }

  for (
    const object
    of storage.staging
  ) {
    const state =
      evaluateCandidate({
        object,
        cutoff:
          stagingCutoff,
      })

    if (
      state ===
      "recent"
    ) {
      skippedRecent +=
        1
      continue
    }

    if (
      state ===
      "unknown"
    ) {
      skippedUnknownTimestamp +=
        1
      continue
    }

    stagingCandidates.push({
      path:
        object.path,
      kind:
        "staging",
    })
  }

  const allCandidates =
    [
      ...durableCandidates,
      ...stagingCandidates,
    ]
      .sort(
        (
          left,
          right,
        ) =>
          left.path.localeCompare(
            right.path,
          ),
      )

  const selected =
    allCandidates.slice(
      0,
      Math.max(
        0,
        Math.min(
          maxDeletes,
          1000,
        ),
      ),
    )

  const deleted =
    dryRun
      ? {
          durable:
            0,
          staging:
            0,
        }
      : await removeCandidates(
          dependencies,
          selected,
        )

  return {
    dryRun,
    bucket:
      STUDIO_BUCKET,
    graceHours: {
      durable:
        durableGraceMs /
        (60 * 60 * 1000),
      staging:
        stagingGraceMs /
        (60 * 60 * 1000),
    },
    referencedAssets:
      referenced.size,
    scanned: {
      topLevelFolders:
        storage
          .topLevelFolders,
      durableFiles:
        storage
          .durable.length,
      stagingFiles:
        storage
          .staging.length,
    },
    candidates: {
      durableOrphans:
        durableCandidates
          .length,
      abandonedStaging:
        stagingCandidates
          .length,
      total:
        allCandidates
          .length,
      selected:
        selected.length,
    },
    skipped: {
      referenced:
        skippedReferenced,
      recent:
        skippedRecent,
      unknownTimestamp:
        skippedUnknownTimestamp,
    },
    deleted: {
      durableOrphans:
        deleted.durable,
      abandonedStaging:
        deleted.staging,
      total:
        deleted.durable +
        deleted.staging,
    },
  }
}
