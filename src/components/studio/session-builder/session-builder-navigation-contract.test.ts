import {
  readFileSync,
} from "node:fs"
import {
  resolve,
} from "node:path"

import {
  describe,
  expect,
  it,
} from "vitest"

const flow =
  readFileSync(
    resolve(
      process.cwd(),
      "src/components/studio/session-builder/session-builder-flow.tsx",
    ),
    "utf8",
  )

const setStep =
  readFileSync(
    resolve(
      process.cwd(),
      "src/components/studio/session-builder/session-set-step.tsx",
    ),
    "utf8",
  )

const studio =
  readFileSync(
    resolve(
      process.cwd(),
      "src/components/studio/visual-engine-studio.tsx",
    ),
    "utf8",
  )

describe(
  "MIRAVA Session Builder navigation contract",
  () => {
    it(
      "serializes Direction autosaves without dropping rapid choices",
      () => {
        const start =
          flow.indexOf(
            "const persistDirection =",
          )

        const end =
          flow.indexOf(
            "const moveFromDirection =",
            start,
          )

        const block =
          flow.slice(
            start,
            end,
          )

        expect(
          block,
        ).toContain(
          "directionSaveQueueRef",
        )

        expect(
          block,
        ).toContain(
          "const queuedSave =",
        )

        expect(
          block,
        ).not.toContain(
          "if (saving) {",
        )
      },
    )

    it(
      "waits for pending Direction writes before leaving Direction",
      () => {
        const start =
          flow.indexOf(
            "const moveFromDirection =",
          )

        const end =
          flow.indexOf(
            "const changeLookMode =",
            start,
          )

        const block =
          flow.slice(
            start,
            end,
          )

        expect(
          block.indexOf(
            "await directionSaveQueueRef",
          ),
        ).toBeGreaterThan(-1)

        expect(
          block.indexOf(
            "await persist({",
          ),
        ).toBeGreaterThan(
          block.indexOf(
            "await directionSaveQueueRef",
          ),
        )
      },
    )

    it(
      "asks the Studio scroll container to return to the top on every Builder step",
      () => {
        expect(
          flow,
        ).toContain(
          "onStepChange?.()",
        )

        expect(
          flow,
        ).toContain(
          "onStepChange,\n      step,",
        )

        expect(
          studio,
        ).toContain(
          "const scrollSessionBuilderToTop =",
        )

        expect(
          studio,
        ).toContain(
          "studioScrollRef.current?.scrollTo({",
        )

        expect(
          studio,
        ).toContain(
          `onStepChange={
                scrollSessionBuilderToTop
              }`,
        )
      },
    )

    it(
      "lets Step 1 leave the Builder while preserving its draft",
      () => {
        expect(
          flow,
        ).toContain(
          "onExit: () => void",
        )

        expect(
          flow,
        ).toContain(
          `onBack={
            onExit
          }`,
        )

        expect(
          setStep,
        ).toContain(
          "Retour au Studio",
        )

        expect(
          setStep,
        ).toContain(
          "Volver al Studio",
        )

        expect(
          studio,
        ).toContain(
          `onExit={
                openStudioHome
              }`,
        )

        const homeStart =
          studio.indexOf(
            "const openStudioHome =",
          )

        const homeEnd =
          studio.indexOf(
            "const selectBottomNav =",
            homeStart,
          )

        const homeBlock =
          studio.slice(
            homeStart,
            homeEnd,
          )

        expect(
          homeBlock,
        ).toContain(
          "setSessionBuilderSession(null)",
        )

        expect(
          homeBlock,
        ).not.toContain(
          'method: "DELETE"',
        )

        expect(
          homeBlock,
        ).not.toContain(
          "/api/visual-engine/sessions/",
        )
      },
    )
  },
)
