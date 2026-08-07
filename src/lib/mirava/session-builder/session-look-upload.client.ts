"use client"

import {
  createClient,
} from "@supabase/supabase-js"

import {
  MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM,
  type MiravaSessionLookCategory,
  type MiravaSessionLookViewKey,
} from "./look"

type Locale =
  | "fr"
  | "es"

const SUPPORTED_MIME_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ])

type SignedUpload = {
  path: string
  token: string
  mimeType: string
  bytes: number
}

type UploadSessionResponse = {
  batchId?: string
  bucket?: string
  uploads?: SignedUpload[]
  error?: string
  message?: string
}

export type MiravaSessionLookClientItem = {
  id: string
  category:
    MiravaSessionLookCategory
  label: string | null
  brand: string | null
  description: string | null
  position: number
  assets: Array<{
    mimeType: string
    bytes: number
    viewKey:
      MiravaSessionLookViewKey
  }>
}

export type MiravaSessionLookClientSession = {
  id: string
  identityProfileId:
    | string
    | null
  lookItemCount: number
  configurationReady: boolean
  config: {
    version: number
    mode: string
    setPresetId:
      | string
      | null
    lightingPresetId:
      | string
      | null
    shotCount: number
    lookMode: string
  }
  createdAt: string
  updatedAt: string
}

type FinalizeResponse = {
  lookItem?:
    MiravaSessionLookClientItem
  session?:
    MiravaSessionLookClientSession
  error?: string
  message?: string
}

export type MiravaSessionLookUploadFile = {
  file: File
  viewKey?:
    MiravaSessionLookViewKey
}

export type MiravaSessionLookUploadInput = {
  category:
    MiravaSessionLookCategory
  label?: string
  brand?: string
  description?: string
  files:
    MiravaSessionLookUploadFile[]
}

export type MiravaSessionLookUploadReceipt = {
  lookItem:
    MiravaSessionLookClientItem
  session:
    MiravaSessionLookClientSession
}

function localizedMessage(
  locale: Locale,
  fr: string,
  es: string,
): string {
  return locale === "fr"
    ? fr
    : es
}

function sessionLookEndpoint(
  sessionId: string,
  suffix = "",
): string {
  return (
    "/api/visual-engine/sessions/" +
    `${encodeURIComponent(sessionId)}` +
    `/look${suffix}`
  )
}

function createSignedUploadClient() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL

  const supabaseAnonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    throw new Error(
      "MIRAVA_STORAGE_CLIENT_NOT_CONFIGURED",
    )
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession:
          false,
        autoRefreshToken:
          false,
        detectSessionInUrl:
          false,
      },
    },
  )
}

async function abortLookUploadSession(
  sessionId: string,
  batchId: string,
  paths: string[],
): Promise<void> {
  await fetch(
    sessionLookEndpoint(
      sessionId,
      "/upload-session",
    ),
    {
      method:
        "DELETE",
      headers: {
        "Content-Type":
          "application/json",
      },
      body:
        JSON.stringify({
          batchId,
          paths,
        }),
    },
  ).catch(
    () => undefined,
  )
}

function validateFiles(
  files:
    MiravaSessionLookUploadFile[],
): void {
  if (
    files.length < 1 ||
    files.length >
      MIRAVA_SESSION_LOOK_MAX_ASSETS_PER_ITEM
  ) {
    throw new Error(
      "MIRAVA_LOOK_INVALID_FILE_COUNT",
    )
  }

  for (const item of files) {
    if (
      !item?.file ||
      !SUPPORTED_MIME_TYPES.has(
        item.file.type,
      ) ||
      !Number.isFinite(
        item.file.size,
      ) ||
      item.file.size <= 0
    ) {
      throw new Error(
        "MIRAVA_LOOK_INVALID_FILE",
      )
    }
  }
}

export async function uploadMiravaSessionLookItem({
  sessionId,
  item,
  locale,
}: {
  sessionId: string
  item:
    MiravaSessionLookUploadInput
  locale: Locale
}): Promise<
  MiravaSessionLookUploadReceipt
