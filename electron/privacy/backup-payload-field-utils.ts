import type { SensitivePayloadField } from "./library-payload-fields.js"
import { textField } from "./library-payload-fields.js"

export type BackupField = readonly [
  field: string,
  previewLabel: string,
  text: string | null | undefined,
]

type BackupLocationInput = {
  readonly entityId?: string
  readonly entityType: string
  readonly field: string
  readonly previewLabel: string
}

function backupLocation(input: BackupLocationInput) {
  return input.entityId === undefined
    ? { entityType: input.entityType, field: input.field, previewLabel: input.previewLabel }
    : {
        entityType: input.entityType,
        entityId: input.entityId,
        field: input.field,
        previewLabel: input.previewLabel,
      }
}

export function backupRowFields(input: {
  readonly entityId?: string
  readonly entityType: string
  readonly values: readonly BackupField[]
}): readonly SensitivePayloadField[] {
  return input.values.flatMap(([field, previewLabel, text]) => {
    const location =
      input.entityId === undefined
        ? backupLocation({ entityType: input.entityType, field, previewLabel })
        : backupLocation({
            entityId: input.entityId,
            entityType: input.entityType,
            field,
            previewLabel,
          })
    return textField(text, location)
  })
}
