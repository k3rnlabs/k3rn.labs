import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"

const core = readFileSync(
  "src/lib/visual-engine/core.ts",
  "utf8",
)

describe(
  "MIRAVA Kie V6 FACE_ID crop lifecycle",
  () => {
    it(
      "purges selected frame crops only after RESULT storage",
      () => {
        const store =
          core.indexOf(
            "await storeResultAsset(",
          )

        const cleanup =
          core.indexOf(
            "await purgeMiravaKieTemporaryAssetsForFrame(",
            store,
          )

        expect(store).toBeGreaterThan(-1)
        expect(cleanup).toBeGreaterThan(store)
      },
    )

    it(
      "keeps temporary crops across retryable failures",
      () => {
        const start =
          core.indexOf(
            "async function failJob(",
          )

        const end =
          core.indexOf(
            "function publicFailureMessage(",
            start,
          )

        const failJob =
          core.slice(start, end)

        const retry =
          failJob.indexOf(
            "if (retry)",
          )

        const terminal =
          failJob.indexOf(
            "purgeMiravaKieTemporaryAssetsForCreation(",
          )

        expect(retry).toBeGreaterThan(-1)
        expect(terminal).toBeGreaterThan(retry)
        expect(
          failJob.slice(
            retry,
            terminal,
          ),
        ).toContain(
          "return",
        )
      },
    )

    it(
      "purges residual crops on terminal creation cleanup",
      () => {
        expect(core).toContain(
          "purgeMiravaKieIdentityCropsForCreation(",
        )
        expect(core).toContain(
          "purgeMiravaKieTemporaryAssetsForCreation(",
        )
      },
    )

    it(
      "purges temporary files before deleting a creation",
      () => {
        const start =
          core.indexOf(
            "export async function deleteStudioCreation(",
          )

        const end =
          core.indexOf(
            "async function downloadAsset(",
            start,
          )

        const block =
          core.slice(start, end)

        expect(
          block.indexOf(
            "purgeMiravaKieTemporaryAssetsForCreation(",
          ),
        ).toBeLessThan(
          block.indexOf(
            "db.studioCreation.delete(",
          ),
        )
      },
    )
  },
)
