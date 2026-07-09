import { randomUUID } from "node:crypto"
import { readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  createOpenAIKeyStore,
  type SafeStorageAdapter,
} from "../electron/secrets/open-ai-key-store"

const plaintextKey = "sk-proj-phase9-secret-value-7890"

function createSecretPath(name: string): string {
  return join(tmpdir(), `${name}-${randomUUID()}.json`)
}

function createSafeStorageAdapter(isAvailable: boolean): SafeStorageAdapter {
  return {
    isEncryptionAvailable: () => isAvailable,
    encryptString: (plainText) => Buffer.from(`cipher:${[...plainText].reverse().join("")}`),
    decryptString: (encrypted) => {
      const encoded = encrypted.toString("utf8")
      const cipherPrefix = "cipher:"

      if (!encoded.startsWith(cipherPrefix)) {
        throw new TypeError("Unexpected encrypted payload")
      }

      return [...encoded.slice(cipherPrefix.length)].reverse().join("")
    },
  }
}

describe("OpenAI key secret store", () => {
  it("stores encrypted bytes and returns only masked status when saving a key", async () => {
    const secretFilePath = createSecretPath("prompter-openai-key")
    const store = createOpenAIKeyStore({
      safeStorage: createSafeStorageAdapter(true),
      secretFilePath,
    })

    try {
      const status = await store.saveOpenAIKey({ apiKey: `  ${plaintextKey}  ` })
      const persisted = await readFile(secretFilePath, "utf8")

      expect(status).toEqual({
        hasKey: true,
        maskedKey: "sk-proj-••••••••••••••••7890",
        updatedAt: expect.any(Number),
      })
      expect(await store.hasOpenAIKey()).toBe(true)
      expect(await store.getOpenAIKeyStatus()).toEqual(status)
      expect(await store.getOpenAIKeyForMainProcessOnly()).toBe(plaintextKey)
      expect(persisted).not.toContain(plaintextKey)
      expect(JSON.stringify(status)).not.toContain(plaintextKey)
    } finally {
      await rm(secretFilePath, { force: true })
    }
  })

  it("deletes a saved key and clears masked status", async () => {
    const secretFilePath = createSecretPath("prompter-openai-key-delete")
    const store = createOpenAIKeyStore({
      safeStorage: createSafeStorageAdapter(true),
      secretFilePath,
    })

    try {
      await store.saveOpenAIKey({ apiKey: plaintextKey })

      const status = await store.deleteOpenAIKey()

      expect(status).toEqual({ hasKey: false, maskedKey: null, updatedAt: null })
      expect(await store.hasOpenAIKey()).toBe(false)
      expect(await store.getOpenAIKeyStatus()).toEqual(status)
      await expect(store.getOpenAIKeyForMainProcessOnly()).resolves.toBeNull()
    } finally {
      await rm(secretFilePath, { force: true })
    }
  })

  it("rejects unavailable encryption without persisting plaintext", async () => {
    const secretFilePath = createSecretPath("prompter-openai-key-unavailable")
    const store = createOpenAIKeyStore({
      safeStorage: createSafeStorageAdapter(false),
      secretFilePath,
    })

    try {
      await expect(store.saveOpenAIKey({ apiKey: plaintextKey })).rejects.toThrow(
        /Secret storage is unavailable/,
      )
      await expect(readFile(secretFilePath, "utf8")).rejects.toThrow()
    } finally {
      await rm(secretFilePath, { force: true })
    }
  })

  it("rejects blank and too-short keys with sanitized validation errors", async () => {
    const secretFilePath = createSecretPath("prompter-openai-key-invalid")
    const store = createOpenAIKeyStore({
      safeStorage: createSafeStorageAdapter(true),
      secretFilePath,
    })

    try {
      await expect(store.saveOpenAIKey({ apiKey: "   " })).rejects.toThrow(/API key is required/)
      await expect(store.saveOpenAIKey({ apiKey: "sk-short" })).rejects.toThrow(
        /API key is too short/,
      )
      await expect(readFile(secretFilePath, "utf8")).rejects.toThrow()
    } finally {
      await rm(secretFilePath, { force: true })
    }
  })
})
