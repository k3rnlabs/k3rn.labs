import {
  describe,
  expect,
  it,
} from "vitest"
import {
  readFileSync,
} from "node:fs"
import {
  join,
} from "node:path"

const core = readFileSync(
  join(
    process.cwd(),
    "src/lib/visual-engine/core.ts",
  ),
  "utf8",
)

describe(
  "MIRAVA V6 temporary artifact lifecycle",
  () => {
    it(
      "cleans frame artifacts only after RESULT is durable",
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
      "keeps temporary artifacts across retryable failure",
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

        const cleanup =
          failJob.indexOf(
            "purgeMiravaKieTemporaryAssetsForCreation(",
          )

        expect(retry).toBeGreaterThan(-1)
        expect(cleanup).toBeGreaterThan(retry)

        expect(
          failJob.slice(
            retry,
            cleanup,
          ),
        ).toContain("return")
      },
    )

    it(
      "clears provider resume state at DONE and FAILED boundaries",
      () => {
        const finishStart =
          core.indexOf(
            "async function finishJob(",
          )

        const failStart =
          core.indexOf(
            "async function failJob(",
          )

        const finish =
          core.slice(
            finishStart,
            failStart,
          )

        const failEnd =
          core.indexOf(
            "function publicFailureMessage(",
            failStart,
          )

        const fail =
          core.slice(
            failStart,
            failEnd,
          )

        expect(finish).toContain(
          "providerState: null",
        )

        expect(fail).toContain(
          "providerState: null",
        )
      },
    )

    it(
      "purges Kie temporaries before deleting a creation",
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

        const deletion =
          core.slice(start, end)

        const cleanup =
          deletion.indexOf(
            "purgeMiravaKieTemporaryAssetsForCreation(",
          )

        const remove =
          deletion.indexOf(
            "db.studioCreation.delete(",
          )

        expect(cleanup).toBeGreaterThan(-1)
        expect(remove).toBeGreaterThan(cleanup)
      },
    )
  },
)
