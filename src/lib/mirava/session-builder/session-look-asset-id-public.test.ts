import {
  readFileSync,
} from "node:fs"

import {
  describe,
  expect,
  it,
} from "vitest"

import {
  parseMiravaSessionBuilderClientSession,
} from "./session-builder.client"

import {
  createDefaultMiravaSessionBuilderDraft,
} from "./schema"

const storeSource =
  readFileSync(
    "src/lib/mirava/session-builder/session-store.ts",
    "utf8",
  )

const uploadClientSource =
  readFileSync(
    "src/lib/mirava/session-builder/session-look-upload.client.ts",
    "utf8",
  )

const parserSource =
  readFileSync(
    "src/lib/mirava/session-builder/session-builder.client.ts",
    "utf8",
  )

function payload(
  asset:
    Record<string, unknown>,
) {
  return {
    id:
      "session-1",
    identityProfileId:
      null,
    config: {
      ...createDefaultMiravaSessionBuilderDraft(),
      lookMode:
        "CUSTOM" as const,
    },
    lookItemCount: 1,
    lookItems: [
      {
        id:
          "look-1",
        category:
          "TOP",
        label:
          "Chemise",
        brand:
          null,
        description:
          null,
        position: 0,
        assets: [
          asset,
        ],
      },
    ],
    configurationReady:
      false,
    createdAt:
      "2026-08-11T00:00:00.000Z",
    updatedAt:
      "2026-08-11T00:00:00.000Z",
  }
}

describe(
  "MIRAVA persisted look asset public id",
  () => {
    it(
      "selects the durable asset id on every persisted session read",
      () => {
        expect(
          (
            storeSource.match(
              /id:\s*true,\s*storagePath:\s*true/g,
            ) ?? []
          ).length,
        ).toBe(
          3,
        )

        expect(
          storeSource,
        ).toMatch(
          /return\s*\{\s*id:\s*asset\.id,\s*mimeType:/,
        )
      },
    )

    it(
      "preserves the durable asset id in the client session",
      () => {
        const parsed =
          parseMiravaSessionBuilderClientSession(
            payload({
              id:
                "asset-1",
              mimeType:
                "image/jpeg",
              bytes:
                2048,
              viewKey:
                "FRONT",
              url:
                "https://mirava.test/signed-preview",
            }),
          )

        expect(
          parsed
            .lookItems?.[0]
            ?.assets[0]
            ?.id,
        ).toBe(
          "asset-1",
        )
      },
    )

    it(
      "rejects a persisted session asset without a durable id",
      () => {
        expect(
          () =>
            parseMiravaSessionBuilderClientSession(
              payload({
                mimeType:
                  "image/jpeg",
                bytes:
                  2048,
                viewKey:
                  "FRONT",
                url:
                  null,
              }),
            ),
        ).toThrow(
          "MIRAVA_SESSION_CLIENT_INVALID_RESPONSE",
        )
      },
    )

    it(
      "keeps storagePath private and actively rejects any leaked path",
      () => {
        expect(
          uploadClientSource,
        ).not.toContain(
          "storagePath",
        )

        expect(
          parserSource,
        ).toContain(
          '"storagePath" in',
        )

        expect(
          () =>
            parseMiravaSessionBuilderClientSession(
              payload({
                id:
                  "asset-1",
                storagePath:
                  "private/forbidden.jpg",
                mimeType:
                  "image/jpeg",
                bytes:
                  2048,
                viewKey:
                  "FRONT",
                url:
                  null,
              }),
            ),
        ).toThrow(
          "MIRAVA_SESSION_CLIENT_INVALID_RESPONSE",
        )
      },
    )
  },
)
