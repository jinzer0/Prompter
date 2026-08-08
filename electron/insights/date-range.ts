import type { InsightsDateRange } from "../ipc-types.js"

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

const DATE_RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
} as const

export function insightsDateRangeStart(dateRange: InsightsDateRange, now: number): number | null {
  if (dateRange === "all") {
    return null
  }

  if (dateRange === "year") {
    const currentDate = new Date(now)
    return new Date(currentDate.getFullYear(), 0, 1).getTime()
  }

  return now - DATE_RANGE_DAYS[dateRange] * DAY_IN_MILLISECONDS
}
