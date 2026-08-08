import type { QualityScoreBucket } from "../ipc-types.js"

export const QUALITY_SCORE_BUCKETS = {
  excellent: 90,
  good: 75,
  usable: 60,
  needs_work: 40,
  weak: 0,
} as const satisfies Record<Exclude<QualityScoreBucket, "no_score">, number>

export function qualityBucketForScore(score: number | null): QualityScoreBucket {
  if (score === null) {
    return "no_score"
  }

  if (score >= QUALITY_SCORE_BUCKETS.excellent) {
    return "excellent"
  }

  if (score >= QUALITY_SCORE_BUCKETS.good) {
    return "good"
  }

  if (score >= QUALITY_SCORE_BUCKETS.usable) {
    return "usable"
  }

  if (score >= QUALITY_SCORE_BUCKETS.needs_work) {
    return "needs_work"
  }

  return "weak"
}
