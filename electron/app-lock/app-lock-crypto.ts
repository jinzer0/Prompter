import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

export const APP_LOCK_SCRYPT_KEY_LENGTH = 64
export const APP_LOCK_SCRYPT_PARAMETERS = {
  cost: 16_384,
  blockSize: 8,
  parallelization: 1,
  keyLength: APP_LOCK_SCRYPT_KEY_LENGTH,
  maxMemory: 33_554_432,
} as const

export type AppLockPassphraseVerifier = {
  readonly kdf: "scrypt"
  readonly kdfParameters: typeof APP_LOCK_SCRYPT_PARAMETERS
  readonly salt: string
  readonly hash: string
}

function deriveScryptKey(passphrase: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      passphrase,
      salt,
      APP_LOCK_SCRYPT_PARAMETERS.keyLength,
      {
        N: APP_LOCK_SCRYPT_PARAMETERS.cost,
        r: APP_LOCK_SCRYPT_PARAMETERS.blockSize,
        p: APP_LOCK_SCRYPT_PARAMETERS.parallelization,
        maxmem: APP_LOCK_SCRYPT_PARAMETERS.maxMemory,
      },
      (error, derivedKey) => {
        if (error !== null && error !== undefined) {
          reject(error)
          return
        }

        resolve(derivedKey)
      },
    )
  })
}

export async function hashAppLockPassphrase(
  passphrase: string,
): Promise<AppLockPassphraseVerifier> {
  const salt = randomBytes(16)
  const hash = await deriveScryptKey(passphrase, salt)

  return {
    kdf: "scrypt",
    kdfParameters: APP_LOCK_SCRYPT_PARAMETERS,
    salt: salt.toString("base64"),
    hash: hash.toString("base64"),
  }
}

export async function verifyAppLockPassphrase(
  passphrase: string,
  verifier: AppLockPassphraseVerifier,
): Promise<boolean> {
  const salt = Buffer.from(verifier.salt, "base64")
  const expectedHash = Buffer.from(verifier.hash, "base64")
  const actualHash = await deriveScryptKey(passphrase, salt)

  return actualHash.length === expectedHash.length && timingSafeEqual(actualHash, expectedHash)
}
