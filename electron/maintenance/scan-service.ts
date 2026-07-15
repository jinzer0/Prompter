import type Database from "better-sqlite3"

import { maintenanceScanInputSchema, maintenanceScanResultSchema } from "../ipc-contract.js"
import type { MaintenanceScanInput, MaintenanceScanResult } from "../ipc-types.js"
import { buildMaintenanceScanResult } from "./scan-report.js"
import { readMaintenanceScanSnapshot } from "./scan-snapshot.js"

export type MaintenanceScanService = {
  readonly scanLibrary: (input: MaintenanceScanInput) => MaintenanceScanResult
}

export function createMaintenanceScanService(sqlite: Database.Database): MaintenanceScanService {
  return {
    scanLibrary(input) {
      const parsedInput = maintenanceScanInputSchema.parse(input)
      return maintenanceScanResultSchema.parse(
        buildMaintenanceScanResult(readMaintenanceScanSnapshot(sqlite, parsedInput), parsedInput),
      )
    },
  }
}
