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

describe(
  "MIRAVA Session Builder pre-charge FACE_ID gate",
  () => {
    const launchStart =
      core.indexOf(
        "export async function launchMiravaSessionShoot",
      )

    const launchEnd =
      core.indexOf(
        "async function getIdentityAssetsForCreation",
        launchStart,
      )

    const launch =
      core.slice(
        launchStart,
        launchEnd,
      )

    it(
      "validates the canonical required FACE_ID views before launching the RPC",
      () => {
        const gate =
          launch.indexOf(
            "const requiredIdentityFaceInputs =",
          )

        const selector =
          launch.indexOf(
            "selectMiravaKieRequiredIdentityFaceInputs(",
          )

        const requiredCount =
          launch.indexOf(
            "MIRAVA_REQUIRED_IDENTITY_VIEW_KEYS.length",
          )

        const rpc =
          launch.indexOf(
            'supabaseAdmin.rpc("launch_mirava_session_shoot"',
          )

        expect(gate).toBeGreaterThan(
          -1,
        )

        expect(selector).toBeGreaterThan(
          gate,
        )

        expect(requiredCount).toBeGreaterThan(
          selector,
        )

        expect(rpc).toBeGreaterThan(
          requiredCount,
        )
      },
    )

    it(
      "fails closed as IDENTITY_REQUIRED before credits can be charged",
      () => {
        const faceGateStart =
          launch.indexOf(
            "const requiredIdentityFaceInputs =",
          )

        const rebindStart =
          launch.indexOf(
            "session.identityProfileId !==",
            faceGateStart,
          )

        const faceGate =
          launch.slice(
            faceGateStart,
            rebindStart,
          )

        expect(faceGate).toContain(
          '"IDENTITY_REQUIRED"',
        )

        expect(faceGate).toContain(
          "réenregistré",
        )
      },
    )

    it(
      "keeps the stale-session rebind after FACE_ID validation and before the RPC",
      () => {
        const gate =
          launch.indexOf(
            "const requiredIdentityFaceInputs =",
          )

        const rebind =
          launch.indexOf(
            "await db.studioSession.update({",
            gate,
          )

        const rpc =
          launch.indexOf(
            'supabaseAdmin.rpc("launch_mirava_session_shoot"',
          )

        expect(rebind).toBeGreaterThan(
          gate,
        )

        expect(rpc).toBeGreaterThan(
          rebind,
        )
      },
    )
  },
)
