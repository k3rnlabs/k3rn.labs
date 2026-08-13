import {
  createHash,
} from "crypto"

export const MIRAVA_IDENTITY_MANIFEST_SCHEMA =
  "mirava-identity-manifest/v1" as const

export type MiravaIdentityManifestAsset = {
  assetId: string
  viewKey: string
  mimeType: string
  bytes: number
  contentSha256: string
  faceGeometrySha256: string
}

export type MiravaIdentityManifest = {
  schemaVersion:
    typeof MIRAVA_IDENTITY_MANIFEST_SCHEMA
  versionHash: string
  assets:
    MiravaIdentityManifestAsset[]
}

function stableJson(
  value: unknown,
): string {
  if (value === undefined) {
    throw new Error(
      "MIRAVA identity manifest cannot canonicalize undefined values.",
    )
  }

  if (
    value === null ||
    typeof value !== "object"
  ) {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return (
      "[" +
      value.map(stableJson)
        .join(",") +
      "]"
    )
  }

  const record =
    value as Record<
      string,
      unknown
    >

  return (
    "{" +
    Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableJson(record[key])}`,
      )
      .join(",") +
    "}"
  )
}

function sha256(
  value: Buffer | string,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex")
}

export function buildMiravaIdentityManifest(
  inputs: Array<{
    assetId: string
    viewKey: string
    mimeType: string
    faceGeometry: unknown
    buffer: Buffer
  }>,
): MiravaIdentityManifest {
  if (inputs.length < 3) {
    throw new Error(
      "MIRAVA identity manifest requires at least three canonical views.",
    )
  }

  const uniqueViews =
    new Set(
      inputs.map(
        (input) =>
          input.viewKey,
      ),
    )

  if (
    uniqueViews.size !==
    inputs.length
  ) {
    throw new Error(
      "MIRAVA identity manifest cannot contain duplicate view roles.",
    )
  }

  if (
    inputs.some(
      (input) =>
        !input.viewKey.trim(),
    )
  ) {
    throw new Error(
      "MIRAVA identity manifest requires an explicit role for every view.",
    )
  }

  const assets =
    inputs
      .map(
        (input): MiravaIdentityManifestAsset => ({
          assetId:
            input.assetId,
          viewKey:
            input.viewKey,
          mimeType:
            input.mimeType,
          bytes:
            input.buffer.length,
          contentSha256:
            sha256(
              input.buffer,
            ),
          faceGeometrySha256:
            sha256(
              stableJson(
                input.faceGeometry,
              ),
            ),
        }),
      )
      .sort(
        (left, right) =>
          `${left.viewKey}:${left.assetId}`
            .localeCompare(
              `${right.viewKey}:${right.assetId}`,
            ),
      )

  const versionHash =
    sha256(
      stableJson({
        schemaVersion:
          MIRAVA_IDENTITY_MANIFEST_SCHEMA,
        assets,
      }),
    )

  return {
    schemaVersion:
      MIRAVA_IDENTITY_MANIFEST_SCHEMA,
    versionHash,
    assets,
  }
}
