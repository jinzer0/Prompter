import type { Locator, Page } from "@playwright/test"
import { expect } from "@playwright/test"

import { visualProjectAName, visualTagName } from "./phase18-insights-visual-electron-fixtures"

type ElementBounds = {
  readonly bottom: number
  readonly left: number
  readonly right: number
  readonly top: number
}

async function readBounds(locator: Locator): Promise<ElementBounds> {
  return locator.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return {
      bottom: bounds.bottom,
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
    }
  })
}

export async function expectTagDistributionRowsContained(page: Page): Promise<void> {
  const tags = page.getByRole("region", { name: "Tags" })
  const projectSection = tags.getByRole("region", { name: "Project tag distribution" })
  const scenarioSection = tags.getByRole("region", { name: "Scenario tag frequency" })
  const projectButton = projectSection.getByRole("button").first()
  const scenarioButton = scenarioSection.getByRole("button").first()
  const [projectSectionBounds, scenarioSectionBounds, projectButtonBounds, scenarioButtonBounds] =
    await Promise.all([
      readBounds(projectSection),
      readBounds(scenarioSection),
      readBounds(projectButton),
      readBounds(scenarioButton),
    ])
  const [projectNameBounds, projectMetadataBounds, scenarioNameBounds, scenarioMetadataBounds] =
    await Promise.all([
      readBounds(projectButton.locator(":scope > span").first()),
      readBounds(projectButton.locator(":scope > span").last()),
      readBounds(scenarioButton.locator(":scope > span").first()),
      readBounds(scenarioButton.locator(":scope > span").last()),
    ])

  expect(projectButtonBounds.left).toBeGreaterThanOrEqual(projectSectionBounds.left)
  expect(projectButtonBounds.right).toBeLessThanOrEqual(projectSectionBounds.right)
  expect(projectNameBounds.left).toBeGreaterThanOrEqual(projectButtonBounds.left)
  expect(projectNameBounds.right).toBeLessThanOrEqual(projectButtonBounds.right)
  expect(projectMetadataBounds.left).toBeGreaterThanOrEqual(projectButtonBounds.left)
  expect(projectMetadataBounds.right).toBeLessThanOrEqual(projectButtonBounds.right)
  expect(scenarioButtonBounds.left).toBeGreaterThanOrEqual(scenarioSectionBounds.left)
  expect(scenarioButtonBounds.right).toBeLessThanOrEqual(scenarioSectionBounds.right)
  expect(scenarioNameBounds.left).toBeGreaterThanOrEqual(scenarioButtonBounds.left)
  expect(scenarioNameBounds.right).toBeLessThanOrEqual(scenarioButtonBounds.right)
  expect(scenarioMetadataBounds.left).toBeGreaterThanOrEqual(scenarioButtonBounds.left)
  expect(scenarioMetadataBounds.right).toBeLessThanOrEqual(scenarioButtonBounds.right)
  await expect(projectButton).toHaveAccessibleName(new RegExp(visualProjectAName))
  await expect(scenarioButton).toHaveAccessibleName(new RegExp(visualTagName))

  const projectContentBounds = {
    bottom: Math.max(projectNameBounds.bottom, projectMetadataBounds.bottom),
    left: Math.min(projectNameBounds.left, projectMetadataBounds.left),
    right: Math.max(projectNameBounds.right, projectMetadataBounds.right),
    top: Math.min(projectNameBounds.top, projectMetadataBounds.top),
  }
  const scenarioContentBounds = {
    bottom: Math.max(scenarioNameBounds.bottom, scenarioMetadataBounds.bottom),
    left: Math.min(scenarioNameBounds.left, scenarioMetadataBounds.left),
    right: Math.max(scenarioNameBounds.right, scenarioMetadataBounds.right),
    top: Math.min(scenarioNameBounds.top, scenarioMetadataBounds.top),
  }
  const contentIntersects =
    projectContentBounds.left < scenarioContentBounds.right &&
    projectContentBounds.right > scenarioContentBounds.left &&
    projectContentBounds.top < scenarioContentBounds.bottom &&
    projectContentBounds.bottom > scenarioContentBounds.top
  expect(contentIntersects).toBe(false)
}
