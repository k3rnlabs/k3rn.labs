import {
  readFileSync,
} from "node:fs"
import path from "node:path"
import {
  describe,
  expect,
  it,
} from "vitest"

describe(
  "MIRAVA account logout",
  () => {
    const studio =
      readFileSync(
        path.resolve(
          process.cwd(),
          "src/components/studio/visual-engine-studio.tsx",
        ),
        "utf8",
      )

    it(
      "exposes logout from the account area",
      () => {
        expect(studio).toContain(
          "data-mirava-account-session",
        )

        expect(studio).toContain(
          '"Se déconnecter"',
        )

        expect(studio).toContain(
          '"Cerrar sesión"',
        )
      },
    )

    it(
      "deletes the server session before returning to login",
      () => {
        expect(studio).toContain(
          '"/api/auth/session"',
        )

        expect(studio).toContain(
          'method: "DELETE"',
        )

        expect(studio).toContain(
          'window.location.assign(',
        )

        expect(studio).toContain(
          '"/visual-engine/studio/login"',
        )
      },
    )

    it(
      "prevents duplicate logout requests and surfaces failures",
      () => {
        expect(studio).toContain(
          "if (logoutLoading)",
        )

        expect(studio).toContain(
          "setLogoutError(null)",
        )

        expect(studio).toContain(
          "logoutError ? (",
        )
      },
    )
  },
)
