import {
  readFileSync,
} from "node:fs"

import {
  describe,
  expect,
  it,
} from "vitest"

const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf8",
  )

function functionSlice(
  startMarker: string,
  endMarker: string,
): string {
  const start =
    core.indexOf(
      startMarker,
    )

  expect(start).toBeGreaterThan(
    -1,
  )

  const end =
    core.indexOf(
      endMarker,
      start +
        startMarker.length,
    )

  expect(end).toBeGreaterThan(
    start,
  )

  return core.slice(
    start,
    end,
  )
}

describe(
  "MIRAVA private identity DTO boundary",
  () => {
    it(
      "keeps semantic morphology, face geometry and physical traits out of the public identity profile",
      () => {
        const publicProfile =
          functionSlice(
            "export async function getIdentityProfilePublic(",
            "export async function replaceIdentityProfile(",
          )

        expect(
          publicProfile,
        ).not.toContain(
          "identityMorphology",
        )

        expect(
          publicProfile,
        ).not.toContain(
          "faceGeometry:",
        )

        expect(
          publicProfile,
        ).not.toContain(
          "physicalTraits",
        )
      },
    )

    it(
      "returns only bounded identity preview fields",
      () => {
        const publicProfile =
          functionSlice(
            "export async function getIdentityProfilePublic(",
            "export async function replaceIdentityProfile(",
          )

        expect(
          publicProfile,
        ).toContain(
          "id: asset.id",
        )

        expect(
          publicProfile,
        ).toContain(
          "url: data.signedUrl",
        )

        expect(
          publicProfile,
        ).toContain(
          "createdAt:",
        )

        expect(
          publicProfile,
        ).toContain(
          "viewKey:",
        )

        expect(
          publicProfile,
        ).not.toContain(
          "storagePath:",
        )

        expect(
          publicProfile,
        ).not.toContain(
          "mimeType:",
        )

        expect(
          publicProfile,
        ).not.toContain(
          "bytes:",
        )
      },
    )

    it(
      "does not expose private identity records through the creation detail DTO",
      () => {
        const dto =
          functionSlice(
            "export async function studioCreationDTO(",
            "export async function deleteStudioCreation(",
          )

        expect(
          dto,
        ).not.toContain(
          "identityMorphology",
        )

        expect(
          dto,
        ).not.toContain(
          "faceGeometry",
        )

        expect(
          dto,
        ).not.toContain(
          "physicalTraits",
        )

        expect(
          dto,
        ).not.toContain(
          "identityProfileRecord",
        )
      },
    )

    it(
      "exposes only bounded creation asset metadata",
      () => {
        const dto =
          functionSlice(
            "export async function studioCreationDTO(",
            "export async function deleteStudioCreation(",
          )

        const publicAssetsStart =
          dto.indexOf(
            "assets:",
          )

        expect(
          publicAssetsStart,
        ).toBeGreaterThan(
          -1,
        )

        const publicAssets =
          dto.slice(
            publicAssetsStart,
          )

        expect(
          publicAssets,
        ).toContain(
          "id: asset.id",
        )

        expect(
          publicAssets,
        ).toContain(
          "kind: asset.kind",
        )

        expect(
          publicAssets,
        ).toContain(
          "createdAt:",
        )

        expect(
          publicAssets,
        ).not.toContain(
          "storagePath:",
        )

        expect(
          publicAssets,
        ).not.toContain(
          "mimeType:",
        )

        expect(
          publicAssets,
        ).not.toContain(
          "bytes:",
        )
      },
    )

    it(
      "keeps the public Studio profile serializer free of private prompts and identity material",
      () => {
        const publicStudioProfile =
          functionSlice(
            "export function studioProfilePublic(",
            "export async function listStudioProfiles(",
          )

        expect(
          publicStudioProfile,
        ).not.toContain(
          "masterPrompt:",
        )

        expect(
          publicStudioProfile,
        ).not.toContain(
          "negativePrompt:",
        )

        expect(
          publicStudioProfile,
        ).not.toContain(
          "identityMorphology",
        )

        expect(
          publicStudioProfile,
        ).not.toContain(
          "faceGeometry",
        )

        expect(
          publicStudioProfile,
        ).not.toContain(
          "physicalTraits",
        )
      },
    )

    it(
      "keeps private identity fields server-internal even though they remain available for generation",
      () => {
        /*
         * These fields must exist somewhere in core because
         * generation legitimately consumes them. The
         * previous tests prove that they are absent from the
         * public serializers rather than merely absent from
         * the entire implementation.
         */
        expect(core).toContain(
          "identityMorphology",
        )

        expect(core).toContain(
          "faceGeometry",
        )

        expect(core).toContain(
          "physicalTraits",
        )
      },
    )
  },
)
