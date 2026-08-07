import {
  spawnSync,
} from "node:child_process"

const environment =
  process.env.VERCEL_ENV ?? ""

const isVercelProductionBuild =
  process.env.VERCEL === "1" &&
  process.env.CI === "1" &&
  environment === "production"

if (!isVercelProductionBuild) {
  console.log(
    `[mirava-migrations] skipped (${environment || "local"})`,
  )

  process.exit(0)
}

console.log(
  "[mirava-migrations] applying production migrations",
)

const command =
  process.platform === "win32"
    ? "npx.cmd"
    : "npx"

const result =
  spawnSync(
    command,
    [
      "prisma",
      "migrate",
      "deploy",
    ],
    {
      stdio: "inherit",
      env: process.env,
    },
  )

if (result.error) {
  console.error(
    "[mirava-migrations] process error",
    result.error,
  )
  process.exit(1)
}

if (result.status !== 0) {
  console.error(
    `[mirava-migrations] failed with exit code ${result.status}`,
  )
  process.exit(
    result.status ?? 1,
  )
}

console.log(
  "[mirava-migrations] production schema is up to date",
)
