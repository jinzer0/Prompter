import { z } from "zod"

export function registeredSchema(registry: object, name: string): z.ZodType {
  const schema = Reflect.get(registry, name)

  if (!(schema instanceof z.ZodType)) {
    throw new Error(`IPC schema is not registered: ${name}`)
  }

  return schema
}
