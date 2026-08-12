import type { SensitiveFindingCategory } from "./sensitive-patterns.js"

export type SensitiveCandidate = {
  readonly category: SensitiveFindingCategory
  readonly endOffset: number
  readonly priority: number
  readonly startOffset: number
  readonly visiblePrefix: string
  readonly visibleSuffix: string
}

function overlaps(left: SensitiveCandidate, right: SensitiveCandidate): boolean {
  return left.startOffset < right.endOffset && right.startOffset < left.endOffset
}

function comparePosition(left: SensitiveCandidate, right: SensitiveCandidate): number {
  return (
    left.startOffset - right.startOffset ||
    left.endOffset - right.endOffset ||
    left.category.localeCompare(right.category)
  )
}

function mergeByPosition(
  left: readonly SensitiveCandidate[],
  right: readonly SensitiveCandidate[],
): readonly SensitiveCandidate[] {
  const merged: SensitiveCandidate[] = []
  let leftIndex = 0
  let rightIndex = 0

  while (leftIndex < left.length || rightIndex < right.length) {
    const leftCandidate = left[leftIndex]
    const rightCandidate = right[rightIndex]
    if (leftCandidate === undefined) {
      if (rightCandidate === undefined) {
        break
      }
      merged.push(rightCandidate)
      rightIndex += 1
    } else if (
      rightCandidate === undefined ||
      comparePosition(leftCandidate, rightCandidate) <= 0
    ) {
      merged.push(leftCandidate)
      leftIndex += 1
    } else {
      merged.push(rightCandidate)
      rightIndex += 1
    }
  }

  return merged
}

export function selectNonOverlappingCandidates(
  detected: readonly SensitiveCandidate[],
): readonly SensitiveCandidate[] {
  const prioritized = [...detected].sort(
    (left, right) =>
      left.priority - right.priority ||
      left.startOffset - right.startOffset ||
      right.endOffset - left.endOffset ||
      left.category.localeCompare(right.category),
  )
  let accepted: readonly SensitiveCandidate[] = []
  let priorityStart = 0

  while (priorityStart < prioritized.length) {
    const firstCandidate = prioritized[priorityStart]
    if (firstCandidate === undefined) {
      break
    }

    let priorityEnd = priorityStart + 1
    while (prioritized[priorityEnd]?.priority === firstCandidate.priority) {
      priorityEnd += 1
    }

    const acceptedAtPriority: SensitiveCandidate[] = []
    let acceptedIndex = 0
    for (let index = priorityStart; index < priorityEnd; index += 1) {
      const candidate = prioritized[index]
      if (candidate === undefined) {
        break
      }

      let lowerPriorityCandidate = accepted[acceptedIndex]
      while (
        lowerPriorityCandidate !== undefined &&
        lowerPriorityCandidate.endOffset <= candidate.startOffset
      ) {
        acceptedIndex += 1
        lowerPriorityCandidate = accepted[acceptedIndex]
      }

      const samePriorityCandidate = acceptedAtPriority.at(-1)
      if (
        (lowerPriorityCandidate === undefined || !overlaps(lowerPriorityCandidate, candidate)) &&
        (samePriorityCandidate === undefined || !overlaps(samePriorityCandidate, candidate))
      ) {
        acceptedAtPriority.push(candidate)
      }
    }

    accepted = mergeByPosition(accepted, acceptedAtPriority)
    priorityStart = priorityEnd
  }

  return accepted
}
