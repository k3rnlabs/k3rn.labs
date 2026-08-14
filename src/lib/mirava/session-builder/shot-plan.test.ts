import {
  describe,
  expect,
  it,
} from "vitest"

import {
  resolveMiravaSessionDirection,
} from "./resolve-session-direction"
import {
  MIRAVA_SESSION_CONTINUITY_LOCKS,
  MIRAVA_SESSION_SHOT_INTENTS,
  createMiravaSessionShotPlan,
} from "./shot-plan"

const direction =
  resolveMiravaSessionDirection({
    version: 1,
    mode: "CUSTOM_SHOOT",
    setPresetId:
      "grey-cyclorama-v1",
    lightingPresetId:
      "clean-v1",
    shotCount: 6,
    lookMode: "CUSTOM",
    framing: "FREE",
    pose: "FREE",
    expression: "FREE",
    gaze: "FREE",
    makeup: "NATURAL",
    skinFinish: "NATURAL",
    hair: "PROFILE",
    userInstruction: "",
  })

describe("MIRAVA Session Builder shot plan", () => {
  it("creates the six ordered V1 shots", () => {
    const shots =
      createMiravaSessionShotPlan(
        direction,
      )

    expect(shots).toHaveLength(6)

    expect(
      shots.map(
        (shot) => shot.shotIndex,
      ),
    ).toEqual([0, 1, 2, 3, 4, 5])

    expect(
      shots.map(
        (shot) => shot.shotIntent,
      ),
    ).toEqual(
      MIRAVA_SESSION_SHOT_INTENTS.slice(0, 6),
    )
  })

  it("locks identity, set, lighting and wardrobe across every shot", () => {
    const shots =
      createMiravaSessionShotPlan(
        direction,
      )

    for (const shot of shots) {
      expect(
        shot.continuityLocks,
      ).toEqual(
        MIRAVA_SESSION_CONTINUITY_LOCKS,
      )
    }
  })

  it("provides distinct framing and pose instructions", () => {
    const shots =
      createMiravaSessionShotPlan(
        direction,
      )

    expect(
      new Set(
        shots.map(
          (shot) =>
            shot.framingPrompt,
        ),
      ).size,
    ).toBe(6)

    expect(
      new Set(
        shots.map(
          (shot) =>
            shot.posePrompt,
        ),
      ).size,
    ).toBe(6)
  })

  it("returns fresh deterministic snapshots", () => {
    const first =
      createMiravaSessionShotPlan(
        direction,
      )
    const second =
      createMiravaSessionShotPlan(
        direction,
      )

    expect(first).toEqual(second)
    expect(first).not.toBe(second)
    expect(first[0]).not.toBe(
      second[0],
    )
    expect(
      first[0].continuityLocks,
    ).not.toBe(
      second[0].continuityLocks,
    )
  })
  it(
    "keeps pose, expression and camera semantics separated",
    () => {
      const shots =
        createMiravaSessionShotPlan(
          direction,
        )

      expect(
        shots[3].posePrompt,
      ).not.toContain(
        "expression",
      )

      expect(
        shots[4].cameraPrompt,
      ).not.toContain(
        "motion",
      )
    },
  )

})
