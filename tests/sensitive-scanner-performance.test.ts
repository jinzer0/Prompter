import { describe, expect, it } from "vitest"

import type { SensitiveFinding } from "../electron/ipc-types.js"
import {
  buildSensitiveScanResult,
  scanSensitiveText,
} from "../electron/privacy/scan-sensitive-text.js"

const finding = (input: {
  readonly category?: SensitiveFinding["category"]
  readonly field: string
  readonly id: string
  readonly severity?: SensitiveFinding["severity"]
}): SensitiveFinding => ({
  id: input.id,
  severity: input.severity ?? "low",
  category: input.category ?? "email_address",
  label: "Sensitive candidate",
  description: "A sensitive candidate needs review.",
  location: { entityType: "draft", field: input.field },
  evidenceMasked: "se...et",
  confidence: "high",
  recommendation: "Remove the value before sharing.",
})

describe("Sensitive scanner bounded selection", () => {
  it("preserves priority winners, offsets, masking, deterministic IDs, and final ordering", () => {
    // Given: lower-priority patterns whose values overlap higher-priority key candidates.
    const firstKey = "sk-abcdefghijklmnopqrstuvwxyz"
    const secondKey = "sk-zyxwvutsrqponmlkjihgfedcba"
    const text = `API_KEY=${firstKey}\nhttps://example.test/?token=${secondKey}\nsafe@example.test`

    // When: the scanner resolves overlapping candidates twice.
    const first = scanSensitiveText({ source: "draft", text })
    const second = scanSensitiveText({ source: "draft", text })

    // Then: key candidates win both overlaps and all observable projections remain stable.
    expect(
      first.findings.map(({ category, startOffset, endOffset, evidenceMasked }) => ({
        category,
        startOffset,
        endOffset,
        evidenceMasked,
      })),
    ).toEqual([
      {
        category: "openai_api_key",
        startOffset: text.indexOf(firstKey),
        endOffset: text.indexOf(firstKey) + firstKey.length,
        evidenceMasked: "sk-abcde...wxyz",
      },
      {
        category: "openai_api_key",
        startOffset: text.indexOf(secondKey),
        endOffset: text.indexOf(secondKey) + secondKey.length,
        evidenceMasked: "sk-zyxwv...dcba",
      },
      {
        category: "email_address",
        startOffset: text.indexOf("safe@example.test"),
        endOffset: text.length,
        evidenceMasked: "sa...test",
      },
    ])
    expect(second.findings.map(({ id }) => id)).toEqual(first.findings.map(({ id }) => id))
  })

  it("keeps the first finding for each ID before applying the existing final sort", () => {
    // Given: duplicate IDs with different data interleaved in reverse final order.
    const firstDuplicate = finding({
      id: "duplicate",
      field: "field-b",
      severity: "high",
      category: "github_token",
    })
    const findings = [
      firstDuplicate,
      finding({ id: "unique", field: "field-a" }),
      finding({ id: "duplicate", field: "field-c" }),
    ]

    // When: findings are deduplicated and ordered for a scan result.
    const result = buildSensitiveScanResult("draft", findings)

    // Then: the first duplicate survives and sorting still follows location fields.
    expect(result.findings).toEqual([findings[1], firstDuplicate])
    expect(result.highCount).toBe(1)
    expect(result.lowCount).toBe(1)
  })

  it("scans 25k candidates and sorts 20k findings within two seconds", () => {
    // Given: 25k non-overlapping candidates and 20k findings in reverse final order.
    const text = Array.from(
      { length: 25_000 },
      (_, index) => `user${String(index).padStart(5, "0")}@example.test`,
    ).join(" ")
    const findings = Array.from({ length: 20_000 }, (_, offset) => {
      const index = 19_999 - offset
      return finding({
        id: `finding-${index}`,
        field: `field-${String(index).padStart(5, "0")}`,
      })
    })

    // When: both public scanner paths process their bounded workloads.
    const scanned = scanSensitiveText({ source: "draft", text })
    const built = buildSensitiveScanResult("draft", findings)

    // Then: source coverage and the established final ordering remain intact.
    expect(scanned.findings[0]?.startOffset).toBe(0)
    expect(scanned.findings.at(-1)?.endOffset).toBe(text.length)
    expect(built.findingCount).toBe(20_000)
    expect(built.findings[0]?.id).toBe("finding-0")
    expect(built.findings.at(-1)?.id).toBe("finding-19999")
  }, 2_000)
})
