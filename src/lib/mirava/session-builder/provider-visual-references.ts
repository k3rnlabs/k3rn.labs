export type MiravaSessionProviderReferenceRole =
  | "WARDROBE"
  | "ART_DIRECTION"

export type MiravaSessionLookProviderAsset = Readonly<{
  id: string
  storagePath: string
  mimeType: string
  viewKey: string | null
  createdAt: Date | string
}>

export type MiravaSessionLookProviderItem = Readonly<{
  position: number
  assets: readonly MiravaSessionLookProviderAsset[]
}>

export type MiravaSessionProviderReference = Readonly<{
  id: string
  storagePath: string
  mimeType: string
  role: MiravaSessionProviderReferenceRole
}>

export type MiravaSessionProviderImageInput =
  MiravaSessionProviderReference &
  Readonly<{
    fileName: string
  }>

export const MIRAVA_SESSION_PROVIDER_REFERENCE_LIMIT = 4

const VIEW_PRIORITY: Record<string, number> = {
  FRONT: 0,
  PRODUCT: 1,
  SIDE: 2,
  BACK: 3,
  DETAIL: 4,
  UNKNOWN: 5,
}

function dateValue(value: Date | string): number {
  return new Date(value).getTime()
}

function compareAssets(
  left: MiravaSessionLookProviderAsset,
  right: MiravaSessionLookProviderAsset,
): number {
  return (VIEW_PRIORITY[left.viewKey ?? "UNKNOWN"] ?? VIEW_PRIORITY.UNKNOWN) - (VIEW_PRIORITY[right.viewKey ?? "UNKNOWN"] ?? VIEW_PRIORITY.UNKNOWN)
    || dateValue(left.createdAt) - dateValue(right.createdAt)
    || left.id.localeCompare(right.id)
}

function asReference(
  asset: MiravaSessionLookProviderAsset,
  role: MiravaSessionProviderReferenceRole,
): MiravaSessionProviderReference {
  return {
    id: asset.id,
    storagePath: asset.storagePath,
    mimeType: asset.mimeType,
    role,
  }
}

/**
 * Selects a stable, useful visual set for every shot in a Builder session.
 * First pass covers each garment; later passes add its remaining useful views.
 */
export function selectMiravaCustomLookProviderReferences(args: {
  lookItems: readonly MiravaSessionLookProviderItem[]
  limit?: number
}): MiravaSessionProviderReference[] {
  const limit = args.limit ?? MIRAVA_SESSION_PROVIDER_REFERENCE_LIMIT
  const perItem = [...args.lookItems]
    .sort((left, right) => left.position - right.position)
    .map((item) => [...item.assets].sort(compareAssets))

  const selected: MiravaSessionProviderReference[] = []
  for (let assetIndex = 0; selected.length < limit; assetIndex += 1) {
    let found = false
    for (const assets of perItem) {
      const asset = assets[assetIndex]
      if (!asset) continue
      selected.push(asReference(asset, "WARDROBE"))
      found = true
      if (selected.length === limit) break
    }
    if (!found) break
  }
  return selected
}

export function selectMiravaReferenceLookProviderReferences(args: {
  assets: readonly MiravaSessionLookProviderAsset[]
}): MiravaSessionProviderReference[] {
  const asset = [...args.assets].sort(compareAssets)[0]
  return asset ? [asReference(asset, "ART_DIRECTION")] : []
}

/** The provider boundary receives private storage paths, never signed client URLs. */
export function buildMiravaSessionProviderImageInputs(
  references: readonly MiravaSessionProviderReference[],
): MiravaSessionProviderImageInput[] {
  return references.map((reference) => ({
    ...reference,
    fileName: `${reference.role === "WARDROBE" ? "wardrobe" : "art-direction"}-${reference.id}`,
  }))
}
