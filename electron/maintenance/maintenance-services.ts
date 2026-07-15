import type Database from "better-sqlite3"

import {
  createMaintenanceActionService,
  type MaintenanceActionConfirmationDecision,
  type MaintenanceActionConfirmationRequest,
  type MaintenanceActionService,
} from "./maintenance-action-service.js"
import { createMaintenanceActionSessionStore } from "./maintenance-action-session-store.js"
import { createMaintenanceScanService, type MaintenanceScanService } from "./scan-service.js"

export type MaintenanceServices = MaintenanceScanService &
  Pick<MaintenanceActionService, "prepareAction" | "executeAction" | "cancelActionSession">

type MaintenanceServiceDependencies = {
  readonly sqlite: Database.Database
  readonly confirmAction: (
    request: MaintenanceActionConfirmationRequest,
  ) => Promise<MaintenanceActionConfirmationDecision>
}

export function createMaintenanceServices(
  dependencies: MaintenanceServiceDependencies,
): MaintenanceServices {
  const sessions = createMaintenanceActionSessionStore()

  return {
    ...createMaintenanceScanService(dependencies.sqlite),
    ...createMaintenanceActionService({
      sqlite: dependencies.sqlite,
      sessions,
      confirmAction: dependencies.confirmAction,
    }),
  }
}
