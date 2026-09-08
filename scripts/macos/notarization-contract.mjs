const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const sha256 = /^[0-9a-f]{64}$/u

class NotarizationError extends Error {
  constructor(message) {
    super(message)
    this.name = "NotarizationError"
  }
}

export function failNotarization(message) {
  throw new NotarizationError(message)
}

export function isNotarizationError(error) {
  return error instanceof NotarizationError
}

export function exactNotarizationObject(value, fields, message) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Reflect.ownKeys(value).length !== fields.length ||
    fields.some((field) => !Object.hasOwn(value, field)) ||
    Reflect.ownKeys(value).some((key) => typeof key !== "string" || !fields.includes(key))
  ) {
    failNotarization(message)
  }
  return value
}

export function notarizationSignal(value) {
  if (value === undefined) return undefined
  if (!(value instanceof AbortSignal)) failNotarization("Invalid notarization options")
  return value
}

export function notaryProfile(value) {
  if (typeof value !== "string" || value.trim() === "") {
    failNotarization("Invalid Keychain profile")
  }
  return value.trim()
}

export function evidenceDirectory(value) {
  if (typeof value !== "string" || value.trim() === "") {
    failNotarization("Invalid evidence directory")
  }
  return value
}

export function notarizationSubmissionId(value) {
  if (typeof value !== "string" || !uuid.test(value)) {
    failNotarization("Invalid notarization submission")
  }
  return value.toLowerCase()
}

export function submissionArtifactKind(value) {
  if (typeof value !== "string" || value.toLowerCase().endsWith(".app")) {
    failNotarization("Unsupported notarization artifact")
  }
  if (!value.toLowerCase().endsWith(".zip") && !value.toLowerCase().endsWith(".dmg")) {
    failNotarization("Unsupported notarization artifact")
  }
  return value.toLowerCase().endsWith(".zip") ? "app" : "dmg"
}

export function staplingArtifact(value, kind) {
  if (typeof value !== "string" || !["app", "dmg"].includes(kind)) {
    failNotarization("Unsupported stapling artifact")
  }
  if (!value.toLowerCase().endsWith(`.${kind}`)) {
    failNotarization("Unsupported stapling artifact")
  }
}

export function notarizationLogPath(submissionId) {
  return `notary-${submissionId}.json`
}

export function validArtifactIdentity(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Reflect.ownKeys(value).length === 2 &&
    Object.hasOwn(value, "artifactKind") &&
    Object.hasOwn(value, "artifactSha256") &&
    ["app", "dmg"].includes(value.artifactKind) &&
    typeof value.artifactSha256 === "string" &&
    sha256.test(value.artifactSha256)
  )
}
