import type { z } from "zod"

import type {
  cancelMaintenanceActionSessionInputSchema,
  executeMaintenanceActionInputSchema,
  maintenanceActionResultSchema,
  maintenanceScanInputSchema,
  maintenanceScanResultSchema,
  preparedMaintenanceActionSchema,
  prepareMaintenanceActionInputSchema,
} from "./ipc-contract.js"

export type { ElectronBridge } from "./ipc-types.js"

export type MaintenanceBridge = {
  readonly scanLibrary: (
    input: z.input<typeof maintenanceScanInputSchema>,
  ) => Promise<z.output<typeof maintenanceScanResultSchema>>
  readonly prepareAction: (
    input: z.input<typeof prepareMaintenanceActionInputSchema>,
  ) => Promise<z.output<typeof preparedMaintenanceActionSchema>>
  readonly executeAction: (
    input: z.input<typeof executeMaintenanceActionInputSchema>,
  ) => Promise<z.output<typeof maintenanceActionResultSchema>>
  readonly cancelActionSession: (
    input: z.input<typeof cancelMaintenanceActionSessionInputSchema>,
  ) => Promise<void>
}
