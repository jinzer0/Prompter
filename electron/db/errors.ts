export class PersistenceNotFoundError extends Error {
  constructor(
    readonly entity: string,
    readonly id: string,
  ) {
    super(`${entity} not found: ${id}`)
    this.name = "PersistenceNotFoundError"
  }
}

export class PromptVersionOwnershipError extends Error {
  constructor(
    readonly promptAssetId: string,
    readonly promptVersionId: string,
  ) {
    super(`prompt version ${promptVersionId} does not belong to prompt asset ${promptAssetId}`)
    this.name = "PromptVersionOwnershipError"
  }
}

export class PromptLineageCycleError extends Error {
  constructor(readonly promptAssetId: string) {
    super(`prompt lineage contains a cycle at prompt asset ${promptAssetId}`)
    this.name = "PromptLineageCycleError"
  }
}

export class PromptInitialVersionError extends Error {
  constructor(readonly promptAssetId: string) {
    super(`prompt asset already has an initial version: ${promptAssetId}`)
    this.name = "PromptInitialVersionError"
  }
}

export class PromptTemplateSourceOverrideError extends Error {
  constructor() {
    super("prompt template scenario and target agent are derived from the source asset")
    this.name = "PromptTemplateSourceOverrideError"
  }
}

export class PromptQualityReviewAssociationError extends Error {
  constructor(readonly promptVersionId: string) {
    super(`Prompt quality review must belong to prompt version: ${promptVersionId}`)
    this.name = "PromptQualityReviewAssociationError"
  }
}

type PromptQualityReviewScoreMismatch = {
  readonly reviewId: string
  readonly promptVersionId: string
  readonly expectedScore: number
  readonly requestedScore: number
}

export class PromptQualityReviewScoreMismatchError extends Error {
  readonly reviewId: string
  readonly promptVersionId: string
  readonly expectedScore: number
  readonly requestedScore: number

  constructor({
    reviewId,
    promptVersionId,
    expectedScore,
    requestedScore,
  }: PromptQualityReviewScoreMismatch) {
    super(
      `Prompt quality review ${reviewId} for version ${promptVersionId} requires score ${expectedScore}, received ${requestedScore}`,
    )
    this.name = "PromptQualityReviewScoreMismatchError"
    this.reviewId = reviewId
    this.promptVersionId = promptVersionId
    this.expectedScore = expectedScore
    this.requestedScore = requestedScore
  }
}
