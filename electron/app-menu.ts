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
  readonly locked?: boolean
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
  locked = false,
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
              enabled: !locked,
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
    viewSubmenu.push(
      { role: "reload", enabled: !locked },
      { role: "toggleDevTools", enabled: !locked },
      { type: "separator" },
    )
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
          label: "Lock Prompter",
          accelerator: "CmdOrCtrl+Shift+L",
          enabled: !locked,
          click: () => sendAction("lockPrompter"),
        },
        { type: "separator" },
        {
          label: "New Prompt",
          accelerator: "CmdOrCtrl+N",
          enabled: !locked,
          click: () => sendAction("newPrompt"),
        },
        {
          label: "New Project",
          accelerator: "CmdOrCtrl+Shift+N",
          enabled: !locked,
          click: () => sendAction("newProject"),
        },
        {
          label: "Quick Capture from Clipboard",
          accelerator: "CmdOrCtrl+Shift+V",
          enabled: !locked,
          click: () => sendAction("quickCaptureFromClipboard"),
        },
        { type: "separator" },
        {
          label: "Save Prompt",
          accelerator: "CmdOrCtrl+S",
          enabled: !locked,
          click: () => sendAction("savePrompt"),
        },
        {
          label: "Export Prompt",
          enabled: !locked,
          click: () => sendAction("exportPrompt"),
        },
        { type: "separator" },
        {
          label: "Export Full Backup...",
          enabled: !locked,
          click: () => sendAction("exportFullBackup"),
        },
        {
          label: "Import Backup...",
          enabled: !locked,
          click: () => sendAction("importBackup"),
        },
        { type: "separator" },
        { role: isMac ? "close" : "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        ...editMenuItems.map((item) => ({ ...item, enabled: !locked })),
        { type: "separator" },
        {
          label: "Search",
          accelerator: "CmdOrCtrl+F",
          enabled: !locked,
          click: () => sendAction("focusSearch"),
        },
        {
          label: "Copy Compiled Prompt",
          accelerator: "CmdOrCtrl+Shift+C",
          enabled: !locked,
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
          label: "Library Insights",
          enabled: !locked,
          click: () => sendAction("openLibraryInsights"),
        },
        {
          label: "Library Maintenance",
          enabled: !locked,
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
