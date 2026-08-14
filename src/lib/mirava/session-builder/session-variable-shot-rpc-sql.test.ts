import {
  readFileSync,
} from "node:fs"

import {
  describe,
  expect,
  it,
} from "vitest"

const migration =
  "20260809164500_mirava_session_variable_shot_count"

const prisma =
  readFileSync(
    `prisma/migrations/${migration}/migration.sql`,
    "utf8",
  )

const supabase =
  readFileSync(
    `supabase/migrations/${migration}.sql`,
    "utf8",
  )

describe(
  "MIRAVA variable session shoot RPC",
  () => {
    for (
      const [
        label,
        sql,
      ] of [
        [
          "prisma",
          prisma,
        ],
        [
          "supabase",
          supabase,
        ],
      ] as const
    ) {
      it(
        `${label} derives the expected count from persisted Builder state`,
        () => {
          expect(
            sql,
          ).toContain(
            'v_session."builderConfig"->>\'shotCount\'',
          )

          expect(
            sql,
          ).toContain(
            "v_expected_count INTEGER := 6",
          )

          expect(
            sql,
          ).toContain(
            "v_expected_count < 1",
          )

          expect(
            sql,
          ).toContain(
            "v_expected_count > 10",
          )

          expect(
            sql,
          ).toContain(
            "'MIRAVA_SESSION_INVALID_SHOT_COUNT'",
          )

          expect(
            sql,
          ).not.toContain(
            "v_expected_count NOT IN",
          )
        },
      )

      it(
        `${label} accepts the complete one-through-ten Builder count contract`,
        () => {
          expect(
            sql,
          ).toContain(
            "v_expected_count < 1",
          )

          expect(
            sql,
          ).toContain(
            "v_expected_count > 10",
          )

          expect(
            sql,
          ).toContain(
            "v_expected_count INTEGER := 6",
          )
        },
      )

      it(
        `${label} requires p_shots to match the persisted count exactly`,
        () => {
          expect(
            sql,
          ).toContain(
            "jsonb_array_length(p_shots)",
          )

          expect(
            sql,
          ).toContain(
            "<> v_expected_count",
          )

          expect(
            sql,
          ).toContain(
            "'MIRAVA_SESSION_INVALID_SHOTS'",
          )
        },
      )

      it(
        `${label} rejects non-contiguous canonical indexes`,
        () => {
          expect(
            sql,
          ).toContain(
            "WITH ORDINALITY",
          )

          expect(
            sql,
          ).toContain(
            "shot.ordinal - 1",
          )
        },
      )

      it(
        `${label} serializes concurrent launches before canonical accounting`,
        () => {
          const lockIndex =
            sql.indexOf(
              "FOR UPDATE",
            )

          const countIndex =
            sql.indexOf(
              'SELECT count(*)',
            )

          expect(
            lockIndex,
          ).toBeGreaterThanOrEqual(
            0,
          )

          expect(
            countIndex,
          ).toBeGreaterThan(
            lockIndex,
          )
        },
      )

      it(
        `${label} excludes continuations from canonical slot accounting`,
        () => {
          const matches =
            sql.match(
              /"parentCreationId"\s+IS NULL/g,
            ) ?? []

          expect(
            matches.length,
          ).toBeGreaterThanOrEqual(
            3,
          )
        },
      )

      it(
        `${label} keeps exactly one credit reservation and debit operation in the per-shot loop`,
        () => {
          expect(
            (
              sql.match(
                /PERFORM public\.reserve_mirava_credit\(/g,
              ) ?? []
            ),
          ).toHaveLength(
            1,
          )

          expect(
            (
              sql.match(
                /PERFORM public\.debit_mirava_credit_reservation\(/g,
              ) ?? []
            ),
          ).toHaveLength(
            1,
          )

          expect(
            sql,
          ).toContain(
            "'GENERATE'",
          )
        },
      )

      it(
        `${label} retains qualified RETURN QUERY columns`,
        () => {
          expect(
            sql,
          ).toContain(
            'creation."shotIndex"',
          )

          expect(
            sql,
          ).toContain(
            'FROM "StudioCreation" AS creation',
          )

          expect(
            sql,
          ).not.toContain(
            'RETURN QUERY SELECT "id", "shotIndex" FROM "StudioCreation"',
          )
        },
      )
    }

    it(
      "keeps Prisma and Supabase migration mirrors identical",
      () => {
        expect(
          prisma,
        ).toBe(
          supabase,
        )
      },
    )
  },
)
