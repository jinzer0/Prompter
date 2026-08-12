export function canonicalizeRendererUrl(rawUrl: string): string {
  return new URL(rawUrl).toString()
}
