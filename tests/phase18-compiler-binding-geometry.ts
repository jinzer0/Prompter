import type { Locator } from "@playwright/test"
import { expect } from "@playwright/test"

type GeometryBox = {
  readonly height: number
  readonly width: number
  readonly x: number
  readonly y: number
}

async function requiredGeometryBox(locator: Locator): Promise<GeometryBox> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new TypeError("Expected visible compiler binding geometry")
  }
  return box
}

export async function expectCompilerBindingNoticeGeometry(
  notice: Locator,
  projectName: string,
): Promise<void> {
  const paragraph = notice.locator("#compiler-project-rebind-description")
  const button = notice.getByRole("button", {
    name: `Rebind compiler to ${projectName}`,
    exact: true,
  })
  await expect(button).toHaveText("Rebind compiler")
  await expect(button).toHaveAccessibleName(`Rebind compiler to ${projectName}`)

  const [noticeBox, paragraphBox, buttonBox, noticeOverflow, buttonOverflow] = await Promise.all([
    requiredGeometryBox(notice),
    requiredGeometryBox(paragraph),
    requiredGeometryBox(button),
    notice.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    })),
    button.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      scrollWidth: element.scrollWidth,
      whiteSpace: getComputedStyle(element).whiteSpace,
    })),
  ])
  const noticeRight = noticeBox.x + noticeBox.width
  const noticeBottom = noticeBox.y + noticeBox.height

  expect(paragraphBox.x).toBeGreaterThanOrEqual(noticeBox.x)
  expect(paragraphBox.x + paragraphBox.width).toBeLessThanOrEqual(noticeRight)
  expect(buttonBox.x).toBeGreaterThanOrEqual(noticeBox.x)
  expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(noticeRight)
  expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(noticeBottom)
  expect(paragraphBox.width).toBeGreaterThanOrEqual(noticeBox.width * 0.75)
  expect(buttonBox.y).toBeGreaterThanOrEqual(paragraphBox.y + paragraphBox.height)
  expect(noticeOverflow.scrollWidth).toBeLessThanOrEqual(noticeOverflow.clientWidth)
  expect(buttonOverflow.scrollWidth).toBeLessThanOrEqual(buttonOverflow.clientWidth)
  expect(buttonOverflow.scrollHeight).toBeLessThanOrEqual(buttonBox.height)
  expect(buttonOverflow.whiteSpace).toBe("nowrap")
}

export async function expectProfileSelectChevronGeometry(select: Locator): Promise<void> {
  const geometry = await select.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      clientWidth: element.clientWidth,
      paddingRight: Number.parseFloat(style.paddingRight),
      scrollWidth: element.scrollWidth,
    }
  })

  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth)
  expect(geometry.paddingRight).toBeGreaterThanOrEqual(32)
  await expect(select).toHaveClass(/(?:^|\s)truncate(?:\s|$)/)
}
