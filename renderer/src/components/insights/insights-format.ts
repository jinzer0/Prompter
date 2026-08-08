export function formatInsightCount(value: number): string {
  return value.toLocaleString("en-US")
}

export function formatInsightScore(value: number | null): string {
  return value === null ? "Not available" : value.toFixed(1)
}

export function formatInsightTimestamp(value: number | null): string {
  return value === null ? "No activity" : new Date(value).toISOString().slice(0, 10)
}

export function formatInsightLabel(value: string): string {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}
