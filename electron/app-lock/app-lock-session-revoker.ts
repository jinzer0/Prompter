type AppLockSessionRevocationDependencies = {
  readonly privacyConfirmationSessions: {
    readonly revokePrivacyConfirmationSessions: () => void
  }
  readonly maintenanceActionSessions: {
    readonly revokeMaintenanceActionSessions: () => void
  }
  readonly backupExportSessions: {
    readonly revokeBackupExportSessions: () => void
  }
  readonly backupImportSessions: {
    readonly revokeBackupImportSessions: () => void
  }
  readonly encryptedBackupImportSessions: {
    readonly revokeEncryptedBackupImportSessions: () => void
  }
}

export function createAppLockSessionRevoker(dependencies: AppLockSessionRevocationDependencies) {
  return {
    revokeSensitiveSessions(): void {
      dependencies.privacyConfirmationSessions.revokePrivacyConfirmationSessions()
      dependencies.maintenanceActionSessions.revokeMaintenanceActionSessions()
      dependencies.backupExportSessions.revokeBackupExportSessions()
      dependencies.backupImportSessions.revokeBackupImportSessions()
      dependencies.encryptedBackupImportSessions.revokeEncryptedBackupImportSessions()
    },
  }
}
