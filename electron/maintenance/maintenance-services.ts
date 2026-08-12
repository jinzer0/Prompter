import type Database from "better-sqlite3"

import type { AppLockGuard } from "../app-lock/app-lock-guard.js"
import {
  createMaintenanceActionService,
  type MaintenanceActionConfirmationDecision,
  type MaintenanceActionConfirmationRequest,
  type MaintenanceActionService,
} from "./maintenance-action-service.js"
import {
  createMaintenanceActionSessionStore,
  type MaintenanceActionSessionStore,
} from "./maintenance-action-session-store.js"
import { createMaintenanceScanService, type MaintenanceScanService } from "./scan-service.js"

export type MaintenanceServices = MaintenanceScanService &
  Pick<MaintenanceActionService, "prepareAction" | "executeAction" | "cancelActionSession">

type MaintenanceServiceDependencies = {
  readonly sqlite: Database.Database
  readonly confirmAction: (
    request: MaintenanceActionConfirmationRequest,
  ) => Promise<MaintenanceActionConfirmationDecision>
  readonly sessions?: MaintenanceActionSessionStore
  readonly appLockGuard?: AppLockGuard
}

export function createMaintenanceServices(
  dependencies: MaintenanceServiceDependencies,
): MaintenanceServices {
  const sessions = dependencies.sessions ?? createMaintenanceActionSessionStore()

  return {
    ...createMaintenanceScanService(dependencies.sqlite),
    ...createMaintenanceActionService({
      sqlite: dependencies.sqlite,
      sessions,
      confirmAction: dependencies.confirmAction,
      ...(dependencies.appLockGuard === undefined
        ? {}
        : { appLockGuard: dependencies.appLockGuard }),
    }),
  }
}
