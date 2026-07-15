import type { MenuItemConstructorOptions } from "electron"
import {
  MENU_ACTION_CHANNEL,
  MENU_ACTIONS,
  type MenuAction,
  menuActionSchema,
} from "./ipc-types.js"

export type { MenuAction }
export { MENU_ACTION_CHANNEL, MENU_ACTIONS, menuActionSchema }

type ApplicationMenuTemplateConfig = {
  readonly isDevelopment: boolean
  readonly isMac: boolean
  readonly sendAction: (action: MenuAction) => void
}

const editMenuItems = [
  { role: "undo" },
  { role: "redo" },
  { type: "separator" },
  { role: "cut" },
  { role: "copy" },
  { role: "paste" },
  { role: "selectAll" },
] as const satisfies readonly MenuItemConstructorOptions[]

const zoomMenuItems = [
  { role: "zoomIn" },
  { role: "zoomOut" },
  { role: "resetZoom" },
] as const satisfies readonly MenuItemConstructorOptions[]

export function createApplicationMenuTemplate({
  isDevelopment,
  isMac,
  sendAction,
}: ApplicationMenuTemplateConfig): MenuItemConstructorOptions[] {
  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: "Prompter",
          submenu: [
            { role: "about" },
            { type: "separator" },
            {
              label: "Settings...",
              accelerator: "CmdOrCtrl+,",
              click: () => sendAction("openSettings"),
            },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : []

  const viewSubmenu: MenuItemConstructorOptions[] = []
  if (isDevelopment) {
    viewSubmenu.push({ role: "reload" }, { role: "toggleDevTools" }, { type: "separator" })
  }
  viewSubmenu.push(...zoomMenuItems)

  const windowSubmenu: MenuItemConstructorOptions[] = [{ role: "minimize" }, { role: "close" }]
  if (isMac) {
    windowSubmenu.push({ role: "front" })
  }

  return [
    ...appMenu,
    {
      label: "File",
      submenu: [
        {
          label: "New Prompt",
          accelerator: "CmdOrCtrl+N",
          click: () => sendAction("newPrompt"),
        },
        {
          label: "New Project",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => sendAction("newProject"),
        },
        {
          label: "Quick Capture from Clipboard",
          accelerator: "CmdOrCtrl+Shift+V",
          click: () => sendAction("quickCaptureFromClipboard"),
        },
        { type: "separator" },
        {
          label: "Save Prompt",
          accelerator: "CmdOrCtrl+S",
          click: () => sendAction("savePrompt"),
        },
        {
          label: "Export Prompt",
          click: () => sendAction("exportPrompt"),
        },
        { type: "separator" },
        {
          label: "Export Full Backup...",
          click: () => sendAction("exportFullBackup"),
        },
        {
          label: "Import Backup...",
          click: () => sendAction("importBackup"),
        },
        { type: "separator" },
        { role: isMac ? "close" : "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        ...editMenuItems,
        { type: "separator" },
        {
          label: "Search",
          accelerator: "CmdOrCtrl+F",
          click: () => sendAction("focusSearch"),
        },
        {
          label: "Copy Compiled Prompt",
          accelerator: "CmdOrCtrl+Shift+C",
          click: () => sendAction("copyCompiledPrompt"),
        },
        {
          label: "Close Active Panel",
          accelerator: "Esc",
          click: () => sendAction("closeActivePanel"),
        },
      ],
    },
    { label: "View", submenu: viewSubmenu },
    {
      label: "Tools",
      submenu: [
        {
          label: "Library Maintenance",
          click: () => sendAction("openLibraryMaintenance"),
        },
      ],
    },
    {
      label: "Window",
      submenu: windowSubmenu,
    },
    {
      label: "Help",
      submenu: [{ label: "Prompter Help", enabled: false }],
    },
  ]
}
