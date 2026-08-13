// 动态编排截图: 先加载只有身高的草稿, 再点击学历 chip 触发关卡动画
import { chromium } from '@playwright/test'

const SELECTION = {
  target: {
    gender: 'female',
    age: { min: 24, max: 32 },
    cities: ['成都'],
    maritalStatuses: [],
    heightCm: { min: 158, max: 172 },
  },
  correlated: {
    bodyTypes: [],
    minAnnualIncomeWan: null,
    minHouseholdWealthWan: null,
    educationLevels: [],
    schoolTier: null,
    housing: { required: false, location: null, minAreaSqm: null, type: null },
    vehicle: { required: false, priceBands: [] },
    smoking: 'any',
    drinking: 'any',
    healthCriteria: [],
    hairCriteria: [],
  },
  softPreferenceIds: [],
  entertainment: { zodiacs: [], mbti: [] },
  selfPreferenceIds: [],
}

const run = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.addInitScript((sel) => {
    (globalThis as unknown as { sessionStorage: { setItem(key: string, value: string): void } })
      .sessionStorage.setItem('heart-probability-lab:safe-draft:v2', JSON.stringify(sel))
  }, SELECTION)
  await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /开筛/ }).click()
  await page.waitForTimeout(600)
  // 跳到硬核条件关
  await page.getByRole('button', { name: /第二关/ }).first().click()
  await page.waitForTimeout(500)
  // 勾上「本科」触发关卡动画
  await page.getByRole('button', { name: '本科', exact: true }).click()
  await page.waitForTimeout(420) // 横幅 + 刀光 + 弹幕中途
  const aside = page.locator('.desktop-result')
  await aside.screenshot({ path: '_shots/action-slash.png' })
  await page.waitForTimeout(1600)
  await aside.screenshot({ path: '_shots/action-settled.png' })
  await browser.close()
  console.log('action shots saved')
}

void run()
