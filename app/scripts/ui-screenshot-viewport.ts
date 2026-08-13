// 视口级截图(不拼接): 验证盖戳与漏斗的真实渲染
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
    educationLevels: ['bachelor'],
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
  await page.waitForTimeout(2500) // 等所有动画完全静止
  await page.screenshot({ path: '_shots/viewport-settled.png' }) // 纯视口, 不滚动不拼接
  await browser.close()
  console.log('viewport shot saved')
}

void run()
