"use client"

import { createClient } from "@supabase/supabase-js"

export type MiravaIdentityUploadConsent = {
  ageConfirmed: boolean
  rightsConfirmed: boolean
  retentionAccepted: boolean
  privacyAccepted: boolean
  openaiDisclosureAccepted: boolean
}

export type MiravaIdentityProfileReceipt = {
  id: string
  assetCount: number
  updatedAt: string
}

type Locale = "fr" | "es"

type UploadSessionItem = {
  path: string
  token: string
  mimeType: string
  bytes: number
}

type UploadSessionResponse = {
  batchId?: string
  bucket?: string
  uploads?: UploadSessionItem[]
  error?: string
}

type FinalizeResponse = {
  profile?: MiravaIdentityProfileReceipt
  error?: string
  message?: string
}

const MEGABYTE = 1024 * 1024

export const MIRAVA_IDENTITY_MASTER_MAX_LONG_EDGE = 4096
export const MIRAVA_IDENTITY_MASTER_MAX_BYTES =
  9 * MEGABYTE
export const MIRAVA_IDENTITY_MASTER_MIN_QUALITY = 0.92

const QUALITY_STEPS = [
  0.97,
  0.96,
  0.95,
  0.94,
  0.93,
  MIRAVA_IDENTITY_MASTER_MIN_QUALITY,
] as const

const LONG_EDGE_STEPS = [
  MIRAVA_IDENTITY_MASTER_MAX_LONG_EDGE,
  3584,
  3072,
] as const

type DecodedImage = {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

function message(
  locale: Locale,
  fr: string,
  es: string,
): string {
  return locale === "fr" ? fr : es
}

async function decodeIdentityImage(
  file: File,
): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(
        file,
        {
          imageOrientation: "from-image",
        } as ImageBitmapOptions,
      )

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // Safari peut refuser createImageBitmap pour certains JPEG.
      // Le fallback HTMLImageElement conserve le parcours disponible.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = "async"

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () =>
      reject(
        new Error(
          "MIRAVA_IDENTITY_IMAGE_DECODE_FAILED",
        ),
      )
    image.src = objectUrl
  })

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    release: () => URL.revokeObjectURL(objectUrl),
  }
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(
              "MIRAVA_IDENTITY_IMAGE_ENCODING_FAILED",
            ),
          )
          return
        }

        resolve(blob)
      },
      "image/jpeg",
      quality,
    )
  })
}

function identityMasterName(
  file: File,
  index: number,
): string {
  const base =
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `identity-${index + 1}`

  return `${base}-mirava-master.jpg`
}

/**
 * Crée un master identité privé.
 *
 * - aucune retouche esthétique ;
 * - aucune interpolation supérieure à la source ;
 * - bord long maximum de 4096 px ;
 * - JPEG entre 92 % et 97 % ;
 * - suppression naturelle des métadonnées EXIF/GPS ;
 * - conservation des pores, tatouages, cheveux et détails utiles.
 */
export async function prepareMiravaIdentityMaster(
  file: File,
  index: number,
): Promise<File> {
  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type)
  ) {
    throw new Error(
      "MIRAVA_IDENTITY_UNSUPPORTED_IMAGE",
    )
  }

  const decoded = await decodeIdentityImage(file)
  let lastBlob: Blob | null = null

  try {
    const originalLongEdge = Math.max(
      decoded.width,
      decoded.height,
    )

    const uniqueTargetEdges = Array.from(
      new Set(
        LONG_EDGE_STEPS.map((edge) =>
          Math.min(originalLongEdge, edge),
        ),
      ),
    )

    for (const targetLongEdge of uniqueTargetEdges) {
      const scale = Math.min(
        1,
        targetLongEdge / originalLongEdge,
      )

      const width = Math.max(
        1,
        Math.round(decoded.width * scale),
      )
      const height = Math.max(
        1,
        Math.round(decoded.height * scale),
      )

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext("2d", {
        alpha: false,
        colorSpace: "srgb",
      })

      if (!context) {
        throw new Error(
          "MIRAVA_IDENTITY_CANVAS_UNAVAILABLE",
        )
      }

      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = "high"
      context.drawImage(
        decoded.source,
        0,
        0,
        width,
        height,
      )

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToJpeg(
          canvas,
          quality,
        )

        lastBlob = blob

        if (
          blob.size <=
          MIRAVA_IDENTITY_MASTER_MAX_BYTES
        ) {
          canvas.width = 1
          canvas.height = 1

          return new File(
            [blob],
            identityMasterName(file, index),
            {
              type: "image/jpeg",
              lastModified:
                file.lastModified || Date.now(),
            },
          )
        }
      }

      canvas.width = 1
      canvas.height = 1
    }
  } finally {
    decoded.release()
  }

  if (
    !lastBlob ||
    lastBlob.size >
      MIRAVA_IDENTITY_MASTER_MAX_BYTES
  ) {
    throw new Error(
      "MIRAVA_IDENTITY_MASTER_TOO_LARGE",
    )
  }

  return new File(
    [lastBlob],
    identityMasterName(file, index),
    {
      type: "image/jpeg",
      lastModified:
        file.lastModified || Date.now(),
    },
  )
}

function createSignedUploadClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "MIRAVA_STORAGE_CLIENT_NOT_CONFIGURED",
    )
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
}

async function abortUploadSession(
  batchId: string,
  paths: string[],
): Promise<void> {
  await fetch(
    "/api/visual-engine/identity-profile/upload-session",
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        batchId,
        paths,
      }),
    },
  ).catch(() => undefined)
}

export async function uploadMiravaIdentityProfile({
  files,
  consent,
  locale,
}: {
  files: File[]
  consent: MiravaIdentityUploadConsent
  locale: Locale
}): Promise<MiravaIdentityProfileReceipt> {
  const masters: File[] = []

  for (let index = 0; index < files.length; index += 1) {
    try {
      masters.push(
        await prepareMiravaIdentityMaster(
          files[index],
          index,
        ),
      )
    } catch {
      throw new Error(
        message(
          locale,
          "Une photo n’a pas pu être préparée en haute qualité. Remplacez-la puis réessayez.",
          "No se pudo preparar una foto en alta calidad. Sustitúyela e inténtalo de nuevo.",
        ),
      )
    }
  }

  const sessionResponse = await fetch(
    "/api/visual-engine/identity-profile/upload-session",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: masters.map((file) => ({
          mimeType: file.type,
          bytes: file.size,
        })),
      }),
    },
  )

  const sessionData = await sessionResponse
    .json()
    .catch(() => null) as
      | UploadSessionResponse
      | null

  if (
    !sessionResponse.ok ||
    !sessionData?.batchId ||
    !sessionData.bucket ||
    !Array.isArray(sessionData.uploads) ||
    sessionData.uploads.length !== masters.length
  ) {
    throw new Error(
      sessionData?.error ??
        message(
          locale,
          "MIRAVA n’a pas pu préparer le stockage privé de vos photos.",
          "MIRAVA no pudo preparar el almacenamiento privado de tus fotos.",
        ),
    )
  }

  const batchId = sessionData.batchId
  const uploads = sessionData.uploads
  const paths = uploads.map((upload) => upload.path)

  try {
    const storage = createSignedUploadClient()

    for (let index = 0; index < masters.length; index += 1) {
      const master = masters[index]
      const upload = uploads[index]

      const { error } = await storage.storage
        .from(sessionData.bucket)
        .uploadToSignedUrl(
          upload.path,
          upload.token,
          master,
          {
            contentType: master.type,
            cacheControl: "0",
          },
        )

      if (error) {
        throw new Error(
          "MIRAVA_SIGNED_UPLOAD_FAILED",
        )
      }
    }

    const finalizeResponse = await fetch(
      "/api/visual-engine/identity-profile",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "replace-staged",
          batchId,
          uploads: uploads.map(
            (upload, index) => ({
              path: upload.path,
              mimeType: masters[index].type,
              bytes: masters[index].size,
            }),
          ),
          ageConfirmed: consent.ageConfirmed,
          rightsConfirmed:
            consent.rightsConfirmed,
          retentionAccepted:
            consent.retentionAccepted,
          privacyAccepted:
            consent.privacyAccepted,
          openaiDisclosureAccepted:
            consent.openaiDisclosureAccepted,
        }),
      },
    )

    const finalizeData = await finalizeResponse
      .json()
      .catch(() => null) as
        | FinalizeResponse
        | null

    if (
      !finalizeResponse.ok ||
      !finalizeData?.profile?.id
    ) {
      throw new Error(
        finalizeData?.error ??
          finalizeData?.message ??
          message(
            locale,
            "Le Profil Identité n’a pas pu être finalisé.",
            "No se pudo finalizar el Perfil de Identidad.",
          ),
      )
    }

    return finalizeData.profile
  } catch (error) {
    await abortUploadSession(batchId, paths)

    if (
      error instanceof Error &&
      !error.message.startsWith("MIRAVA_")
    ) {
      throw error
    }

    throw new Error(
      message(
        locale,
        "L’envoi privé d’une photo a échoué. Vérifiez votre connexion puis réessayez.",
        "Falló el envío privado de una foto. Comprueba tu conexión e inténtalo de nuevo.",
      ),
    )
  }
}
