import { maskPlanForCategory, maskSensitiveEvidence } from "./mask-sensitive-evidence.js"
import type {
  ScanSensitiveTextInput,
  SensitiveFinding,
  SensitiveScanResult,
} from "./privacy-schemas.js"
import {
  type SensitiveCandidate,
  selectNonOverlappingCandidates,
} from "./sensitive-candidate-selection.js"
import {
  SENSITIVE_FINDING_PRESENTATIONS,
  SENSITIVE_PATTERNS,
  type SensitivePattern,
} from "./sensitive-patterns.js"

export const SENSITIVE_TEXT_SCAN_LIMIT = 1_000_000

export type SensitiveScanSource = ScanSensitiveTextInput["source"]

function candidateFromMatch(
  pattern: SensitivePattern,
  match: RegExpExecArray,
): SensitiveCandidate | null {
  const start = match.index
  const matched = pattern.valueGroup === undefined ? match[0] : groupedValue(pattern, match)
  if (matched === undefined || matched.length === 0) {
    return null
  }

  const relativeStart = pattern.valueGroup === undefined ? 0 : match[0].lastIndexOf(matched)
  if (relativeStart < 0) {
    return null
  }

  const maskPlan = maskPlanForCategory(pattern.category, matched.length)
  return {
    category: pattern.category,
    startOffset: start + relativeStart,
    endOffset: start + relativeStart + matched.length,
    priority: pattern.priority,
    visiblePrefix: matched.slice(0, maskPlan.prefix),
    visibleSuffix: matched.slice(matched.length - maskPlan.suffix),
  }
}

function groupedValue(pattern: SensitivePattern, match: RegExpExecArray): string | undefined {
  const valueGroup = pattern.valueGroup
  if (valueGroup === undefined) {
    return undefined
  }

  if (valueGroup === "environment") {
    return (
      match.groups?.["secret"] ?? match.groups?.["secretSingle"] ?? match.groups?.["secretPlain"]
    )
  }

  return match.groups?.[valueGroup]
}

function candidates(text: string): readonly SensitiveCandidate[] {
  const detected: SensitiveCandidate[] = []
  for (const pattern of SENSITIVE_PATTERNS) {
    const expression = new RegExp(pattern.expression.source, pattern.expression.flags)
    for (const match of text.matchAll(expression)) {
      const candidate = candidateFromMatch(pattern, match)
      if (candidate !== null) {
        detected.push(candidate)
      }
    }
  }

  return selectNonOverlappingCandidates(detected)
}

function deterministicId(
  candidate: SensitiveCandidate,
  location: SensitiveFinding["location"],
): string {
  const input = [
    candidate.category,
    location.entityType,
    location.entityId ?? "",
    location.field,
    location.previewLabel ?? "",
    String(candidate.startOffset),
    String(candidate.endOffset),
  ].join("\u0000")
  let hash = 2_166_136_261
  for (const character of input) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619)
  }
  return `sensitive-${(hash >>> 0).toString(16).padStart(8, "0")}`
}

function finding(
  candidate: SensitiveCandidate,
  location: SensitiveFinding["location"],
): SensitiveFinding {
  const presentation = SENSITIVE_FINDING_PRESENTATIONS[candidate.category]
  return {
    id: deterministicId(candidate, location),
    severity: presentation.severity,
    category: candidate.category,
    label: presentation.label,
    description: presentation.description,
    location,
    evidenceMasked: maskSensitiveEvidence({
      totalLength: candidate.endOffset - candidate.startOffset,
      visiblePrefix: candidate.visiblePrefix,
      visibleSuffix: candidate.visibleSuffix,
    }),
    startOffset: candidate.startOffset,
    endOffset: candidate.endOffset,
    confidence: presentation.confidence,
    recommendation: presentation.recommendation,
  }
}

function sortFindings(findings: readonly SensitiveFinding[]): readonly SensitiveFinding[] {
  const seenIds = new Set<string>()
  return findings
    .filter((finding) => {
      if (seenIds.has(finding.id)) {
        return false
      }
      seenIds.add(finding.id)
      return true
    })
    .sort(
      (left, right) =>
        left.location.entityType.localeCompare(right.location.entityType) ||
        (left.location.entityId ?? "").localeCompare(right.location.entityId ?? "") ||
        left.location.field.localeCompare(right.location.field) ||
        (left.startOffset ?? 0) - (right.startOffset ?? 0) ||
        (left.endOffset ?? 0) - (right.endOffset ?? 0) ||
        left.category.localeCompare(right.category),
    )
}

export function buildSensitiveScanResult(
  source: SensitiveScanSource,
  findings: readonly SensitiveFinding[],
  warnings: readonly string[] = [],
): SensitiveScanResult {
  const sortedFindings = sortFindings(findings)
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const finding of sortedFindings) {
    counts[finding.severity] += 1
  }
  const requiresConfirmation = counts.critical > 0 || counts.high > 0

  return {
    scannedAt: Date.now(),
    source,
    findingCount: sortedFindings.length,
    criticalCount: counts.critical,
    highCount: counts.high,
    mediumCount: counts.medium,
    lowCount: counts.low,
    findings: sortedFindings,
    safeToProceed: !requiresConfirmation,
    warnings: requiresConfirmation
      ? [...warnings, "High-risk findings require confirmation."]
      : [...warnings],
  }
}

export function scanSensitiveText(input: ScanSensitiveTextInput): SensitiveScanResult {
  const location = input.location ?? { entityType: input.source, field: "text" }
  return buildSensitiveScanResult(
    input.source,
    candidates(input.text).map((candidate) => finding(candidate, location)),
  )
}
