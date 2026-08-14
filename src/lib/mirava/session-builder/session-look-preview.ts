export const MIRAVA_SESSION_LOOK_PREVIEW_TTL_SECONDS =
  600

const MIRAVA_SESSION_LOOK_PREVIEW_BUCKET =
  process.env
    .SUPABASE_STORAGE_VISUAL_ENGINE_BUCKET ??
  "visual-engine-private"

function isSafeSignedPreviewUrl(
  value: unknown,
): value is string {
  if (
    typeof value !==
      "string" ||
    value.length < 1
  ) {
    return false
  }

  try {
    const parsed =
      new URL(value)

    return (
      parsed.protocol ===
        "https:" ||
      parsed.protocol ===
        "http:"
    )
  } catch {
    return false
  }
}

export async function createMiravaSessionLookPreviewUrl(
  storagePath:
    | string
    | null
    | undefined,
): Promise<string | null> {
  if (
    typeof storagePath !==
      "string" ||
    storagePath.trim().length <
      1
  ) {
    return null
  }

  try {
    const {
      supabaseAdmin,
    } =
      await import(
        "@/lib/supabase-admin"
      )

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .storage
        .from(
          MIRAVA_SESSION_LOOK_PREVIEW_BUCKET,
        )
        .createSignedUrl(
          storagePath,
          MIRAVA_SESSION_LOOK_PREVIEW_TTL_SECONDS,
        )

    if (
      error ||
      !isSafeSignedPreviewUrl(
        data?.signedUrl,
      )
    ) {
      return null
    }

    return data.signedUrl
  } catch {
    return null
  }
}
