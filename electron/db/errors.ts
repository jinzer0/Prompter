export class PersistenceNotFoundError extends Error {
  constructor(
    readonly entity: string,
    readonly id: string,
  ) {
    super(`${entity} not found: ${id}`)
    this.name = "PersistenceNotFoundError"
  }
}
