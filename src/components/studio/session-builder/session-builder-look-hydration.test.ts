import {
  readFileSync,
} from "node:fs"

import {
  describe,
  expect,
  it,
} from "vitest"

const store =
  readFileSync(
    "src/lib/mirava/session-builder/session-store.ts",
    "utf8",
  )

const client =
  readFileSync(
    "src/lib/mirava/session-builder/session-builder.client.ts",
    "utf8",
  )

const flow =
  readFileSync(
    "src/components/studio/session-builder/session-builder-flow.tsx",
    "utf8",
  )

describe(
  "MIRAVA resumed custom look hydration",
  () => {
    it(
      "publishes safe persisted look metadata without storage paths",
      () => {
        expect(
          store,
        ).toContain(
          "readPublicLookItems",
        )

        expect(
          store,
        ).toContain(
          "mimeType: true",
        )

        expect(
          store,
        ).toContain(
          "bytes: true",
        )

        expect(
          store,
        ).toContain(
          "viewKey: true",
        )

        const publicMapperStart =
          store.indexOf(
            "function readPublicLookItems",
          )

        const publicMapperEnd =
          store.indexOf(
            "function toPublicSession",
            publicMapperStart,
          )

        const publicMapper =
          store.slice(
            publicMapperStart,
            publicMapperEnd,
          )

        expect(
          publicMapper,
        ).toContain(
          "asset.storagePath",
        )

        expect(
          publicMapper,
        ).toContain(
          "createMiravaSessionLookPreviewUrl",
        )

        expect(
          publicMapper,
        ).toContain(
          "url:",
        )

        expect(
          publicMapper,
        ).not.toContain(
          "storagePath:",
        )
      },
    )

    it(
      "parses persisted look items on the client",
      () => {
        expect(
          client,
        ).toContain(
          "parseMiravaSessionLookItems",
        )

        expect(
          client,
        ).toContain(
          "lookItems:",
        )
      },
    )

    it(
      "hydrates both Look and Review from the resumed session",
      () => {
        expect(
          flow,
        ).toContain(
          "initialLookItems={",
        )

        expect(
          flow,
        ).toContain(
          "session.lookItems ??",
        )

        expect(
          flow,
        ).toContain(
          "lookItems={",
        )
      },
    )
  },
)
