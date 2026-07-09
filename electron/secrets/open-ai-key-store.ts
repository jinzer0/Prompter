import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { z } from "zod"

import { saveOpenAIKeyInputSchema } from "../ipc-contract.js"
import type { OpenAIKeyStatus, SaveOpenAIKeyInput } from "../ipc-types.js"

export type SafeStorageAdapter = {
  readonly isEncryptionAvailable: () => boolean
  readonly encryptString: (plainText: string) => Buffer
  readonly decryptString: (encrypted: Buffer) => string
}

export type OpenAIKeyStore = {
  readonly saveOpenAIKey: (input: SaveOpenAIKeyInput) => Promise<OpenAIKeyStatus>
  readonly hasOpenAIKey: () => Promise<boolean>
  readonly getOpenAIKeyStatus: () => Promise<OpenAIKeyStatus>
  readonly deleteOpenAIKey: () => Promise<OpenAIKeyStatus>
  readonly getOpenAIKeyForMainProcessOnly: () => Promise<string | null>
}

export type OpenAIKeyStoreConfig = {
  readonly safeStorage: SafeStorageAdapter
  readonly secretFilePath: string
}

export class SecretStorageUnavailableError extends Error {
  readonly name = "SecretStorageUnavailableError"

  constructor() {
    super("Secret storage is unavailable")
  }
}

export class SecretValidationError extends Error {
  readonly name = "SecretValidationError"
}

const emptyStatus: OpenAIKeyStatus = { hasKey: false, maskedKey: null, updatedAt: null }
const secretFileSchema = z.object({
  version: z.literal(1),
  encryptedKey: z.string().min(1),
  maskedKey: z.string().min(1),
  updatedAt: z.number().int().nonnegative(),
})

function parseAPIKey(input: SaveOpenAIKeyInput): string {
  const parsed = saveOpenAIKeyInputSchema.safeParse(input)

  if (!parsed.success) {
    throw new SecretValidationError(parsed.error.issues[0]?.message ?? "API key is invalid")
  }

  return parsed.data.apiKey
}

function maskAPIKey(apiKey: string): string {
  const prefix = apiKey.startsWith("sk-proj-") ? "sk-proj-" : "sk-"
  return `${prefix}••••••••••••••••${apiKey.slice(-4)}`
}

export function createOpenAIKeyStore(config: OpenAIKeyStoreConfig): OpenAIKeyStore {
  async function readSecretFile(): Promise<z.infer<typeof secretFileSchema> | null> {
    try {
      const contents = await readFile(config.secretFilePath, "utf8")
      return secretFileSchema.parse(JSON.parse(contents))
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return null
      }

      throw error
    }
  }

  return {
    async saveOpenAIKey(input) {
      const apiKey = parseAPIKey(input)

      if (!config.safeStorage.isEncryptionAvailable()) {
        throw new SecretStorageUnavailableError()
      }

      const updatedAt = Date.now()
      const encryptedKey = config.safeStorage.encryptString(apiKey).toString("base64")
      const payload = {
        version: 1,
        encryptedKey,
        maskedKey: maskAPIKey(apiKey),
        updatedAt,
      } as const

      await mkdir(dirname(config.secretFilePath), { recursive: true })
      await writeFile(config.secretFilePath, JSON.stringify(payload), { mode: 0o600 })

      return { hasKey: true, maskedKey: payload.maskedKey, updatedAt }
    },
    async hasOpenAIKey() {
      return (await readSecretFile()) !== null
    },
    async getOpenAIKeyStatus() {
      const secret = await readSecretFile()
      return secret === null
        ? emptyStatus
        : { hasKey: true, maskedKey: secret.maskedKey, updatedAt: secret.updatedAt }
    },
    async deleteOpenAIKey() {
      await rm(config.secretFilePath, { force: true })
      return emptyStatus
    },
    async getOpenAIKeyForMainProcessOnly() {
      const secret = await readSecretFile()

      if (secret === null) {
        return null
      }

      return config.safeStorage.decryptString(Buffer.from(secret.encryptedKey, "base64"))
    },
  }
}

export function createUnavailableOpenAIKeyStore(): OpenAIKeyStore {
  return {
    async saveOpenAIKey() {
      throw new SecretStorageUnavailableError()
    },
    async hasOpenAIKey() {
      return false
    },
    async getOpenAIKeyStatus() {
      return emptyStatus
    },
    async deleteOpenAIKey() {
      return emptyStatus
    },
    async getOpenAIKeyForMainProcessOnly() {
      return null
    },
  }
}
