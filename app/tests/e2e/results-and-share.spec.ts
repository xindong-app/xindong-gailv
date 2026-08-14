import { expect, test } from '@playwright/test'
import { desktopEstimate, desktopEstimateLabel, goToStep, openApp, selectDimension } from './helpers'

async function setExtremeConditions(page: import('@playwright/test').Page) {
  await goToStep(page, 3, '核心条件')
  await page.getByRole('button', { name: '设置范围' }).click()
  const heightCard = page.locator('.criteria-card').filter({
    has: page.getByRole('heading', { name: '身高范围' }),
  })
  await heightCard.getByRole('slider').first().fill('210')
  await page.getByLabel('最低税前年收入（万元）').fill('10000')
  await page.getByLabel('最低家庭资产（万元）').fill('1000000')
}

test('10 结果状态：普通结果与低于模型分辨率均诚实表达', async ({ page }) => {
  await openApp(page)
  await goToStep(page, 6, '结果解释')

  await expect(page.getByText('保守').first()).toBeVisible()
  await expect(page.getByText('基准').first()).toBeVisible()
  await expect(page.getByText('乐观').first()).toBeVisible()

  await setExtremeConditions(page)
  await goToStep(page, 6, '结果解释')
  const summary = page.locator('.workspace-main .result-summary')
  await expect(summary.getByText('低于模型分辨率')).toBeVisible()
  await expect(summary.getByText('期望值低于 1 人').first()).toBeVisible()
  await expect(summary.getByText(/现实中不等于绝对不存在/)).toBeVisible()
})

test('11 影响排行和一键放宽：展示前后差异并可撤销', async ({ page }) => {
  await openApp(page)
  await goToStep(page, 3, '核心条件')
  await page.getByRole('button', { name: '本科', exact: true }).click()
  await goToStep(page, 5, '敏感与娱乐')
  await page.getByRole('button', { name: /敏感人口条件与偏好/ }).click()
  await page.getByRole('button', { name: '当前不吸烟', exact: true }).click()
  await goToStep(page, 6, '结果解释')
  const before = await desktopEstimateLabel(page)

  await expect(page.getByRole('heading', { name: '哪些条件最“狠”' })).toBeVisible()
  const relax = page.locator('.relax-list button').first()
  await expect(relax).toContainText('→')
  await relax.click()
  await expect(desktopEstimate(page)).not.toHaveAttribute('aria-label', before)
  await page.getByRole('button', { name: '撤销' }).click()
  await expect(desktopEstimate(page)).toHaveAttribute('aria-label', before)
})

test('12 反向偏好：双向条件命中示意明确不是爱情预测', async ({ page }) => {
  await openApp(page)
  await goToStep(page, 4, '维度库')
  await selectDimension(page, '冲突', '冲突')
  await goToStep(page, 5, '敏感与娱乐')
  await page.getByRole('button', { name: /敏感人口条件与偏好/ }).click()
  await page.getByRole('button', { name: '慢性病信息偏好（软）', exact: true }).click()
  await goToStep(page, 6, '结果解释')

  const reciprocal = page.locator('.reciprocal-card').getByRole('button', { name: /冲突/ })
  const chronicReciprocal = page.locator('.reciprocal-card').getByRole('button', { name: '慢性病信息偏好', exact: true })
  await expect(chronicReciprocal).toBeVisible()
  await reciprocal.click()
  await chronicReciprocal.click()
  await expect(reciprocal).toHaveAttribute('aria-pressed', 'true')
  await expect(chronicReciprocal).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.intersection-score')).toContainText('100')
  await expect(page.locator('.reciprocal-card')).toContainText('不预测真实感情')
})

test('13 分享预览：敏感字段默认关闭，隐藏开关同步白名单并成功下载', async ({ page }) => {
  await openApp(page)
  await goToStep(page, 3, '核心条件')
  await page.getByLabel('最低税前年收入（万元）').fill('50')
  await goToStep(page, 7, '调整与分享')
  await page.getByRole('button', { name: '打开分享预览' }).click()
  const dialog = page.getByRole('dialog', { name: '分享前隐私预览' })

  await expect(dialog).toBeVisible()
  const income = dialog.locator('.share-field').filter({ hasText: '最低年收入' })
  await expect(income.getByRole('checkbox').first()).not.toBeChecked()
  await expect(dialog.getByText(/实际公开 \d+ 项/)).toBeVisible()

  await dialog.getByRole('checkbox', { name: /估算人数与范围/ }).uncheck()
  await dialog.getByRole('checkbox', { name: /^地区/ }).uncheck()
  await expect(dialog.locator('.share-mini-poster strong')).toHaveCount(0)
  await expect(dialog.locator('.share-mini-poster')).not.toContainText('全国')

  await page.evaluate(() => {
    const originalToBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function delayedToBlob(callback, type, quality) {
      window.setTimeout(() => originalToBlob.call(this, callback, type, quality), 250)
    }
  })
  const downloadPromise = page.waitForEvent('download')
  const generateButton = dialog.getByRole('button', { name: '生成并下载图片' })
  await generateButton.click()
  await expect(dialog.getByRole('button', { name: '正在本地生成…' })).toBeDisabled()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('择偶条件分析战报.png')
  await expect(page.getByText('战报已在本地生成并开始下载。')).toBeVisible()
})

test('14 分享失败与恢复：Canvas 失败后显示错误、重试和文字降级', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => undefined },
    })
  })
  await openApp(page)
  await goToStep(page, 7, '调整与分享')
  await page.getByRole('button', { name: '打开分享预览' }).click()
  const dialog = page.getByRole('dialog', { name: '分享前隐私预览' })

  await dialog.getByRole('button', { name: '生成并下载图片' }).click()
  await expect(dialog.getByRole('alert')).toContainText('本次操作未完成')
  await expect(dialog.getByRole('button', { name: '重试生成图片' })).toBeVisible()
  await dialog.getByRole('button', { name: '复制文字版' }).click()
  await expect(page.getByText(/文字版战报已复制/)).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: '可手动复制的文字版' })).toContainText('仅供娱乐参考')
})
