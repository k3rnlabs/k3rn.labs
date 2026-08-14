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

const launchStart =
  core.indexOf(
    "export async function launchMiravaSessionShoot",
  )

const launchEnd =
  core.indexOf(
    "\nasync function getIdentityAssetsForCreation",
    launchStart,
  )

const launch =
  core.slice(
    launchStart,
    launchEnd,
  )

describe(
  "MIRAVA Session identity rebind",
  () => {
    it(
      "rebinds the current identity only before the session has any creation",
      () => {
        expect(
          launch,
        ).toContain(
          `session.creations.length === 0 &&
    session.identityProfileId !==
      currentIdentityProfile.id`,
        )
      },
    )

    it(
      "does not keep the old unconditional identity rebind condition",
      () => {
        expect(
          launch,
        ).not.toContain(
          `if (
    session.identityProfileId !==
      currentIdentityProfile.id
  )`,
        )
      },
    )

    it(
      "keeps the FACE_ID gate before rebind and the RPC after it",
      () => {
        const gate =
          launch.indexOf(
            "selectMiravaKieRequiredIdentityFaceInputs(",
          )

        const rebind =
          launch.indexOf(
            "session.creations.length === 0 &&",
          )

        const rpc =
          launch.indexOf(
            'supabaseAdmin.rpc("launch_mirava_session_shoot"',
          )

        expect(
          gate,
        ).toBeGreaterThan(
          -1,
        )

        expect(
          rebind,
        ).toBeGreaterThan(
          gate,
        )

        expect(
          rpc,
        ).toBeGreaterThan(
          rebind,
        )
      },
    )

    it(
      "keeps canonical launch accounting after the guarded rebind",
      () => {
        expect(
          launch,
        ).toContain(
          "resolveMiravaCanonicalSessionLaunchCreations(",
        )

        expect(
          launch,
        ).toContain(
          "hasExactCanonicalSequence",
        )
      },
    )
  },
)
