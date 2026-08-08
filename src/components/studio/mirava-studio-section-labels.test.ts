import {
  readdirSync,
  readFileSync,
} from "node:fs"
import path from "node:path"
import {
  describe,
  expect,
  it,
} from "vitest"

function readStudioComponents(
  directory: string,
): string {
  return readdirSync(
    directory,
    { withFileTypes: true },
  )
    .map((entry) => {
      const entryPath =
        path.join(
          directory,
          entry.name,
        )

      if (entry.isDirectory()) {
        return readStudioComponents(
          entryPath,
        )
      }

      if (
        !entry.name.endsWith(
          ".tsx",
        ) ||
        entry.name.endsWith(
          ".test.tsx",
        )
      ) {
        return ""
      }

      return readFileSync(
        entryPath,
        "utf8",
      )
    })
    .join("\n")
}

describe(
  "MIRAVA Studio section labels",
  () => {
    const studioComponents =
      readStudioComponents(
        path.resolve(
          process.cwd(),
          "src/components/studio",
        ),
      )

    it(
      "keeps the wordmark in the header instead of repeating MIRAVA slash prefixes",
      () => {
        expect(
          studioComponents,
        ).not.toContain(
          "MIRAVA /",
        )
      },
    )
  },
)
