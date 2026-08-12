import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export async function openApp(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /稀有的是条件组合/ })).toBeVisible()
}

export async function goToStep(page: Page, stepNumber: number, label: string) {
  await page.getByRole('button', {
    name: new RegExp(`第 ${stepNumber} 步，共 7 步：${label}`),
  }).click()
}

export function desktopEstimate(page: Page) {
  return page.locator('.desktop-result .result-number')
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.clientWidth + 1)
}

export async function expectNoSeriousAxeViolations(page: Page) {
  // Axe must inspect the settled colors. Scanning during the 140–170ms dialog
  // fade measures a translucent intermediate frame against the dark backdrop.
  await page.evaluate(async () => {
    const animations = document.getAnimations()
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
  })
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const violations = result.violations.filter((violation) =>
    violation.impact === 'serious' || violation.impact === 'critical',
  )
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
}

export async function selectDimension(page: Page, searchTerm: string, cardText: string) {
  const search = page.getByRole('searchbox', { name: '搜索维度' })
  await search.fill(searchTerm)
  const card = page.locator('.dimension-card').filter({ hasText: cardText }).first()
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: '加入条件' }).click()
  await expect(card.getByRole('button', { name: '已加入' })).toHaveAttribute('aria-pressed', 'true')
}
