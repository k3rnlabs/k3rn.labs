"use client"

const DATABASE_NAME =
  "mirava-studio-private-drafts"
const DATABASE_VERSION = 1
const STORE_NAME = "identity-drafts"
const DRAFT_MAX_AGE_MS =
  24 * 60 * 60 * 1000

type StoredDraft<T> = {
  key: string
  payload: T
  updatedAt: number
}

function openDraftDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error(
          "MIRAVA_INDEXED_DB_UNAVAILABLE",
        ),
      )
      return
    }

    const request = indexedDB.open(
      DATABASE_NAME,
      DATABASE_VERSION,
    )

    request.onupgradeneeded = () => {
      const database = request.result

      if (
        !database.objectStoreNames.contains(
          STORE_NAME,
        )
      ) {
        database.createObjectStore(
          STORE_NAME,
          {
            keyPath: "key",
          },
        )
      }
    }

    request.onsuccess = () =>
      resolve(request.result)

    request.onerror = () =>
      reject(request.error)
  })
}

export async function readMiravaIdentityDraft<T>(
  key: string,
): Promise<T | null> {
  try {
    const database = await openDraftDatabase()

    const record = await new Promise<
      StoredDraft<T> | undefined
    >((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readonly",
      )
      const request = transaction
        .objectStore(STORE_NAME)
        .get(key)

      request.onsuccess = () =>
        resolve(
          request.result as
            | StoredDraft<T>
            | undefined,
        )

      request.onerror = () =>
        reject(request.error)
    })

    database.close()

    if (!record) return null

    if (
      Date.now() - record.updatedAt >
      DRAFT_MAX_AGE_MS
    ) {
      await clearMiravaIdentityDraft(key)
      return null
    }

    return record.payload
  } catch {
    return null
  }
}

export async function writeMiravaIdentityDraft<T>(
  key: string,
  payload: T,
): Promise<void> {
  try {
    const database = await openDraftDatabase()

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite",
      )

      transaction
        .objectStore(STORE_NAME)
        .put({
          key,
          payload,
          updatedAt: Date.now(),
        } satisfies StoredDraft<T>)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(transaction.error)
      transaction.onabort = () =>
        reject(transaction.error)
    })

    database.close()
  } catch {
    // IndexedDB est une amélioration de résilience.
    // L’état React reste disponible si le stockage local
    // est indisponible ou si le quota Safari est atteint.
  }
}

export async function clearMiravaIdentityDraft(
  key: string,
): Promise<void> {
  try {
    const database = await openDraftDatabase()

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        STORE_NAME,
        "readwrite",
      )

      transaction
        .objectStore(STORE_NAME)
        .delete(key)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () =>
        reject(transaction.error)
      transaction.onabort = () =>
        reject(transaction.error)
    })

    database.close()
  } catch {
    // Le profil serveur est déjà la source de vérité.
  }
}
