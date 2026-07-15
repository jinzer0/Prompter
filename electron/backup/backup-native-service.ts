type SaveDialogFilter = {
  readonly name: string
  readonly extensions: readonly string[]
}

type SaveDialogOptions = {
  readonly defaultPath: string
  readonly filters: readonly SaveDialogFilter[]
}

type SaveDialogResult = {
  readonly canceled: boolean
  readonly filePath?: string
}

type OpenDialogResult = {
  readonly canceled: boolean
  readonly filePaths: readonly string[]
}

export type BackupNativeDependencies = {
  readonly showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogResult>
  readonly showOpenDialog: () => Promise<OpenDialogResult>
  readonly readFile: (filePath: string) => Promise<string>
  readonly getFileSize: (filePath: string) => Promise<number>
  readonly writeFile: (filePath: string, content: string) => Promise<void>
  readonly now: () => number
  readonly createId: () => string
  readonly hashText: (text: string) => string
  readonly getAppVersion?: () => string
}

type BackupSaveInput = {
  readonly content: string
  readonly defaultFilename: string
}

type BackupSaveResult = { readonly cancelled: true } | { readonly cancelled: false }

export class BackupNativeSaveDialogError extends Error {
  readonly name = "BackupNativeSaveDialogError"

  constructor() {
    super("Backup save dialog did not return a file path")
  }
}

export class BackupNativeWriteError extends Error {
  readonly name = "BackupNativeWriteError"

  constructor(cause: unknown) {
    super("Backup file could not be written", { cause })
  }
}

export class BackupNativeOpenDialogError extends Error {
  readonly name = "BackupNativeOpenDialogError"

  constructor() {
    super("Backup open dialog did not return a file path")
  }
}

export function createBackupNativeService(dependencies: BackupNativeDependencies) {
  return {
    async saveBackup(input: BackupSaveInput): Promise<BackupSaveResult> {
      const dialogResult = await dependencies.showSaveDialog({
        defaultPath: input.defaultFilename,
        filters: [{ name: "Prompter Backup", extensions: ["json"] }],
      })
      if (dialogResult.canceled) {
        return { cancelled: true }
      }
      if (dialogResult.filePath === undefined || dialogResult.filePath.trim().length === 0) {
        throw new BackupNativeSaveDialogError()
      }

      try {
        await dependencies.writeFile(dialogResult.filePath, input.content)
      } catch (error) {
        throw new BackupNativeWriteError(error)
      }

      return { cancelled: false }
    },
    async openBackupFile(): Promise<{ readonly cancelled: true } | { readonly filePath: string }> {
      const dialogResult = await dependencies.showOpenDialog()
      if (dialogResult.canceled) {
        return { cancelled: true }
      }
      const [filePath] = dialogResult.filePaths
      if (filePath === undefined || filePath.trim().length === 0) {
        throw new BackupNativeOpenDialogError()
      }
      return { filePath }
    },
    readBackupFile(filePath: string) {
      return dependencies.readFile(filePath)
    },
    getBackupFileSize(filePath: string) {
      return dependencies.getFileSize(filePath)
    },
    now() {
      return dependencies.now()
    },
    createId() {
      return dependencies.createId()
    },
    hashText(text: string) {
      return dependencies.hashText(text)
    },
    getAppVersion() {
      return dependencies.getAppVersion?.()
    },
  }
}

export type BackupNativeService = ReturnType<typeof createBackupNativeService>
