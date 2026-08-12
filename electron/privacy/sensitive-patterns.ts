import type { SENSITIVE_FINDING_CATEGORIES } from "./privacy-schemas.js"

export type SensitiveFindingCategory = (typeof SENSITIVE_FINDING_CATEGORIES)[number]

export type SensitivePattern = {
  readonly category: SensitiveFindingCategory
  readonly expression: RegExp
  readonly priority: number
  readonly valueGroup?: string
}

export type SensitiveFindingPresentation = {
  readonly confidence: "low" | "medium" | "high"
  readonly description: string
  readonly label: string
  readonly recommendation: string
  readonly severity: "low" | "medium" | "high" | "critical"
}

const octet = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)"

export const SENSITIVE_PATTERNS = [
  {
    category: "openai_api_key",
    expression: /(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{20,}/gi,
    priority: 1,
  },
  {
    category: "github_token",
    expression:
      /(?<![A-Za-z0-9_])(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,})(?![A-Za-z0-9_])/gi,
    priority: 2,
  },
  {
    category: "bearer_token",
    expression: /\bBearer[ \t]+[A-Za-z0-9._~+/=-]{16,}/gi,
    priority: 3,
  },
  {
    category: "aws_access_key",
    expression: /(?<![A-Za-z0-9])(?:AKIA|ASIA)[A-Z0-9]{16}(?![A-Za-z0-9])/g,
    priority: 4,
  },
  {
    category: "private_key",
    expression: /-----BEGIN (?:PRIVATE KEY|RSA PRIVATE KEY|OPENSSH PRIVATE KEY)-----/g,
    priority: 0,
  },
  {
    category: "environment_secret",
    expression:
      /^[ \t]*(?:export[ \t]+)?(?:[A-Za-z_][A-Za-z0-9_]*_)?(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)[A-Za-z0-9_]*[ \t]*=[ \t]*(?:"(?<secret>[^"\r\n]+)"|'(?<secretSingle>[^'\r\n]+)'|(?<secretPlain>[^\s#\r\n]+))/gim,
    priority: 5,
    valueGroup: "environment",
  },
  {
    category: "url_secret",
    expression:
      /https?:\/\/[^\s?#]+\?(?:[A-Za-z0-9_.~%-]+=[^&#\s]*&)*(?:token|api_key|access_token)=(?<secret>[^&#\s]+)/gi,
    priority: 6,
    valueGroup: "secret",
  },
  {
    category: "email_address",
    expression: /\b[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]+\.[A-Z]{2,63}\b/gi,
    priority: 10,
  },
  {
    category: "phone_number",
    expression: /(?<!\d)\+(?:[1-9]\d{0,2})[-. ]?(?:\d[-. ]?){6,12}\d(?!\d)/g,
    priority: 9,
  },
  {
    category: "national_id",
    expression: /(?<!\d)(?:\d{3}-\d{2}-\d{4}|\d{6}-\d{7})(?!\d)/g,
    priority: 8,
  },
  {
    category: "internal_url",
    expression: /\b(?:localhost|127\.0\.0\.1)\b/gi,
    priority: 11,
  },
  {
    category: "private_ip",
    expression: new RegExp(
      `(?<!\\d)(?:10\\.${octet}\\.${octet}\\.${octet}|172\\.(?:1[6-9]|2\\d|3[01])\\.${octet}\\.${octet}|192\\.168\\.${octet}\\.${octet})(?!\\d)`,
      "g",
    ),
    priority: 12,
  },
] as const satisfies readonly SensitivePattern[]

export const SENSITIVE_FINDING_PRESENTATIONS = {
  openai_api_key: {
    severity: "high",
    confidence: "high",
    label: "OpenAI API key candidate",
    description: "A key-shaped OpenAI value needs review.",
    recommendation: "Remove the value before sharing this content.",
  },
  github_token: {
    severity: "high",
    confidence: "high",
    label: "GitHub token candidate",
    description: "A GitHub token-shaped value needs review.",
    recommendation: "Remove the token before sharing this content.",
  },
  bearer_token: {
    severity: "high",
    confidence: "high",
    label: "Bearer token candidate",
    description: "A bearer authorization value needs review.",
    recommendation: "Remove the authorization value before sharing this content.",
  },
  aws_access_key: {
    severity: "high",
    confidence: "high",
    label: "AWS access key candidate",
    description: "An AWS access-key identifier needs review.",
    recommendation: "Remove the AWS credential before sharing this content.",
  },
  private_key: {
    severity: "critical",
    confidence: "high",
    label: "Private key header",
    description: "A private-key header needs immediate review.",
    recommendation: "Remove the private key material before sharing this content.",
  },
  environment_secret: {
    severity: "high",
    confidence: "medium",
    label: "Environment secret assignment",
    description: "An environment-style secret assignment needs review.",
    recommendation: "Remove the assignment value before sharing this content.",
  },
  url_secret: {
    severity: "high",
    confidence: "medium",
    label: "URL secret parameter",
    description: "A URL contains a secret-like query parameter.",
    recommendation: "Remove the query parameter before sharing this content.",
  },
  email_address: {
    severity: "low",
    confidence: "high",
    label: "Email address",
    description: "An email address may identify a person or account.",
    recommendation: "Remove the address before sharing this content if it is unnecessary.",
  },
  phone_number: {
    severity: "medium",
    confidence: "medium",
    label: "Phone number",
    description: "A phone-number-like value needs review.",
    recommendation: "Remove the number before sharing this content if it is unnecessary.",
  },
  national_id: {
    severity: "high",
    confidence: "medium",
    label: "National ID candidate",
    description: "A national-ID-like value needs review.",
    recommendation: "Remove the identifier before sharing this content.",
  },
  internal_url: {
    severity: "low",
    confidence: "high",
    label: "Internal address",
    description: "An internal host address was detected.",
    recommendation: "Remove the internal address before external sharing if it is unnecessary.",
  },
  private_ip: {
    severity: "low",
    confidence: "high",
    label: "Private network address",
    description: "A private-network address was detected.",
    recommendation: "Remove the private address before external sharing if it is unnecessary.",
  },
} as const satisfies Record<SensitiveFindingCategory, SensitiveFindingPresentation>
