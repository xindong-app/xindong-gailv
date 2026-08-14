import { expect, test } from '@playwright/test'
import {
  expectNoHorizontalOverflow,
  expectNoSeriousAxeViolations,
  goToStep,
  openApp,
} from './helpers'

test('15 键盘：跳转、步骤、表单、对话框均可完成', async ({ page }) => {
  await openApp(page)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: '跳到主要内容' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeInViewport()

  await page.getByRole('button', { name: /开筛/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: /先圈出/ })).toBeFocused()

  await page.getByRole('button', { name: '隐私说明' }).focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: '隐私与安全' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: '隐私说明' })).toBeFocused()
})

test('16 reduced-motion：系统偏好下核心流程仍可用且动画被禁用', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openApp(page)
  await goToStep(page, 2, '基础范围')
  await page.getByRole('button', { name: '北京' }).click()
  await expect(page.getByRole('button', { name: '北京' })).toHaveAttribute('aria-pressed', 'true')

  const motion = await page.evaluate(() => {
    const style = getComputedStyle(document.querySelector('.step-panel')!)
    return { animationDuration: style.animationDuration, transitionDuration: style.transitionDuration }
  })
  expect(Number.parseFloat(motion.animationDuration)).toBeLessThanOrEqual(0.00001)
  expect(Number.parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(0.00001)
})

test('17 离线：不依赖外部字体和 API，计算与解释仍可用', async ({ page, context }) => {
  await openApp(page)
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))

  await expect(page.getByRole('status').filter({ hasText: '当前离线' })).toBeVisible()
  await goToStep(page, 5, '敏感与娱乐')
  await page.getByRole('button', { name: /敏感人口条件与偏好/ }).click()
  await page.getByRole('button', { name: '当前不吸烟', exact: true }).click()
  await expect(page.locator('.stage-scoreboard .slot-number')).not.toHaveAttribute('aria-label', '')
  const externalResources = await page.evaluate(() => performance.getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => /^https?:/.test(url) && !url.startsWith(location.origin)))
  expect(externalResources).toEqual([])
})

test('18 手机与桌面关键流程：结果入口语义正确', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openApp(page)
  const mobileResult = page.locator('.mobile-result-bar button')
  await expect(mobileResult).toBeVisible()
  await expect(mobileResult).toHaveAttribute('aria-expanded', 'false')
  await mobileResult.click()
  await expect(mobileResult).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('dialog', { name: '实时结果' })).toBeVisible()

  await page.getByRole('button', { name: '关闭对话框' }).click()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.getByRole('region', { name: '小人剧场' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('200% 缩放等效窄视口：核心内容可达且不产生横向滚动', async ({ page }) => {
  // 1440px 桌面在 200% 页面缩放下约等效 720 CSS px；用该布局视口验证重排与可达性。
  await page.setViewportSize({ width: 720, height: 450 })
  await openApp(page)
  await goToStep(page, 4, '维度库')
  await expectNoHorizontalOverflow(page)
  await expect(page.getByRole('searchbox', { name: '搜索维度' })).toBeVisible()
  await goToStep(page, 7, '调整与分享')
  await page.getByRole('button', { name: '打开分享预览' }).click()
  await expect(page.getByRole('dialog', { name: '分享前隐私预览' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('reduced-motion：步骤切换不触发脚本平滑滚动', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const calls: ScrollToOptions[] = []
    Object.defineProperty(window, '__scrollOptions', { configurable: true, value: calls })
    window.scrollTo = (options?: ScrollToOptions | number, y?: number) => {
      if (typeof options === 'object') calls.push(options)
      else calls.push({ left: options, top: y })
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: /开筛/ }).click()
  const options = await page.evaluate(() => (window as Window & { __scrollOptions?: ScrollToOptions[] }).__scrollOptions ?? [])
  expect(options.at(-1)?.behavior).toBe('auto')
})

for (const width of [320, 360, 390, 768, 1024, 1440]) {
  test(`响应式 ${width}px：无非预期横向滚动`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 })
    await openApp(page)
    await expectNoHorizontalOverflow(page)
    await goToStep(page, 4, '维度库')
    await expectNoHorizontalOverflow(page)
    await goToStep(page, 6, '结果解释')
    await expectNoHorizontalOverflow(page)
  })
}

test('axe：欢迎页、表单、维度库、结果与分享预览 serious/critical 为 0', async ({ page }) => {
  await openApp(page)
  await expectNoSeriousAxeViolations(page)
  for (const [number, label] of [[2, '基础范围'], [3, '核心条件'], [4, '维度库'], [6, '结果解释']] as const) {
    await goToStep(page, number, label)
    await expectNoSeriousAxeViolations(page)
  }
  await goToStep(page, 7, '调整与分享')
  await page.getByRole('button', { name: '打开分享预览' }).click()
  await expectNoSeriousAxeViolations(page)
})

test('console 与生产网络：关键流程无错误且无第三方业务请求', async ({ page }) => {
  const errors: string[] = []
  const external: string[] = []
  const networkFailures: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.origin !== 'http://127.0.0.1:4173') external.push(request.url())
  })
  page.on('requestfailed', (request) => {
    networkFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText ?? 'unknown error'}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) networkFailures.push(`${response.status()} ${response.url()}`)
  })

  await openApp(page)
  await goToStep(page, 5, '敏感与娱乐')
  await page.getByRole('button', { name: /敏感人口条件与偏好/ }).click()
  await page.getByRole('button', { name: '当前不吸烟', exact: true }).click()
  await goToStep(page, 6, '结果解释')
  await expect(page.getByRole('heading', { name: '先看战况，再看谁是守门员' })).toBeVisible()

  expect(errors).toEqual([])
  expect(external).toEqual([])
  expect(networkFailures).toEqual([])
})
