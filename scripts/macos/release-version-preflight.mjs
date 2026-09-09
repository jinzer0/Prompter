import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { releaseInputNames } from "./release-inputs.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")

async function main() {
  try {
    const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"))
    if (packageJson.version !== "0.1.1") throw new Error("Invalid package version")
  } catch {
    throw new Error("Invalid package version")
  }
  const missingInput = Object.values(releaseInputNames).find(
    (name) => typeof process.env[name] !== "string" || process.env[name].trim() === "",
  )
  if (missingInput !== undefined) throw new Error(`Missing required release input: ${missingInput}`)
}

await main()
