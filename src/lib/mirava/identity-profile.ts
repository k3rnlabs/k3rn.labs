export const MIRAVA_MIN_IDENTITY_PHOTOS = 3
export const MIRAVA_RECOMMENDED_IDENTITY_PHOTOS = 4
export const MIRAVA_MAX_IDENTITY_PHOTOS = 10

export function isMiravaIdentityProfileReady(profile: { assetCount: number } | null | undefined) {
  return Boolean(profile && profile.assetCount >= MIRAVA_MIN_IDENTITY_PHOTOS)
}
