import {
  readFileSync,
} from "node:fs"

import {
  describe,
  expect,
  it,
} from "vitest"

import {
  resolveMiravaCanonicalSessionLaunchCreations,
} from "./core"

const core =
  readFileSync(
    "src/lib/visual-engine/core.ts",
    "utf8",
  )

describe(
  "MIRAVA Session Builder launch canonical accounting",
  () => {
    it(
      "excludes continuation creations from already-launched accounting",
      () => {
        const creations = [
          ...Array.from(
            {
              length: 6,
            },
            (
              _,
              shotIndex,
            ) => ({
              id:
                `canonical-${shotIndex}`,
              shotIndex,
              parentCreationId:
                null,
            }),
          ),
          {
            id:
              "regen-1",
            shotIndex:
              6,
            parentCreationId:
              "canonical-1",
          },
          {
            id:
              "pose-2",
            shotIndex:
              7,
            parentCreationId:
              "canonical-2",
          },
        ]

        expect(
          resolveMiravaCanonicalSessionLaunchCreations(
            creations,
          ).map(
            (
              creation,
            ) =>
              creation.id,
          ),
        ).toEqual([
          "canonical-0",
          "canonical-1",
          "canonical-2",
          "canonical-3",
          "canonical-4",
          "canonical-5",
        ])
      },
    )

    it(
      "supports the full eight-shot canonical sequence",
      () => {
        const canonical =
          resolveMiravaCanonicalSessionLaunchCreations(
            Array.from(
              {
                length: 8,
              },
              (
                _,
                shotIndex,
              ) => ({
                id:
                  `canonical-${shotIndex}`,
                shotIndex,
                parentCreationId:
                  null,
              }),
            ),
          )

        expect(
          canonical,
        ).toHaveLength(
          8,
        )

        expect(
          canonical.map(
            (
              creation,
            ) =>
              creation.shotIndex,
          ),
        ).toEqual([
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
        ])
      },
    )

    it(
      "does not allow continuations to repair a missing canonical slot",
      () => {
        const canonical =
          resolveMiravaCanonicalSessionLaunchCreations([
            {
              id:
                "canonical-0",
              shotIndex:
                0,
              parentCreationId:
                null,
            },
            {
              id:
                "canonical-2",
              shotIndex:
                2,
              parentCreationId:
                null,
            },
            {
              id:
                "continuation",
              shotIndex:
                1,
              parentCreationId:
                "canonical-0",
            },
          ])

        expect(
          canonical.map(
            (
              creation,
            ) =>
              creation.shotIndex,
          ),
        ).toEqual([
          0,
          2,
        ])
      },
    )

    it(
      "launch reads parentCreationId and returns canonical ids only",
      () => {
        expect(
          core,
        ).toContain(
          "parentCreationId: true",
        )

        expect(
          core,
        ).toContain(
          "resolveMiravaCanonicalSessionLaunchCreations(",
        )

        expect(
          core,
        ).toContain(
          "canonicalCreations.every(",
        )

        expect(
          core,
        ).toContain(
          "creation.shotIndex ===",
        )

        expect(
          core,
        ).toContain(
          "canonicalCreations.map(",
        )

        expect(
          core,
        ).not.toContain(
          "session.creations.length !== config.data.shotCount",
        )

        expect(
          core,
        ).not.toContain(
          "creationIds: session.creations.map",
        )
      },
    )
  },
)
