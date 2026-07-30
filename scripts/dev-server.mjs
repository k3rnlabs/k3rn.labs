import { spawn } from "node:child_process"
import { unlinkSync, writeFileSync } from "node:fs"
import { createServer } from "node:net"
import { fileURLToPath } from "node:url"

const DEFAULT_PORT = 3000
const MAX_PORT = 3099

function readRequestedPort(args) {
  const portFlagIndex = args.findIndex((argument) => argument === "-p" || argument === "--port")
  const flagValue = portFlagIndex >= 0 ? args[portFlagIndex + 1] : undefined
  const raw = flagValue ?? process.env.PORT
  if (!raw) return { explicit: false, port: DEFAULT_PORT }
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error(`Port invalide : ${raw}`)
  return { explicit: true, port }
}

function withoutPortFlag(args) {
  const forwarded = []
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "-p" || args[index] === "--port") {
      index += 1
      continue
    }
    forwarded.push(args[index])
  }
  return forwarded
}

function portIsAvailable(port) {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.unref()
    probe.once("error", () => resolve(false))
    probe.listen({ host: "::", port }, () => probe.close(() => resolve(true)))
  })
}

async function selectPort(requested) {
  if (requested.explicit) {
    if (await portIsAvailable(requested.port)) return requested.port
    throw new Error(`Le port ${requested.port} est déjà utilisé. Choisissez-en un autre avec --port.`)
  }
  for (let port = requested.port; port <= MAX_PORT; port += 1) {
    if (await portIsAvailable(port)) return port
  }
  throw new Error(`Aucun port disponible entre ${requested.port} et ${MAX_PORT}.`)
}

async function main() {
  const args = process.argv.slice(2)
  const requested = readRequestedPort(args)
  const port = await selectPort(requested)
  const distDir = process.env.NEXT_DIST_DIR || `.next-dev-${port}`
  const tsconfigPath = `.tsconfig-dev-${port}.json`
  const nextBin = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url))

  writeFileSync(tsconfigPath, `${JSON.stringify({
    extends: "./tsconfig.json",
    compilerOptions: { plugins: [{ name: "next" }] },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", `${distDir}/types/**/*.ts`],
    exclude: ["node_modules", "prisma/seed.ts", "scripts"],
  }, null, 2)}\n`)

  console.log(`MIRAVA/K3RN · serveur isolé sur http://localhost:${port} · cache ${distDir}`)

  const child = spawn(process.execPath, [nextBin, "dev", "--port", String(port), ...withoutPortFlag(args)], {
    env: { ...process.env, PORT: String(port), NEXT_DIST_DIR: distDir, NEXT_TSCONFIG_PATH: tsconfigPath },
    stdio: "inherit",
  })

  const cleanup = () => {
    try { unlinkSync(tsconfigPath) } catch {}
  }

  const forwardSignal = (signal) => {
    cleanup()
    if (!child.killed) child.kill(signal)
  }
  process.once("exit", cleanup)
  process.once("SIGINT", () => forwardSignal("SIGINT"))
  process.once("SIGTERM", () => forwardSignal("SIGTERM"))
  child.once("error", (error) => {
    cleanup()
    console.error(error.message)
    process.exitCode = 1
  })
  child.once("exit", (code, signal) => {
    cleanup()
    process.exitCode = signal ? 1 : (code ?? 1)
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
