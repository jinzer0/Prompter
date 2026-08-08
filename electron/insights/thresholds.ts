export const VERSION_HEAVY_PROMPT_THRESHOLD = 5
export const STALE_CURRENT_VERSION_AGE_DAYS = 90

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

export function isVersionHeavy(versionCount: number): boolean {
  return versionCount >= VERSION_HEAVY_PROMPT_THRESHOLD
}

export function isCurrentVersionStale(currentVersionCreatedAt: number, now: number): boolean {
  const staleBefore = now - STALE_CURRENT_VERSION_AGE_DAYS * DAY_IN_MILLISECONDS
  return currentVersionCreatedAt < staleBefore
}
