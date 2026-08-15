import { expect, test } from '@playwright/test'
import {
  desktopEstimate,
  desktopEstimateLabel,
  expectNoSeriousAxeViolations,
  goToStep,
  openApp,
  selectDimension,
} from './helpers'

test('01 首次进入：理解本地计算、范围估算与产品边界', async ({ page }) => {
  await openApp(page)

  await expect(page.getByText('匿名 · 本地计算 · 透明模型')).toBeVisible()
  await expect(page.getByText(/不预测真实爱情结果/)).toBeVisible()
  await expect(page.getByRole('button', { name: /开筛/ })).toBeVisible()
  await expectNoSeriousAxeViolations(page)
})

test('02 基础范围：修改性别、年龄、地区与婚史', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: /开筛/ }).click()
  const before = await desktopEstimateLabel(page)

  await page.getByRole('button', { name: '女性' }).click()
  await expect(desktopEstimate(page)).not.toHaveAttribute('aria-label', before)
  await page.getByRole('slider', { name: '最高年龄' }).fill('50')
  await expect(page.getByRole('slider', { name: '最高年龄' })).toHaveValue('50')
  await page.getByRole('button', { name: '北京' }).click()
  await expect(page.getByRole('button', { name: '北京' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '未婚' }).click()
  await expect(page.getByRole('button', { name: '未婚' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '未婚' }).click()
  await expect(page.getByText(/当前为不限婚史/)).toBeVisible()
})

test('03 单一硬条件：添加当前不吸烟后人数合理变化', async ({ page }) => {
  await openApp(page)
  await goToStep(page, 5, '敏感与娱乐')
  const before = await desktopEstimateLabel(page)

  await page.getByRole('button', { name: /敏感人口条件与偏好/ }).click()
  const nonSmoking = page.getByRole('button', { name: '当前不吸烟', exact: true })
  await nonSmoking.click()

  await expect(nonSmoking).toHaveAttribute('aria-pressed', 'true')
  await expect(desktopEstimate(page)).not.toHaveAttribute('aria-label', before)
  await expect(desktopEstimate(page)).not.toHaveAttribute('aria-label', /^0 人$/)
})

test('04 相关硬条件：学历、收入、资产、体型和烟酒按组解释', async ({ page }) => {
  await openApp(page)
  await goToStep(page, 3, '核心条件')

  await page.getByRole('button', { name: '本科', exact: true }).click()
  await page.getByLabel('最低税前年收入（万元）').fill('30')
  await page.getByLabel('最低家庭资产（万元）').fill('300')
  await goToStep(page, 5, '敏感与娱乐')
  await page.getByRole('button', { name: /敏感人口条件与偏好/ }).click()
  await page.getByRole('button', { name: '匀称', exact: true }).click()
  await page.getByRole('button', { name: '当前不吸烟', exact: true }).click()
  await page.getByRole('button', { name: '过去 30 天未饮酒', exact: true }).click()
  await goToStep(page, 6, '结果解释')

  await expect(page.getByText('新模型没有把每个条件都当独立事件')).toBeVisible()
  await expect(page.getByText(/逐岁边际/).first()).toBeVisible()
  await expect(page.getByText(/Fréchet 联合概率界/).first()).toBeVisible()
  await expect(desktopEstimate(page)).not.toHaveAttribute('aria-label', /^0 人$/)
})

test('05 软偏好：进入综合情景, 可靠锚点不动', async ({ page }) => {
  await openApp(page)
  const before = await desktopEstimateLabel(page)
  await goToStep(page, 4, '维度库')

  await selectDimension(page, '做饭', '做饭')
  await page.getByRole('button', { name: '清除搜索' }).click()
  await selectDimension(page, '冲突', '冲突')

  // v4: 主数字是综合估算, 软偏好按先验敏感性情景参与 → 主数字会变
  await expect(desktopEstimate(page)).not.toHaveAttribute('aria-label', before)
  await goToStep(page, 6, '结果解释')
  await expect(page.getByText('含先验敏感性情景')).toBeVisible()
})

test('06 娱乐条件：星座与 MBTI 按最大熵先验计入综合估算', async ({ page }) => {
  await openApp(page)
  const before = await desktopEstimateLabel(page)
  await goToStep(page, 5, '敏感与娱乐')

  await page.getByRole('button', { name: '白羊' }).click()
  await page.getByRole('button', { name: 'E' }).click()

  // v4: 玄学也真实出刀(最大熵先验, 证据等级 D), 主数字会变; 娱乐指数照常出
  await expect(desktopEstimate(page)).not.toHaveAttribute('aria-label', before)
  await goToStep(page, 6, '结果解释')
  const scoreGrid = page.locator('.results-step > .result-summary .score-grid')
  await expect(scoreGrid.getByText('娱乐指数')).toBeVisible()
  await expect(scoreGrid.locator('> div').nth(1).locator('b')).not.toHaveText('0/100')
})

test('07 维度搜索：命中、空结果与清除搜索都有反馈', async ({ page }) => {
  await openApp(page)
  await goToStep(page, 4, '维度库')
  const search = page.getByRole('searchbox', { name: '搜索维度' })

  await search.fill('沟通')
  await expect(page.getByText(/找到 [1-9]\d* 个可选维度/)).toBeVisible()
  await search.fill('完全不存在的维度词')
  await expect(page.getByRole('heading', { name: '这次没搜到' })).toBeVisible()
  await page.getByRole('button', { name: '清除筛选' }).click()
  await expect(search).toHaveValue('')
  await expect(page.getByText(/找到 [1-9]\d* 个可选维度/)).toBeVisible()
})

test('08 已选条件：删除、撤销、重做与确认清空', async ({ page }) => {
  await openApp(page)
  await goToStep(page, 2, '基础范围')
  await page.getByRole('button', { name: '北京' }).click()
  await page.getByRole('button', { name: '移除居住地区' }).click()

  await expect(page.getByRole('button', { name: '撤销' })).toBeEnabled()
  await page.getByRole('button', { name: '撤销' }).click()
  await expect(page.getByText('北京').last()).toBeVisible()
  await page.getByRole('button', { name: '重做' }).click()
  await page.getByRole('button', { name: '清空' }).click()
  await expect(page.getByRole('dialog', { name: '清空当前条件？' })).toBeVisible()
  await page.getByRole('button', { name: '确认清空' }).click()
  await expect(page.getByText('已清空条件和安全会话草稿。')).toBeVisible()
})

test('09 快捷预设：已有条件时必须明确确认覆盖', async ({ page }) => {
  await openApp(page)
  await goToStep(page, 2, '基础范围')
  await page.getByRole('button', { name: '北京' }).click()
  await expect(page.getByRole('button', { name: '北京' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: /稳定生活派/ }).click()
  const dialog = page.getByRole('dialog', { name: '用预设覆盖当前条件？' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '保留当前' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: /稳定生活派/ }).click()
  await dialog.getByRole('button', { name: '应用预设' }).click()
  await expect(page.getByRole('button', { name: '移除吸烟习惯' })).toBeVisible()
  await expect(page.getByText(/已应用“稳定生活派”/)).toBeVisible()
})
