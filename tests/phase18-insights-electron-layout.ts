import type { Page } from "@playwright/test"

export type InsightsLayoutSnapshot = {
  readonly dashboardClientHeight: number
  readonly dashboardClientWidth: number
  readonly dashboardScrollHeight: number
  readonly dashboardScrollWidth: number
  readonly documentHeight: number
  readonly gridHeight: number
  readonly gridWidth: number
  readonly shellClientWidth: number
  readonly shellScrollWidth: number
  readonly sidebarClientHeight: number
  readonly sidebarClientWidth: number
  readonly sidebarHeight: number
  readonly sidebarScrollHeight: number
  readonly sidebarScrollWidth: number
  readonly viewportHeight: number
  readonly viewportWidth: number
  readonly workspaceHeight: number
  readonly workspaceWidth: number
}

export async function readInsightsLayout(page: Page): Promise<InsightsLayoutSnapshot> {
  return page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>('[data-testid="app-shell"]')
    const grid = document.querySelector<HTMLElement>(".prompter-shell-grid")
    const sidebar = document.querySelector<HTMLElement>('[data-testid="left-sidebar"]')
    const workspace = document.querySelector<HTMLElement>('[data-testid="insights-workspace"]')
    const dashboard = document.querySelector<HTMLElement>(
      'section[aria-labelledby="insights-dashboard-heading"]',
    )
    if (
      shell === null ||
      grid === null ||
      sidebar === null ||
      workspace === null ||
      dashboard === null
    ) {
      throw new TypeError("Expected complete Insights shell geometry")
    }
    return {
      dashboardClientHeight: dashboard.clientHeight,
      dashboardClientWidth: dashboard.clientWidth,
      dashboardScrollHeight: dashboard.scrollHeight,
      dashboardScrollWidth: dashboard.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      gridHeight: grid.getBoundingClientRect().height,
      gridWidth: grid.getBoundingClientRect().width,
      shellClientWidth: shell.clientWidth,
      shellScrollWidth: shell.scrollWidth,
      sidebarClientHeight: sidebar.clientHeight,
      sidebarClientWidth: sidebar.clientWidth,
      sidebarHeight: sidebar.getBoundingClientRect().height,
      sidebarScrollHeight: sidebar.scrollHeight,
      sidebarScrollWidth: sidebar.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      workspaceHeight: workspace.getBoundingClientRect().height,
      workspaceWidth: workspace.getBoundingClientRect().width,
    }
  })
}

export async function scrollInsightsSurfaces(
  page: Page,
  position: "bottom" | "top",
): Promise<void> {
  await page.evaluate((targetPosition) => {
    const sidebar = document.querySelector<HTMLElement>('[data-testid="left-sidebar"]')
    const dashboard = document.querySelector<HTMLElement>(
      'section[aria-labelledby="insights-dashboard-heading"]',
    )
    if (sidebar === null || dashboard === null) {
      throw new TypeError("Expected scrollable Insights surfaces")
    }
    const scrollTop = targetPosition === "bottom" ? Number.MAX_SAFE_INTEGER : 0
    sidebar.scrollTop = scrollTop
    dashboard.scrollTop = scrollTop
  }, position)
}
