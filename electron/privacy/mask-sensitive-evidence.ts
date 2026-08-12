import type { SensitiveFindingCategory } from "./sensitive-patterns.js"

type MaskLengths = {
  readonly prefix: number
  readonly suffix: number
}

export type SensitiveEvidenceMask = {
  readonly totalLength: number
  readonly visiblePrefix: string
  readonly visibleSuffix: string
}

const maskLengths = {
  openai_api_key: { prefix: 8, suffix: 4 },
  github_token: { prefix: 5, suffix: 4 },
  bearer_token: { prefix: 11, suffix: 4 },
  aws_access_key: { prefix: 4, suffix: 4 },
  private_key: { prefix: 10, suffix: 5 },
  environment_secret: { prefix: 4, suffix: 4 },
  url_secret: { prefix: 4, suffix: 4 },
  email_address: { prefix: 2, suffix: 4 },
  phone_number: { prefix: 3, suffix: 2 },
  national_id: { prefix: 2, suffix: 2 },
  internal_url: { prefix: 6, suffix: 3 },
  private_ip: { prefix: 3, suffix: 2 },
} as const satisfies Record<SensitiveFindingCategory, MaskLengths>

export function maskPlanForCategory(
  category: SensitiveFindingCategory,
  totalLength: number,
): MaskLengths {
  const lengths = maskLengths[category]
  const visibleCharacterLimit = Math.max(0, totalLength - 1)
  const prefix = Math.min(lengths.prefix, visibleCharacterLimit)
  const suffix = Math.min(lengths.suffix, visibleCharacterLimit - prefix)

  return { prefix, suffix }
}

export function maskSensitiveEvidence(mask: SensitiveEvidenceMask): string {
  return `${mask.visiblePrefix}...${mask.visibleSuffix}`
}