> {
  if (
    typeof sessionId !==
      "string" ||
    sessionId.trim().length < 1
  ) {
    throw new Error(
      "MIRAVA_LOOK_INVALID_SESSION",
    )
  }

  validateFiles(
    item.files,
  )

  const uploadSessionResponse =
    await fetch(
      sessionLookEndpoint(
        sessionId,
        "/upload-session",
      ),
      {
        method:
          "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify({
            files:
              item.files.map(
                ({ file }) => ({
                  mimeType:
                    file.type,
                  bytes:
                    file.size,
                }),
              ),
          }),
      },
    )

  const uploadSession =
    await uploadSessionResponse
      .json()
      .catch(
        () => null,
      ) as
        | UploadSessionResponse
        | null

  if (
    !uploadSessionResponse.ok ||
    !uploadSession?.batchId ||
    !uploadSession.bucket ||
    !Array.isArray(
      uploadSession.uploads,
    ) ||
    uploadSession.uploads.length !==
      item.files.length ||
    uploadSession.uploads.some(
      (upload) =>
        typeof upload.path !==
          "string" ||
        upload.path.length < 1 ||
        typeof upload.token !==
          "string" ||
        upload.token.length < 1,
    )
  ) {
    throw new Error(
      uploadSession?.error ??
      uploadSession?.message ??
      localizedMessage(
        locale,
        "MIRAVA n’a pas pu préparer le stockage privé de ce look.",
        "MIRAVA no pudo preparar el almacenamiento privado de este look.",
      ),
    )
  }

  const batchId =
    uploadSession.batchId

  const uploads =
    uploadSession.uploads

  const stagedPaths =
    uploads.map(
      (upload) =>
        upload.path,
    )

  try {
    const storage =
      createSignedUploadClient()

    for (
      let index = 0;
      index <
      item.files.length;
      index += 1
    ) {
      const source =
        item.files[index]

      const upload =
        uploads[index]

      const {
        error,
      } =
        await storage
          .storage
          .from(
            uploadSession.bucket,
          )
          .uploadToSignedUrl(
            upload.path,
            upload.token,
            source.file,
            {
              contentType:
                source.file.type,
              cacheControl:
                "0",
            },
          )

      if (error) {
        throw new Error(
          "MIRAVA_SIGNED_LOOK_UPLOAD_FAILED",
        )
      }
    }

    const finalizeResponse =
      await fetch(
        sessionLookEndpoint(
          sessionId,
        ),
        {
          method:
            "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              batchId,
              item: {
                category:
                  item.category,
                label:
                  item.label,
                brand:
                  item.brand,
                description:
                  item.description,
                uploads:
                  uploads.map(
                    (
                      upload,
                      index,
                    ) => ({
                      path:
                        upload.path,
                      mimeType:
                        item.files[
                          index
                        ].file.type,
                      bytes:
                        item.files[
                          index
                        ].file.size,
                      viewKey:
                        item.files[
                          index
                        ].viewKey ??
                        "UNKNOWN",
                    }),
                  ),
              },
            }),
        },
      )

    const finalized =
      await finalizeResponse
        .json()
        .catch(
          () => null,
        ) as
          | FinalizeResponse
          | null

    if (
      !finalizeResponse.ok ||
      !finalized?.lookItem?.id ||
      !finalized.session?.id
    ) {
      throw new Error(
        finalized?.error ??
        finalized?.message ??
        localizedMessage(
          locale,
          "Le look MIRAVA n’a pas pu être finalisé.",
          "No se pudo finalizar el look de MIRAVA.",
        ),
      )
    }

    return {
      lookItem:
        finalized.lookItem,
      session:
        finalized.session,
    }
  } catch (error) {
    await abortLookUploadSession(
      sessionId,
      batchId,
      stagedPaths,
    )

    if (
      error instanceof Error &&
      !error.message.startsWith(
        "MIRAVA_",
      )
    ) {
      throw error
    }

    throw new Error(
      localizedMessage(
        locale,
        "L’envoi privé du look a échoué. Vérifiez votre connexion puis réessayez.",
        "Falló el envío privado del look. Comprueba tu conexión e inténtalo de nuevo.",
      ),
    )
  }
}
