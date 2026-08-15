// 小人 3.0 验收(战报页): 2x 高清截图看精修细节
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
    bodyTypes: ['slim', 'balanced'],
    minAnnualIncomeWan: 15,
    minHouseholdWealthWan: null,
    educationLevels: ['bachelor', 'master', 'doctorate'],
    schoolTier: null,
    housing: { required: false, location: null, minAreaSqm: null, type: null },
    vehicle: { required: false, priceBands: [] },
    smoking: 'non_smoker',
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 2 })
  await page.addInitScript((sel) => {
    (globalThis as unknown as { sessionStorage: { setItem(k: string, v: string): void } })
      .sessionStorage.setItem('heart-probability-lab:safe-draft:v2', JSON.stringify(sel))
  }, SELECTION)
  await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /开筛/ }).click()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /生成战报/ }).click()
  await page.waitForTimeout(1800)

  // 淘汰赛开场: 80 人满编
  const funnel = page.locator('.fun-funnel').first()
  if (await funnel.count()) {
    await funnel.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await funnel.screenshot({ path: '_shots/v3-war-funnel-start.png' })
  }
  // 淘汰中段: 灰化检查
  await page.waitForTimeout(9000)
  if (await funnel.count()) {
    await funnel.screenshot({ path: '_shots/v3-war-funnel-mid.png' })
  }
  // 结束: 幸存者
  await page.waitForTimeout(16000)
  await page.screenshot({ path: '_shots/v3-war-final.png', fullPage: true })

  await browser.close()
  console.log('v3 war shots saved')
}

void run()
