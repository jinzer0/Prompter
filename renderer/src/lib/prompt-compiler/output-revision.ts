export type OutputRevisionGate = {
  readonly advance: () => number
  readonly current: () => number
  readonly isCurrent: (revision: number) => boolean
}

export function createOutputRevisionGate(initialRevision = 0): OutputRevisionGate {
  let revision = initialRevision

  return {
    advance: () => {
      revision += 1
      return revision
    },
    current: () => revision,
    isCurrent: (candidate) => candidate === revision,
  }
}

export async function resolveRevisionedResponse<Result>(
  response: Promise<Result>,
  requestedRevision: number,
  gate: OutputRevisionGate,
): Promise<Result | null> {
  return resolveCurrentRevisionResponse(response, requestedRevision, gate.current)
}

export async function resolveCurrentRevisionResponse<Result, Revision>(
  response: Promise<Result>,
  requestedRevision: Revision,
  currentRevision: () => Revision,
): Promise<Result | null> {
  const result = await response
  return currentRevision() === requestedRevision ? result : null
}
