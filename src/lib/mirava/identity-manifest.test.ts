import {
  describe,
  expect,
  it,
} from "vitest"

import {
  buildMiravaIdentityManifest,
} from "./identity-manifest"

const front = {
  assetId: "asset-front",
  viewKey: "front",
  mimeType: "image/jpeg",
  faceGeometry: {
    boxTop: 0.1,
    boxLeft: 0.2,
  },
  buffer:
    Buffer.from("front"),
}

const angle = {
  assetId: "asset-angle",
  viewKey: "angle",
  mimeType: "image/jpeg",
  faceGeometry: {
    boxLeft: 0.22,
    boxTop: 0.12,
  },
  buffer:
    Buffer.from("angle"),
}

const profile = {
  assetId: "asset-profile",
  viewKey: "profile_right",
  mimeType: "image/jpeg",
  faceGeometry: {
    boxTop: 0.14,
    boxLeft: 0.24,
  },
  buffer:
    Buffer.from("profile"),
}

describe(
  "MIRAVA immutable identity manifest",
  () => {
    it(
      "is deterministic across input and geometry key order",
      () => {
        const first =
          buildMiravaIdentityManifest([
            front,
            angle,
            profile,
          ])
        const second =
          buildMiravaIdentityManifest([
            {
              ...profile,
              faceGeometry: {
                boxLeft: 0.24,
                boxTop: 0.14,
              },
            },
            angle,
            front,
          ])

        expect(
          second.versionHash,
        ).toBe(
          first.versionHash,
        )
      },
    )

    it(
      "changes version when identity pixels change",
      () => {
        const before =
          buildMiravaIdentityManifest([
            front,
            angle,
            profile,
          ])
        const after =
          buildMiravaIdentityManifest([
            {
              ...front,
              buffer:
                Buffer.from(
                  "different-front",
                ),
            },
            angle,
            profile,
          ])

        expect(
          after.versionHash,
        ).not.toBe(
          before.versionHash,
        )
      },
    )

    it(
      "persists hashes and metadata but never buffers or storage paths",
      () => {
        const manifest =
          buildMiravaIdentityManifest([
            front,
            angle,
            profile,
          ])
        const serialized =
          JSON.stringify(manifest)

        expect(serialized)
          .not.toContain("storagePath")
        expect(serialized)
          .not.toContain("\"buffer\"")
        expect(
          manifest.assets,
        ).toHaveLength(3)
        expect(
          manifest.assets[0]
            .contentSha256,
        ).toMatch(
          /^[a-f0-9]{64}$/,
        )
      },
    )

    it(
      "rejects duplicate canonical roles",
      () => {
        expect(() =>
          buildMiravaIdentityManifest([
            front,
            {
              ...angle,
              viewKey: "front",
            },
            profile,
          ]),
        ).toThrow(
          "duplicate view roles",
        )
      },
    )

    it(
      "rejects missing roles and undefined geometry",
      () => {
        expect(() =>
          buildMiravaIdentityManifest([
            front,
            {
              ...angle,
              viewKey: "",
            },
            profile,
          ]),
        ).toThrow(
          "explicit role",
        )

        expect(() =>
          buildMiravaIdentityManifest([
            front,
            {
              ...angle,
              faceGeometry:
                undefined,
            },
            profile,
          ]),
        ).toThrow(
          "undefined values",
        )
      },
    )
  },
)
