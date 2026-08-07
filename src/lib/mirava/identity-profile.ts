export const MIRAVA_MIN_IDENTITY_PHOTOS = 3
export const MIRAVA_RECOMMENDED_IDENTITY_PHOTOS = 4
export const MIRAVA_MAX_IDENTITY_PHOTOS = 10

export const MIRAVA_IDENTITY_VIEW_KEYS = [
  "front",
  "angle",
  "profile_right",
  "smile",
  "body",
  "tattoos",
] as const

export type MiravaIdentityViewKey =
  typeof MIRAVA_IDENTITY_VIEW_KEYS[number]

export const MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS = [
  "front",
  "angle",
  "profile_right",
] as const satisfies readonly MiravaIdentityViewKey[]

export function isMiravaIdentityViewKey(
  value: unknown,
): value is MiravaIdentityViewKey {
  return (
    typeof value === "string" &&
    (
      MIRAVA_IDENTITY_VIEW_KEYS as
        readonly string[]
    ).includes(value)
  )
}

export function miravaLegacyIdentityViewKey(
  index: number,
): MiravaIdentityViewKey {
  const safeIndex = Math.max(
    0,
    Math.min(
      MIRAVA_IDENTITY_VIEW_KEYS.length - 1,
      index,
    ),
  )

  return MIRAVA_IDENTITY_VIEW_KEYS[
    safeIndex
  ]
}

export function isMiravaIdentityProfileReady(
  profile:
    | { assetCount: number }
    | null
    | undefined,
) {
  return Boolean(
    profile &&
      profile.assetCount >=
        MIRAVA_MIN_IDENTITY_PHOTOS,
  )
}
